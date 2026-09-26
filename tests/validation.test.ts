import { test } from 'node:test';
import assert from 'node:assert/strict';
import { concernAssessment, harness, testModel } from './helpers.ts';
import type { Assessment } from '../shared/domain.ts';

const invalidOutputs: { name: string; change: (a: Assessment) => void }[] = [
  { name: 'invented quotation', change: a => { a.findings[0].citations[0].quote = 'I definitely promise to pay everything now.'; } },
  { name: 'nonexistent policy', change: a => { a.findings[0].policyIds = ['RBI-FAKE-99']; } },
  { name: 'note contradiction without note evidence', change: a => { a.noteAssessment.citations = a.noteAssessment.citations.filter(c => c.source !== 'note'); } },
  { name: 'destination not in the quoted statement', change: a => { a.paymentMentions[0].destination = 'other@made-up'; } },
  { name: 'payment attributed to the customer', change: a => { a.paymentMentions[0] = { destination: 'official bank link', citation: { source: 'transcript', ref: 'T6', quote: 'Mujhe official bank link chahiye.' } }; } },
];
for (const { name, change } of invalidOutputs) test(`rejects model output with ${name}, leaving no saved report`, async () => {
  const output = structuredClone(concernAssessment); change(output);
  const h = await harness({ model: { ...testModel, review: async () => ({ assessment: output, model: 'invalid-model-test-double' }) } });
  try {
    await h.login('reviewer');
    const response = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    assert.equal(response.status, 502); assert.equal(response.body.code, 'UNGROUNDED_REVIEW');
    const item = await h.request('/cases/CR-1001');
    assert.equal(item.body.analyses.length, 0); assert.equal(item.body.status, 'unreviewed');
  } finally { await h.close(); }
});

test('an incomplete directory produces an unverifiable comparison, not an accusation', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const item = await h.request('/cases/CR-1001');
    item.body.source.directory.complete = false;
    await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source: item.body.source });
    const response = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 2 });
    assert.equal(response.status, 201);
    assert.equal(response.body.analysis.paymentChecks[0].status, 'unverifiable');
  } finally { await h.close(); }
});

test('model failures cannot create a report or change case status', async () => {
  const h = await harness({ model: { ...testModel, review: async () => { throw new Error('network unavailable'); } } });
  try {
    await h.login('reviewer');
    const result = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    assert.equal(result.status, 500);
    const item = await h.request('/cases/CR-1001');
    assert.equal(item.body.analyses.length, 0);
    assert.equal(item.body.status, 'unreviewed');
  } finally { await h.close(); }
});

test('a source edit during inference prevents the outdated model result from being saved', async () => {
  let release!: (value: { assessment: Assessment; model: string }) => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const response = new Promise<{ assessment: Assessment; model: string }>(resolve => { release = resolve; });
  const h = await harness({ model: { ...testModel, review: async () => { started(); return response; } } });
  try {
    await h.login('reviewer');
    const pending = h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    await began;
    const duplicate = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    assert.equal(duplicate.status, 409); assert.equal(duplicate.body.code, 'ANALYSIS_RUNNING');
    const item = await h.request('/cases/CR-1001');
    item.body.source.collectorNote += ' Additional note under review.';
    const edit = await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source: item.body.source });
    assert.equal(edit.status, 200);
    release({ assessment: concernAssessment, model: 'slow-model-test-double' });
    const result = await pending;
    assert.equal(result.status, 409); assert.equal(result.body.code, 'STALE_SOURCE');
    const saved = await h.request('/cases/CR-1001'); assert.equal(saved.body.analyses.length, 0);
  } finally { release?.({ assessment: concernAssessment, model: 'cleanup' }); await h.close(); }
});

test('source edits use optimistic concurrency and reject duplicate transcript IDs', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const item = await h.request('/cases/CR-1001');
    item.body.source.collectorNote += ' Additional synthetic note.';
    const first = await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source: item.body.source });
    assert.equal(first.status, 200);
    const stale = await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source: item.body.source });
    assert.equal(stale.status, 409);
    item.body.source.transcript[1].id = item.body.source.transcript[0].id;
    const invalid = await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 2, source: item.body.source });
    assert.equal(invalid.status, 400);
  } finally { await h.close(); }
});
