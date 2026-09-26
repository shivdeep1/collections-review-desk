import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness, testModel, concernAssessment } from './helpers.ts';

test('every saved source revision remains in the export even if no model review was run', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const initial = await h.request('/cases/CR-1001');
    const originalNote = initial.body.source.collectorNote;
    const source = structuredClone(initial.body.source);
    source.collectorNote = 'First corrected note with no confirmed promise.';
    await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source });
    source.collectorNote = 'Second corrected note with the disputed amount.';
    await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 2, source });
    const exported = await h.request('/cases/CR-1001/export');
    const history = exported.body.case.sourceHistory;
    assert.equal(history?.length, 3);
    assert.equal(history[0].source.collectorNote, originalNote);
    assert.equal(
      history[1].source.collectorNote,
      'First corrected note with no confirmed promise.',
    );
    assert.equal(
      history[2].source.collectorNote,
      'Second corrected note with the disputed amount.',
    );
    assert.equal(exported.body.case.analyses.length, 0);
  } finally {
    await h.close();
  }
});

test('the external model receives the loan context and the saved analysis includes that same snapshot', async () => {
  const h = await harness({
    model: {
      ...testModel,
      review: async (_source, loanContext) => {
        assert.deepEqual(loanContext, {
          loanType: 'Business instalment loan',
          overdueAmount: 18500,
          daysPastDue: 18,
          currency: 'INR',
        });
        return { assessment: concernAssessment, model: 'context-check-test-double' };
      },
    },
  });
  try {
    await h.login('reviewer');
    const response = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    assert.equal(response.status, 201);
    assert.equal(response.body.analysis.loanContext.overdueAmount, 18500);
    assert.equal(response.body.analysis.loanContext.daysPastDue, 18);
  } finally {
    await h.close();
  }
});
