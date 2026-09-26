import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.ts';

test('a reviewer cannot approve a case action through the API', async () => {
  const { app, close } = createApp({ databasePath: ':memory:' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const login = await fetch(`${base}/api/session`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'reviewer' }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const response = await fetch(`${base}/api/cases/CR-1001/decisions`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ proposalId: 'invented', reason: 'Reviewer should not be allowed to approve.', idempotencyKey: 'attempt-1' }),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'SUPERVISOR_REQUIRED');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve())); close();
  }
});
