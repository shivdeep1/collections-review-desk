import { assessmentSchema } from '../shared/domain.ts';
import type { LoanContext, Source } from '../shared/domain.ts';
import { AppError } from './errors.ts';
import { geminiSchema } from './gemini-schema.ts';
import { reviewInstructions } from './model.ts';
import type { ModelAdapter } from './model.ts';

export function createSarvamReviewModel(): ModelAdapter {
  const info = () => ({
    provider: 'Sarvam',
    model: process.env.SARVAM_REVIEW_MODEL || 'sarvam-105b',
    configured: Boolean(process.env.SARVAM_API_KEY?.trim()),
  });
  return {
    info,
    async review(source: Source, loanContext: LoanContext, options) {
      const key = process.env.SARVAM_API_KEY?.trim();
      if (!key)
        throw new AppError(503, 'MODEL_NOT_CONFIGURED', 'Add SARVAM_API_KEY to .env and restart.');
      let response: globalThis.Response;
      try {
        response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
          signal: AbortSignal.timeout(90_000),
          body: JSON.stringify({
            model: info().model,
            messages: [
              { role: 'system', content: reviewInstructions },
              { role: 'user', content: JSON.stringify({ syntheticEvidence: source, loanContext }) },
              ...(options?.feedback
                ? [
                    {
                      role: 'user',
                      content: `A prior draft was rejected by the server: ${options.feedback} Produce a fresh review from the supplied evidence. Copy each citation as an exact contiguous substring. Do not reuse a rejected quotation. Return only the required JSON.`,
                    },
                  ]
                : []),
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'collections_review',
                schema: geminiSchema(assessmentSchema),
                strict: true,
              },
            },
            temperature: 0.1,
            reasoning_effort: null,
            max_tokens: 4000,
          }),
        });
      } catch (error) {
        if (error instanceof Error && /timeout|abort/i.test(error.name))
          throw new AppError(504, 'MODEL_TIMEOUT', 'Sarvam review timed out. No report was saved.');
        throw new AppError(
          502,
          'MODEL_UNREACHABLE',
          'Could not reach Sarvam. No report was saved.',
        );
      }
      if (!response.ok) {
        const detail = (await response.json().catch(() => ({}))) as {
          error?: { message?: string } | string;
          detail?: string;
        };
        const message =
          typeof detail.error === 'string'
            ? detail.error
            : detail.error?.message || detail.detail || '';
        if (response.status === 400)
          console.error(
            'Sarvam request validation:',
            message.replaceAll(key, '[REDACTED]').slice(0, 1200),
          );
        if (response.status === 429)
          throw new AppError(
            429,
            'MODEL_QUOTA',
            'Sarvam rate limit or credits exhausted. No report was saved. Select Gemini backup to retry.',
          );
        if ([401, 403].includes(response.status))
          throw new AppError(
            503,
            'MODEL_ACCESS',
            'Sarvam rejected the key or model access. No report was saved.',
          );
        throw new AppError(
          502,
          'MODEL_ERROR',
          `Sarvam returned HTTP ${response.status}. No report was saved.`,
        );
      }
      const result = (await response.json()) as {
        model?: string;
        choices?: { finish_reason?: string; message?: { content?: string } }[];
      };
      const choice = result.choices?.[0];
      if (choice?.finish_reason !== 'stop')
        throw new AppError(
          502,
          'MODEL_INCOMPLETE',
          'Sarvam did not return a complete review. No report was saved.',
        );
      try {
        return {
          assessment: JSON.parse(choice.message?.content || ''),
          model: `sarvam/${result.model || info().model}`,
        };
      } catch {
        throw new AppError(
          502,
          'MODEL_INVALID_JSON',
          'Sarvam returned unreadable review JSON. No report was saved.',
        );
      }
    },
  };
}
