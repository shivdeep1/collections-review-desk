import { z } from 'zod';

const text = (max = 3000) => z.string().trim().min(1).max(max);
export const actionSchema = z.enum(['escalate', 'request_information', 'dismiss']);
export type Action = z.infer<typeof actionSchema>;
export type Role = 'reviewer' | 'supervisor';
export type Actor = { id: string; name: string; role: Role };
export type LoanContext = {
  loanType: string;
  overdueAmount: number;
  daysPastDue: number;
  currency: 'INR';
};

export const sourceSchema = z
  .object({
    transcript: z
      .array(
        z
          .object({
            id: text(30),
            time: z.string().regex(/^\d{2}:[0-5]\d(?::[0-5]\d)?$/),
            speaker: z.enum(['Collector', 'Customer']),
            text: text(4000),
          })
          .strict(),
      )
      .min(1)
      .max(120),
    collectorNote: text(8000),
    policy: z
      .object({
        version: text(80),
        clauses: z
          .array(z.object({ id: text(30), title: text(120), text: text(3000) }).strict())
          .min(1)
          .max(20),
      })
      .strict(),
    directory: z
      .object({
        version: text(80),
        available: z.boolean(),
        complete: z.boolean(),
        destinations: z.array(text(160)).max(50),
      })
      .strict(),
  })
  .strict()
  .superRefine((source, ctx) => {
    for (const [field, ids] of [
      ['transcript', source.transcript.map((t) => t.id)],
      ['policy', source.policy.clauses.map((p) => p.id)],
    ] as const) {
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: 'custom', path: [field], message: 'IDs must be unique.' });
    }
  });
export type Source = z.infer<typeof sourceSchema>;

export const citationSchema = z
  .object({
    source: z.enum(['transcript', 'note']),
    ref: text(30),
    quote: text(4000),
  })
  .strict();
export type Citation = z.infer<typeof citationSchema>;

export const assessmentSchema = z
  .object({
    summary: text(1800),
    noteAssessment: z
      .object({
        status: z.enum(['supported', 'contradicted', 'insufficient_evidence']),
        explanation: text(1800),
        citations: z.array(citationSchema).min(1).max(8),
      })
      .strict(),
    findings: z
      .array(
        z
          .object({
            title: text(160),
            category: z.enum([
              'note_accuracy',
              'payment_destination',
              'conduct',
              'missing_evidence',
            ]),
            severity: z.enum(['concern', 'needs_review']),
            explanation: text(1800),
            policyIds: z.array(text(30)).min(1).max(6),
            citations: z.array(citationSchema).min(1).max(8),
          })
          .strict(),
      )
      .max(12),
    paymentMentions: z
      .array(z.object({ destination: text(160), citation: citationSchema }).strict())
      .max(10),
    missingEvidence: z.array(text(500)).max(12),
    recommendedAction: actionSchema,
    recommendationReason: text(1500),
  })
  .strict();
export type Assessment = z.infer<typeof assessmentSchema>;
export type Finding = Assessment['findings'][number];
export type PaymentCheck = {
  destination: string;
  citation: Citation;
  status: 'listed' | 'not_listed' | 'unverifiable';
  explanation: string;
};
export type Analysis = {
  id: string;
  version: number;
  sourceRevision: number;
  sourceHash: string;
  createdAt: string;
  actor: Actor;
  model: string;
  latencyMs: number;
  assessment: Assessment;
  paymentChecks: PaymentCheck[];
  source: Source;
  promptVersion: string;
  validatedCitations: number;
  loanContext?: LoanContext;
};
export type SourceRevision = { revision: number; source: Source; at: string; actor: Actor };
export type Proposal = {
  id: string;
  analysisId: string;
  sourceRevision: number;
  action: Action;
  reason: string;
  createdAt: string;
  actor: Actor;
  status: 'pending' | 'superseded' | 'completed';
};
export type Decision = {
  id: string;
  proposalId: string;
  analysisId: string;
  sourceRevision: number;
  action: Action;
  reason: string;
  actor: Actor;
  createdAt: string;
  followUp: { id: string; queue: string; status: 'open' | 'closed'; simulated: true };
};
export type AuditEvent = {
  id: string;
  at: string;
  actor: Actor;
  type: string;
  detail: string;
  sourceRevision: number;
  analysisId?: string;
  proposalId?: string;
  decisionId?: string;
};
export type CaseRecord = {
  id: string;
  customer: string;
  business: string;
  loanId: string;
  loanType: string;
  overdueAmount: number;
  daysPastDue: number;
  language: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  synthetic: true;
  sourceRevision: number;
  source: Source;
  status:
    | 'unreviewed'
    | 'analysed'
    | 'awaiting_approval'
    | 'escalated'
    | 'information_requested'
    | 'closed';
  analyses: Analysis[];
  proposals: Proposal[];
  decisions: Decision[];
  audit: AuditEvent[];
  sourceHistory: SourceRevision[];
};
export type CaseSummary = Omit<
  CaseRecord,
  'source' | 'analyses' | 'proposals' | 'decisions' | 'audit' | 'sourceHistory'
> & {
  findingCount: number | null;
  currentAnalysis: boolean;
  latestAction: Action | null;
};
export type Health = {
  ok: boolean;
  provider: string;
  model: string;
  configured: boolean;
  syntheticOnly: true;
  bankIntegration: 'simulated';
};

export function formatTranscript(source: Source) {
  return source.transcript.map((t) => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n');
}
export function parseTranscript(input: string): Source['transcript'] {
  return input
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const match = line.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*(Collector|Customer):\s*(.+)$/i);
      if (!match)
        throw new Error(
          `Line ${index + 1}: use [00:00] Collector: words or [00:00] Customer: words.`,
        );
      return {
        id: `T${index + 1}`,
        time: match[1],
        speaker: match[2].toLowerCase() === 'collector' ? 'Collector' : 'Customer',
        text: match[3].trim(),
      };
    });
}

export const actionLabels: Record<Action, string> = {
  escalate: 'Escalate for investigation',
  request_information: 'Request more evidence',
  dismiss: 'Close with no further action',
};
export const statusLabels: Record<CaseRecord['status'], string> = {
  unreviewed: 'Ready for review',
  analysed: 'Review ready',
  awaiting_approval: 'Awaiting approval',
  escalated: 'Escalated',
  information_requested: 'Evidence requested',
  closed: 'Closed',
};
