import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './helpers.ts';

test('a live-model result is validated, linked to its source revision and retained on reload', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const result = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    assert.equal(result.status, 201);
    assert.equal(result.body.analysis.sourceRevision, 1);
    assert.equal(result.body.analysis.assessment.noteAssessment.status, 'contradicted');
    assert.equal(result.body.analysis.paymentChecks[0].status, 'not_listed');
    assert.equal(result.body.analysis.validatedCitations, 5);
    const saved = await h.request('/cases/CR-1001');
    assert.equal(saved.body.analyses.length, 1);
    assert.equal(saved.body.analyses[0].id, result.body.analysis.id);
    assert.equal(saved.body.audit.at(-1).type, 'analysis_completed');
  } finally {
    await h.close();
  }
});
