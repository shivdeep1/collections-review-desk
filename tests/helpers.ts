import assert from 'node:assert/strict';
import type { Assessment } from '../shared/domain.ts';
import { createApp } from '../server/app.ts';
import type { ModelAdapter } from '../server/model.ts';

export const concernAssessment: Assessment = {
  summary: 'The note claims a firm commitment, but the customer disputes the amount and explicitly refuses to promise payment.',
  noteAssessment: {
    status: 'contradicted', explanation: 'The note records a confirmed promise despite the explicit refusal.',
    citations: [
      { source: 'note', ref: 'note', quote: 'Customer confirmed a promise to pay INR 18,500' },
      { source: 'transcript', ref: 'T4', quote: 'main payment ka promise nahi kar sakta.' },
    ],
  },
  findings: [{
    title: 'Promise to pay is not supported', category: 'note_accuracy', severity: 'concern',
    explanation: 'The customer has not committed to payment.', policyIds: ['P1'],
    citations: [{ source: 'transcript', ref: 'T4', quote: 'main payment ka promise nahi kar sakta.' }, { source: 'note', ref: 'note', quote: 'No dispute raised.' }],
  }],
  paymentMentions: [{ destination: 'amit.collect@personal-pay', citation: { source: 'transcript', ref: 'T5', quote: '5,000 amit.collect@personal-pay par transfer kar dijiye' } }],
  missingEvidence: [], recommendedAction: 'escalate', recommendationReason: 'A supervisor should investigate the documented discrepancies.',
};
export const testModel: ModelAdapter = {
  info: () => ({ provider: 'test', model: 'external-model-test-double', configured: true }),
  review: async () => ({ assessment: structuredClone(concernAssessment), model: 'external-model-test-double' }),
};

export async function harness(options: { model?: ModelAdapter; databasePath?: string } = {}) {
  const { app, close } = createApp({ databasePath: options.databasePath ?? ':memory:', model: options.model ?? testModel });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  async function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  async function login(role: 'reviewer' | 'supervisor') {
    const result = await request('/session', 'POST', { role });
    assert.equal(result.status, 200); cookie = result.headers.get('set-cookie')!.split(';')[0];
  }
  return { request, login, close: async () => { await new Promise<void>(resolve => server.close(() => resolve())); close(); } };
}
