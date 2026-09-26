import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './helpers.ts';

test('case data requires a session and cross-origin writes are rejected', async () => {
  const h = await harness();
  try {
    const anonymous = await h.request('/cases');
    assert.equal(anonymous.status, 401);
    const crossOrigin = await h.request('/session', 'POST', { role: 'supervisor' }, { origin: 'https://other-site.example' });
    assert.equal(crossOrigin.status, 403); assert.equal(crossOrigin.body.code, 'ORIGIN_REJECTED');
    await h.login('reviewer');
    const actorSpoof = await h.request('/cases/CR-1001/decisions', 'POST', { role: 'supervisor', actor: { role: 'supervisor' }, proposalId: 'fake', reason: 'Trying to change actor permissions.', idempotencyKey: 'spoof-001' });
    assert.equal(actorSpoof.status, 403); assert.equal(actorSpoof.body.code, 'SUPERVISOR_REQUIRED');
  } finally { await h.close(); }
});

test('a replacement proposal prevents the old proposed action from being approved', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const review = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    const payload = { analysisId: review.body.analysis.id, sourceRevision: 1, action: 'escalate', reason: 'Initial proposal to investigate the discrepancy.' };
    const old = await h.request('/cases/CR-1001/proposals', 'POST', payload);
    const replacement = await h.request('/cases/CR-1001/proposals', 'POST', { ...payload, action: 'request_information', reason: 'Obtain the complete directory before deciding further.' });
    assert.equal(replacement.status, 201);
    await h.login('supervisor');
    const stale = await h.request('/cases/CR-1001/decisions', 'POST', { proposalId: old.body.proposal.id, reason: 'This should not execute the replaced proposal.', idempotencyKey: 'old-proposal-001' });
    assert.equal(stale.status, 409);
    const approved = await h.request('/cases/CR-1001/decisions', 'POST', { proposalId: replacement.body.proposal.id, reason: 'Request the missing directory and supporting records.', idempotencyKey: 'new-proposal-001' });
    assert.equal(approved.status, 201);
    assert.equal(approved.body.decision.action, 'request_information');
    const changedRetry = await h.request('/cases/CR-1001/decisions', 'POST', { proposalId: replacement.body.proposal.id, reason: 'A different reason must not overwrite the saved record.', idempotencyKey: 'new-proposal-001' });
    assert.equal(changedRetry.status, 409); assert.equal(changedRetry.body.code, 'IDEMPOTENCY_CONFLICT');
  } finally { await h.close(); }
});

test('a new analysis invalidates approval of the previous analysis even with unchanged evidence', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const first = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    const proposal = await h.request('/cases/CR-1001/proposals', 'POST', { analysisId: first.body.analysis.id, sourceRevision: 1, action: 'escalate', reason: 'Investigate this first report.' });
    const second = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    assert.equal(second.body.analysis.version, 2);
    await h.login('supervisor');
    const result = await h.request('/cases/CR-1001/decisions', 'POST', { proposalId: proposal.body.proposal.id, reason: 'Attempted approval against the superseded report.', idempotencyKey: 'old-analysis-001' });
    assert.equal(result.status, 409); assert.equal(result.body.code, 'STALE_PROPOSAL');
  } finally { await h.close(); }
});

test('requests with an external Host header cannot access the local demo service', async () => {
  const h = await harness();
  try {
    const result = await h.request('/health', 'GET', undefined, { host: 'untrusted-site.example' });
    assert.equal(result.status, 403); assert.equal(result.body.code, 'HOST_REJECTED');
  } finally { await h.close(); }
});
