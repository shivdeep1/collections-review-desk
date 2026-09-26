import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './helpers.ts';
import { seedCases } from '../server/fixtures.ts';

test('a custom synthetic case is created and exported with its original evidence', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const source = seedCases()[1].source;
    const input = {
      customer: 'Synthetic Test Customer',
      business: 'Synthetic Test Shop',
      overdueAmount: 9200,
      daysPastDue: 8,
      language: 'English',
      source,
      synthetic: true,
    };
    const created = await h.request('/cases', 'POST', input);
    assert.equal(created.status, 201);
    assert.equal(created.body.sourceHistory.length, 1);
    const exported = await h.request(`/cases/${created.body.id}/export`);
    assert.equal(exported.status, 200);
    assert.equal(exported.body.case.source.collectorNote, source.collectorNote);
    assert.equal(exported.body.case.audit[0].type, 'case_created');
    const invalid = await h.request('/cases', 'POST', { ...input, synthetic: false });
    assert.equal(invalid.status, 400);
  } finally {
    await h.close();
  }
});

test('a timestamp with impossible seconds is rejected before it can be cited', async () => {
  const h = await harness();
  try {
    await h.login('reviewer');
    const source = seedCases()[0].source;
    source.transcript[0].time = '00:99';
    const result = await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source });
    assert.equal(result.status, 400);
  } finally {
    await h.close();
  }
});
