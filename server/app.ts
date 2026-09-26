import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type {
  Actor,
  CaseRecord,
  Analysis,
  CaseSummary,
  AuditEvent,
  Proposal,
  Decision,
  Action,
  LoanContext,
} from '../shared/domain.ts';
import { actionSchema, sourceSchema } from '../shared/domain.ts';
import { Store } from './store.ts';
import { AppError } from './errors.ts';
import { PROMPT_VERSION } from './model.ts';
import type { ModelAdapter } from './model.ts';
import { reviewProviders } from './review-provider.ts';
import { validateAssessment } from './evidence.ts';
import { audioRouter, validateAudioLink } from './audio.ts';
import type { Transcriber } from './transcription.ts';

const personas: Record<string, Actor> = {
  reviewer: { id: 'demo-reviewer', name: 'Ananya Rao', role: 'reviewer' },
  supervisor: { id: 'demo-supervisor', name: 'Vikram Sethi', role: 'supervisor' },
};
const outcomes: Record<
  Action,
  { queue: string; followUpStatus: 'open' | 'closed'; caseStatus: CaseRecord['status'] }
> = {
  escalate: { queue: 'Collections investigation', followUpStatus: 'open', caseStatus: 'escalated' },
  request_information: {
    queue: 'Evidence follow-up',
    followUpStatus: 'open',
    caseStatus: 'information_requested',
  },
  dismiss: { queue: 'Completed reviews', followUpStatus: 'closed', caseStatus: 'closed' },
};
function supersedePendingProposals(item: CaseRecord) {
  item.proposals.forEach((proposal) => {
    if (proposal.status === 'pending') proposal.status = 'superseded';
  });
}
export function createApp(options: {
  databasePath: string;
  model?: ModelAdapter;
  transcribe?: Transcriber;
}) {
  const store = new Store(options.databasePath);
  const app = express();
  const providers = reviewProviders();
  const model = options.model ?? providers.model;
  const analysing = new Set<string>();
  function event(
    item: CaseRecord,
    who: Actor,
    type: string,
    detail: string,
    refs: Partial<AuditEvent> = {},
  ) {
    const at = new Date().toISOString();
    item.updatedAt = at;
    item.audit.push({
      id: randomUUID(),
      at,
      actor: who,
      type,
      detail,
      sourceRevision: item.sourceRevision,
      ...refs,
    });
  }
  const sessions = new Map<string, { actor: Actor; expires: number }>();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(req.headers.host || '')) {
      return next(
        new AppError(
          403,
          'HOST_REJECTED',
          'This demonstration service accepts local hostnames only.',
        ),
      );
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if (
        (origin && origin !== `http://${req.headers.host}`) ||
        req.headers['sec-fetch-site'] === 'cross-site'
      ) {
        return next(
          new AppError(
            403,
            'ORIGIN_REJECTED',
            'Use the application from its local browser address.',
          ),
        );
      }
      if (!req.is('application/json'))
        return next(new AppError(415, 'JSON_REQUIRED', 'Send an application/json request.'));
    }
    next();
  });
  app.use('/api/cases/:id/recordings', express.json({ limit: '9mb' }));
  app.use(express.json({ limit: '200kb' }));
  function actor(req: Request): Actor {
    const token = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('crd_session='))
      ?.slice(12);
    const session = token ? sessions.get(token) : undefined;
    if (!session || session.expires < Date.now())
      throw new AppError(401, 'SESSION_REQUIRED', 'Select a demo persona to continue.');
    return session.actor;
  }
  app.post('/api/session', (req, res) => {
    const { role } = z
      .object({ role: z.enum(['reviewer', 'supervisor']) })
      .strict()
      .parse(req.body);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { actor: personas[role], expires: Date.now() + 8 * 60 * 60 * 1000 });
    res.cookie('crd_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({ actor: personas[role], demo: true });
  });
  app.use('/api', audioRouter(store, actor, event, options.transcribe));
  app.get('/api/session', (req, res) => res.json({ actor: actor(req), demo: true }));
  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      ...model.info(),
      reviewProviders: providers.availability,
      syntheticOnly: true,
      bankIntegration: 'simulated',
    }),
  );
  app.get('/api/cases', (req, res) => {
    actor(req);
    res.json(
      store.list().map((item) => {
        const {
          source: _source,
          sourceHistory: _history,
          analyses,
          proposals: _proposals,
          decisions,
          audit: _audit,
          ...summary
        } = item;
        const latest = analyses.at(-1);
        return {
          ...summary,
          findingCount:
            latest?.sourceRevision === item.sourceRevision
              ? latest.assessment.findings.length
              : null,
          currentAnalysis: latest?.sourceRevision === item.sourceRevision,
          audioDerived: Boolean(item.source.audio),
          latestAction: decisions.at(-1)?.action ?? null,
        } satisfies CaseSummary;
      }),
    );
  });
  app.get('/api/cases/:id', (req, res) => {
    actor(req);
    res.json(store.get(req.params.id));
  });
  app.post('/api/cases', (req, res) => {
    const who = actor(req);
    const body = z
      .object({
        customer: z.string().trim().min(1).max(100),
        business: z.string().trim().min(1).max(100),
        overdueAmount: z.number().min(0).max(100000000),
        daysPastDue: z.number().int().min(0).max(3650),
        language: z.string().trim().min(1).max(50),
        source: sourceSchema,
        synthetic: z.literal(true),
      })
      .strict()
      .parse(req.body);
    if (body.source.audio)
      throw new AppError(
        400,
        'INVALID_AUDIO_LINK',
        'Create the case first, then attach its own recording.',
      );
    const now = new Date().toISOString();
    const item: CaseRecord = {
      ...body,
      id: `CR-${randomUUID().slice(0, 8).toUpperCase()}`,
      loanId: `DEMO-LN-${randomUUID().slice(0, 6).toUpperCase()}`,
      loanType: 'Business instalment loan',
      owner: who.name,
      createdAt: now,
      updatedAt: now,
      sourceRevision: 1,
      status: 'unreviewed',
      analyses: [],
      proposals: [],
      decisions: [],
      audit: [],
      sourceHistory: [{ revision: 1, source: structuredClone(body.source), at: now, actor: who }],
    };
    event(
      item,
      who,
      'case_created',
      'New synthetic case created with supplied transcript and policy.',
    );
    store.save(item);
    res.status(201).json(item);
  });
  app.put('/api/cases/:id/source', (req, res) => {
    const who = actor(req);
    const { expectedRevision, source } = z
      .object({ expectedRevision: z.number().int().positive(), source: sourceSchema })
      .strict()
      .parse(req.body);
    const updated = store.transaction(() => {
      const item = store.get(req.params.id);
      if (item.sourceRevision !== expectedRevision)
        throw new AppError(
          409,
          'STALE_SOURCE',
          'Another edit changed this case. Reload before saving.',
        );
      validateAudioLink(store, item.id, source);
      if (JSON.stringify(item.source) === JSON.stringify(source)) return item;
      item.source = source;
      item.sourceRevision++;
      item.status = 'unreviewed';
      item.sourceHistory.push({
        revision: item.sourceRevision,
        source: structuredClone(source),
        at: new Date().toISOString(),
        actor: who,
      });
      supersedePendingProposals(item);
      event(
        item,
        who,
        'source_updated',
        `Evidence revision ${item.sourceRevision} saved. Pending proposals require a new review.`,
      );
      store.save(item);
      return item;
    });
    res.json(updated);
  });
  app.get('/api/cases/:id/export', (req, res) => {
    actor(req);
    const item = store.get(req.params.id);
    res.setHeader('Content-Disposition', `attachment; filename="${item.id}-review.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      purpose: 'Synthetic demonstration only. Bank systems are simulated.',
      case: item,
      recordings: store.recordings(item.id),
      transcriptions: store.transcriptions(item.id),
    });
  });
  app.post('/api/cases/:id/analyses', async (req, res) => {
    const who = actor(req);
    const { sourceRevision, provider } = z
      .object({
        sourceRevision: z.number().int().positive(),
        provider: z.enum(['sarvam', 'gemini']).optional(),
      })
      .strict()
      .parse(req.body);
    const item = store.get(req.params.id);
    if (item.sourceRevision !== sourceRevision)
      throw new AppError(
        409,
        'STALE_SOURCE',
        'The evidence changed. Reload the case before reviewing it.',
      );
    if (analysing.has(item.id))
      throw new AppError(409, 'ANALYSIS_RUNNING', 'A review is already running for this case.');
    analysing.add(item.id);
    const source = structuredClone(item.source);
    const loanContext: LoanContext = {
      loanType: item.loanType,
      overdueAmount: item.overdueAmount,
      daysPastDue: item.daysPastDue,
      currency: 'INR',
    };
    const started = Date.now();
    try {
      const selectedProvider = provider || providers.availability.defaultProvider;
      let feedback = '';
      let result!: Awaited<ReturnType<ModelAdapter['review']>>;
      let validated!: ReturnType<typeof validateAssessment>;
      for (
        let attempt = 0;
        attempt < (!options.model && selectedProvider === 'sarvam' ? 2 : 1);
        attempt++
      ) {
        try {
          result = await model.review(source, loanContext, { provider, feedback });
          validated = validateAssessment(result.assessment, source);
          break;
        } catch (error) {
          if (
            attempt === 0 &&
            !options.model &&
            selectedProvider === 'sarvam' &&
            error instanceof AppError &&
            ['UNGROUNDED_REVIEW', 'MODEL_INCOMPLETE'].includes(error.code)
          ) {
            feedback = error.message;
            continue;
          }
          throw error;
        }
      }
      const saved = store.transaction(() => {
        const current = store.get(item.id);
        if (current.sourceRevision !== sourceRevision)
          throw new AppError(
            409,
            'STALE_SOURCE',
            'The evidence changed while the model was reviewing it. Rerun against the new revision.',
          );
        const analysis: Analysis = {
          id: randomUUID(),
          version: current.analyses.length + 1,
          sourceRevision,
          sourceHash: createHash('sha256')
            .update(JSON.stringify({ source, loanContext }))
            .digest('hex'),
          source,
          loanContext,
          createdAt: new Date().toISOString(),
          actor: who,
          model: result.model,
          latencyMs: Date.now() - started,
          promptVersion: PROMPT_VERSION,
          ...validated,
        };
        current.analyses.push(analysis);
        supersedePendingProposals(current);
        current.status = 'analysed';
        event(
          current,
          who,
          'analysis_completed',
          `Review v${analysis.version} completed. ${analysis.validatedCitations} source references validated.`,
          { analysisId: analysis.id },
        );
        store.save(current);
        return analysis;
      });
      res.status(201).json({ analysis: saved });
    } finally {
      analysing.delete(item.id);
    }
  });
  app.post('/api/cases/:id/proposals', (req, res) => {
    const who = actor(req);
    const body = z
      .object({
        analysisId: z.string().uuid(),
        sourceRevision: z.number().int().positive(),
        action: actionSchema,
        reason: z.string().trim().min(10).max(2000),
      })
      .strict()
      .parse(req.body);
    const proposal = store.transaction(() => {
      const item = store.get(req.params.id);
      const latest = item.analyses.at(-1);
      if (
        !latest ||
        latest.id !== body.analysisId ||
        latest.sourceRevision !== item.sourceRevision ||
        body.sourceRevision !== item.sourceRevision
      ) {
        throw new AppError(
          409,
          'STALE_REVIEW',
          'The review no longer matches the current evidence. Run or select the latest review.',
        );
      }
      if (item.decisions.some((d) => d.analysisId === latest.id))
        throw new AppError(
          409,
          'REVIEW_DECIDED',
          'This review already has a completed decision. Run a new review before proposing another action.',
        );
      supersedePendingProposals(item);
      const proposal: Proposal = {
        ...body,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        actor: who,
        status: 'pending',
      };
      item.proposals.push(proposal);
      item.status = 'awaiting_approval';
      event(
        item,
        who,
        'proposal_created',
        `Proposed ${body.action.replaceAll('_', ' ')} for supervisor approval.`,
        { proposalId: proposal.id, analysisId: latest.id },
      );
      store.save(item);
      return proposal;
    });
    res.status(201).json({ proposal });
  });
  app.post('/api/cases/:id/decisions', (req, res) => {
    const who = actor(req);
    if (who.role !== 'supervisor')
      throw new AppError(
        403,
        'SUPERVISOR_REQUIRED',
        'Only the supervisor persona can approve a proposed action.',
      );
    const body = z
      .object({
        proposalId: z.string().uuid(),
        reason: z.string().trim().min(10).max(2000),
        idempotencyKey: z.string().min(8).max(100),
      })
      .strict()
      .parse(req.body);
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          caseId: req.params.id,
          actor: who.id,
          proposalId: body.proposalId,
          reason: body.reason,
        }),
      )
      .digest('hex');
    let repeated = false;
    const decision = store.transaction(() => {
      const existing = store.getIdempotent(body.idempotencyKey, fingerprint) as
        Decision | undefined;
      if (existing) {
        repeated = true;
        return existing;
      }
      const item = store.get(req.params.id);
      const proposal = item.proposals.find((p) => p.id === body.proposalId);
      if (!proposal)
        throw new AppError(404, 'PROPOSAL_NOT_FOUND', 'No matching proposal was found.');
      const previous = item.decisions.find((d) => d.proposalId === proposal.id);
      if (previous) {
        if (previous.reason !== body.reason)
          throw new AppError(
            409,
            'DECISION_IMMUTABLE',
            'This proposal was already approved. Its saved decision cannot be overwritten.',
          );
        repeated = true;
        store.saveIdempotent(body.idempotencyKey, fingerprint, previous);
        return previous;
      }
      const latest = item.analyses.at(-1);
      if (
        proposal.status !== 'pending' ||
        !latest ||
        proposal.analysisId !== latest.id ||
        proposal.sourceRevision !== item.sourceRevision ||
        latest.sourceRevision !== item.sourceRevision
      ) {
        throw new AppError(
          409,
          'STALE_PROPOSAL',
          'The evidence, report or proposed action changed. Inspect the latest review and submit a new proposal.',
        );
      }
      const outcome = outcomes[proposal.action];
      const decision: Decision = {
        id: randomUUID(),
        proposalId: proposal.id,
        analysisId: latest.id,
        sourceRevision: item.sourceRevision,
        action: proposal.action,
        reason: body.reason,
        actor: who,
        createdAt: new Date().toISOString(),
        followUp: {
          id: `FU-${randomUUID().slice(0, 8).toUpperCase()}`,
          simulated: true,
          queue: outcome.queue,
          status: outcome.followUpStatus,
        },
      };
      proposal.status = 'completed';
      item.decisions.push(decision);
      item.status = outcome.caseStatus;
      event(
        item,
        who,
        'decision_completed',
        `Supervisor approved ${proposal.action.replaceAll('_', ' ')}. Local record ${decision.followUp.id} saved to ${decision.followUp.queue}.`,
        { decisionId: decision.id, proposalId: proposal.id, analysisId: latest.id },
      );
      store.save(item);
      store.saveIdempotent(body.idempotencyKey, fingerprint, decision);
      return decision;
    });
    res.status(repeated ? 200 : 201).json({ decision });
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large')
      return res.status(413).json({
        code: 'UPLOAD_TOO_LARGE',
        message: 'The upload exceeds the size limit. Use a WAV or MP3 recording up to 6 MB.',
      });
    if (error instanceof z.ZodError)
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    if (error instanceof AppError)
      return res.status(error.status).json({ code: error.code, message: error.message });
    if (error instanceof SyntaxError)
      return res
        .status(400)
        .json({ code: 'INVALID_JSON', message: 'The request body is not valid JSON.' });
    console.error('Request failed:', error instanceof Error ? error.name : 'unknown');
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'The request could not be completed. No action was confirmed. Please try again.',
    });
  });
  return { app, close: () => store.close() };
}
