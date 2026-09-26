import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSarvamTranscriber } from '../server/sarvam.ts';
import { harness } from './helpers.ts';

const wave = Buffer.alloc(100);
wave.write('RIFF');
wave.write('WAVE', 8);
const upload = {
  fileName: 'synthetic.wav',
  mimeType: 'audio/wav',
  synthetic: true,
  base64: wave.toString('base64'),
};

function fakeSarvam(failure?: 'storage' | 'job') {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const json = (value: unknown) =>
      new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/job/v1')) return json({ job_id: 'test-job' });
    if (url.endsWith('/upload-files'))
      return json({
        upload_urls: {
          'recording.wav': {
            file_url:
              failure === 'storage'
                ? 'http://127.0.0.1/private'
                : 'https://test.blob.core.windows.net/input.wav?signature=test',
          },
        },
      });
    if (init.method === 'PUT') return new Response(null, { status: 201 });
    if (url.endsWith('/start')) return json({ job_state: 'Running' });
    if (url.endsWith('/status'))
      return json(
        failure === 'job'
          ? { job_state: 'Failed' }
          : {
              job_state: 'Completed',
              job_details: [{ state: 'Success', outputs: [{ file_name: '0.json' }] }],
            },
      );
    if (url.endsWith('/download-files'))
      return json({
        download_urls: {
          '0.json': { file_url: 'https://test.blob.core.windows.net/output.json?signature=test' },
        },
      });
    if (url.includes('/output.json'))
      return json({
        language_code: 'hi-IN',
        diarized_transcript: {
          entries: [
            { transcript: 'मैं promise नहीं कर सकता', start_time_seconds: 17.9, speaker_id: '7' },
            { transcript: 'ठीक है', start_time_seconds: 21.1, speaker_id: '3' },
          ],
        },
      });
    throw new Error('Unexpected test request');
  };
  return {
    calls,
    transcribe: createSarvamTranscriber({ fetcher, key: () => 'test-secret', pollMs: 0 }),
  };
}

test('Sarvam batch audio persists native text, timestamps and unmapped speaker IDs through the public API', async () => {
  const provider = fakeSarvam();
  const h = await harness({ transcribe: provider.transcribe });
  try {
    await h.login('reviewer');
    const recording = (await h.request('/cases/CR-1001/recordings', 'POST', upload)).body;
    const path = `/cases/CR-1001/recordings/${recording.id}/transcriptions`;
    assert.equal(
      (await h.request(path, 'POST', { provider: 'sarvam', languageCode: 'invented' })).status,
      400,
    );
    assert.equal(provider.calls.length, 0);
    const result = await h.request(path, 'POST', { provider: 'sarvam', languageCode: 'hi-IN' });
    assert.equal(result.status, 201);
    assert.deepEqual(result.body.turns[0], {
      time: '00:17',
      speaker: 'Unknown',
      speakerId: '7',
      text: 'मैं promise नहीं कर सकता',
    });
    const parameters = JSON.parse(String(provider.calls[0].init.body)).job_parameters;
    assert.equal(parameters.language_code, 'hi-IN');
    assert.equal(parameters.mode, 'verbatim');
    for (const call of provider.calls.filter((c) => c.url.includes('.blob.'))) {
      assert.equal(
        new Headers(call.init.headers).has('api-subscription-key'),
        false,
        'API key must never be forwarded to storage',
      );
      assert.equal(call.init.redirect, 'error');
    }
    const item = (await h.request('/cases/CR-1001')).body;
    assert.equal(item.sourceRevision, 1);
    assert.equal(item.source.audio, undefined);
    const exported = (await h.request('/cases/CR-1001/export')).body;
    assert.equal(exported.transcriptions[0].turns[0].speakerId, '7');
  } finally {
    await h.close();
  }
});

for (const failure of ['storage', 'job'] as const)
  test(`Sarvam ${failure} failure leaves evidence unchanged without fallback`, async () => {
    const provider = fakeSarvam(failure);
    const h = await harness({ transcribe: provider.transcribe });
    try {
      await h.login('reviewer');
      const recording = (await h.request('/cases/CR-1001/recordings', 'POST', upload)).body;
      const result = await h.request(
        `/cases/CR-1001/recordings/${recording.id}/transcriptions`,
        'POST',
        { provider: 'sarvam' },
      );
      assert.equal(result.status, 502);
      assert.equal((await h.request('/cases/CR-1001')).body.sourceRevision, 1);
      assert.equal((await h.request('/cases/CR-1001/recordings')).body.transcriptions.length, 0);
      assert.equal(
        provider.calls.some((c) => c.url.startsWith('http://127.0.0.1')),
        false,
      );
    } finally {
      await h.close();
    }
  });
