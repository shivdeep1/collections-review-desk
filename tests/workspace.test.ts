import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { harness } from './helpers.ts';

test('editing an approved case opens current inputs instead of displaying the old approval as current', async () => {
  const h = await harness();
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    await h.login('reviewer');
    const review = await h.request('/cases/CR-1001/analyses', 'POST', { sourceRevision: 1 });
    const proposal = await h.request('/cases/CR-1001/proposals', 'POST', {
      analysisId: review.body.analysis.id,
      sourceRevision: 1,
      action: 'escalate',
      reason: 'Investigate the discrepancy using the cited statements.',
    });
    await h.login('supervisor');
    assert.equal(
      (
        await h.request('/cases/CR-1001/decisions', 'POST', {
          proposalId: proposal.body.proposal.id,
          reason: 'I checked the evidence and approve investigation.',
          idempotencyKey: 'workspace-before-edit',
        })
      ).status,
      201,
    );
    const original = (await h.request('/cases/CR-1001')).body;
    const { Workspace } = await vite.ssrLoadModule('/src/Workspace.tsx');
    const render = (item: typeof original) =>
      renderToStaticMarkup(
        createElement(Workspace, {
          item,
          actor: { id: 'demo-reviewer', name: 'Ananya Rao', role: 'reviewer' },
          health: { configured: true },
          onBack: () => {},
          onRefresh: async () => {},
          onSwitchRole: async () => {},
        }),
      );
    assert.match(render(original), /LOCAL FOLLOW-UP RECORD/);
    const source = structuredClone(original.source);
    source.collectorNote =
      'Corrected note: the customer disputed the amount and refused to promise payment.';
    const edited = await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source });
    assert.equal(edited.status, 200);
    const html = render(edited.body);
    assert.match(html, /Corrected note: the customer disputed/);
    assert.doesNotMatch(html, /LOCAL FOLLOW-UP RECORD/);
    assert.match(html, /Current inputs/);
    assert.equal(edited.body.decisions.length, 1, 'the historical approval must be retained');
  } finally {
    await vite.close();
    await h.close();
  }
});
