import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { harness } from './helpers.ts';

test('a supervisor approval creates one persistent follow-up, even when retried with another request key', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'crd-test-'));
  const databasePath = join(directory, 'test.sqlite');
  let h = await harness({ databasePath });
  try {
    await h.login('reviewer');
    const review = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    const proposal = await h.request('/cases/CR-1001/proposals', 'POST', {
      analysisId: review.body.analysis.id, sourceRevision: 1, action: 'escalate', reason: 'Please investigate the evidence-backed note discrepancy.',
    });
    assert.equal(proposal.status, 201);
    await h.login('supervisor');
    const request = { proposalId: proposal.body.proposal.id, reason: 'I checked the refusal and the collector note. Escalate for investigation.', idempotencyKey: 'approval-001' };
    const decision = await h.request('/cases/CR-1001/decisions', 'POST', request);
    assert.equal(decision.status, 201);
    const retry = await h.request('/cases/CR-1001/decisions', 'POST', request);
    assert.equal(retry.status, 200);
    assert.equal(retry.body.decision.id, decision.body.decision.id);
    const secondKey = await h.request('/cases/CR-1001/decisions', 'POST', { ...request, idempotencyKey: 'approval-002' });
    assert.equal(secondKey.body.decision.id, decision.body.decision.id);
    await h.close();
    h = await harness({ databasePath });
    await h.login('supervisor');
    const restored = await h.request('/cases/CR-1001');
    assert.equal(restored.body.status, 'escalated');
    assert.equal(restored.body.decisions.length, 1);
    assert.equal(restored.body.decisions[0].followUp.queue, 'Collections investigation');
    assert.equal(restored.body.audit.filter((e: { type: string }) => e.type === 'decision_completed').length, 1);
  } finally { await h.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('editing a policy invalidates a pending approval while retaining the original review evidence', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const review = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    const proposal = await h.request('/cases/CR-1001/proposals', 'POST', { analysisId: review.body.analysis.id, sourceRevision: 1, action: 'escalate', reason: 'Please review the contradictory promise.' });
    const original = await h.request('/cases/CR-1001');
    const source = structuredClone(original.body.source);
    source.policy.version = 'DEMO-COL-2.0';
    source.policy.clauses[0].text = 'Record customer commitments verbatim and refer ambiguous commitments to a supervisor.';
    const edit = await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source });
    assert.equal(edit.status, 200);
    await h.login('supervisor');
    const decision = await h.request('/cases/CR-1001/decisions', 'POST', { proposalId: proposal.body.proposal.id, reason: 'Attempted approval of the old report.', idempotencyKey: 'stale-approval-001' });
    assert.equal(decision.status, 409);
    assert.equal(decision.body.code, 'STALE_PROPOSAL');
    const saved = await h.request('/cases/CR-1001');
    assert.equal(saved.body.sourceRevision, 2);
    assert.equal(saved.body.analyses[0].source.policy.version, 'DEMO-COL-1.0');
    assert.equal(saved.body.decisions.length, 0);
    assert.equal(saved.body.proposals[0].status, 'superseded');
  } finally { await h.close(); }
});
