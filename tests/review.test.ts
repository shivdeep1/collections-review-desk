import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './helpers.ts';
import { concernAssessment } from './helpers.ts';
import type { ModelAdapter } from '../server/model.ts';

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

test('review provider is explicitly passed to the model and recorded with its result', async () => {
  const calls: string[] = [];
  const model: ModelAdapter = {
    info: () => ({ provider: 'Sarvam', model: 'sarvam-105b', configured: true }),
    review: async (_source, _context, options) => {
      calls.push(options?.provider || 'default');
      return {
        assessment: structuredClone(concernAssessment),
        model: `selected/${options?.provider}`,
      };
    },
  };
  const h = await harness({ model });
  try {
    await h.login('reviewer');
    const result = await h.request('/cases/CR-1001/analyses', 'POST', {
      sourceRevision: 1,
      provider: 'sarvam',
    });
    assert.equal(result.status, 201);
    assert.deepEqual(calls, ['sarvam']);
    assert.equal(result.body.analysis.model, 'selected/sarvam');
  } finally {
    await h.close();
  }
});
