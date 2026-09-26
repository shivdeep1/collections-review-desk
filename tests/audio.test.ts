import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { harness } from './helpers.ts';
import { AppError } from '../server/errors.ts';

const wave = Buffer.alloc(100);
wave.write('RIFF', 0);
wave.write('WAVE', 8);
const upload = {
  fileName: 'synthetic.wav',
  mimeType: 'audio/wav',
  synthetic: true,
  base64: wave.toString('base64'),
};
const transcript = {
  turns: [
    { time: '00:00', speaker: 'Collector', text: 'Hello from Demo Bank.' },
    { time: '00:02', speaker: 'Unknown', text: '[inaudible]' },
  ],
  warnings: ['Second speaker unclear.'],
};
const transcribe = async () => ({ output: transcript, model: 'test-audio-model' });

test('audio upload and drafts persist, support seeking and require explicit adoption as a new revision', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'crd-audio-'));
  const databasePath = join(dir, 'case.sqlite');
  let h = await harness({ databasePath, transcribe });
  try {
    assert.equal((await h.request('/cases/CR-1001/recordings', 'POST', upload)).status, 401);
    await h.login('reviewer');
    const recording = await h.request('/cases/CR-1001/recordings', 'POST', upload);
    assert.equal(recording.status, 201);
    const path = `/cases/CR-1001/recordings/${recording.body.id}`;
    const draft = await h.request(`${path}/transcriptions`, 'POST', {});
    assert.equal(draft.status, 201);
    const current = (await h.request('/cases/CR-1001')).body;
    assert.equal(current.sourceRevision, 1);
    assert.equal(current.source.audio, undefined, 'draft must not overwrite evidence');
    assert.equal(current.analyses.length, 0);
    const source = {
      ...current.source,
      transcript: draft.body.turns.map((turn: object, i: number) => ({ ...turn, id: `T${i + 1}` })),
      audio: { recordingId: recording.body.id, transcriptionId: draft.body.id },
    };
    assert.equal(
      (await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source })).status,
      200,
    );
    assert.equal(
      (await h.request('/cases/CR-1001/source', 'PUT', { expectedRevision: 1, source })).status,
      409,
    );
    await h.close();
    h = await harness({ databasePath, transcribe });
    await h.login('reviewer');
    const saved = (await h.request('/cases/CR-1001/export')).body;
    assert.equal(saved.case.sourceRevision, 2);
    assert.equal(saved.recordings[0].sha256.length, 64);
    assert.equal(saved.transcriptions[0].model, 'test-audio-model');
    const range = await h.request(`${path}/content`, 'GET', undefined, { range: 'bytes=0-11' });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), 'bytes 0-11/100');
    assert.deepEqual(range.body, wave.subarray(0, 12));
    const oversized = await h.request(`${path}/content`, 'GET', undefined, {
      range: 'bytes=0-999999',
    });
    assert.equal(oversized.status, 206);
    assert.deepEqual(oversized.body, wave);
    const suffix = await h.request(`${path}/content`, 'GET', undefined, { range: 'bytes=-12' });
    assert.equal(suffix.status, 206);
    assert.deepEqual(suffix.body, wave.subarray(88));
    assert.equal(
      (await h.request(`${path}/content`, 'GET', undefined, { range: 'bytes=999-' })).status,
      416,
    );
    assert.equal(
      (await h.request(`/cases/CR-1002/recordings/${recording.body.id}/content`)).status,
      404,
    );
    assert.equal(
      (await h.request('/cases/CR-1002/source', 'PUT', { expectedRevision: 1, source })).status,
      404,
    );
  } finally {
    await h.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('audio rejects disguised files, non-synthetic data and uploads beyond its limit', async () => {
  const h = await harness({ transcribe });
  try {
    await h.login('reviewer');
    assert.equal(
      (await h.request('/cases/CR-1001/recordings', 'POST', { ...upload, synthetic: false }))
        .status,
      400,
    );
    assert.equal(
      (
        await h.request('/cases/CR-1001/recordings', 'POST', {
          ...upload,
          base64: Buffer.from('<html>not audio</html>').toString('base64'),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await h.request('/cases/CR-1001/recordings', 'POST', {
          ...upload,
          base64: 'A'.repeat(9 * 1024 * 1024),
        })
      ).status,
      413,
    );
    assert.equal((await h.request('/cases/CR-1001/recordings')).body.recordings.length, 0);
  } finally {
    await h.close();
  }
});

test('failed transcription preserves uploaded audio and leaves source and reviews unchanged', async () => {
  const h = await harness({
    transcribe: async () => {
      throw new AppError(429, 'MODEL_QUOTA', 'Quota reached.');
    },
  });
  try {
    await h.login('reviewer');
    const recording = (await h.request('/cases/CR-1001/recordings', 'POST', upload)).body;
    assert.equal(
      (await h.request(`/cases/CR-1001/recordings/${recording.id}/transcriptions`, 'POST', {}))
        .status,
      429,
    );
    const media = (await h.request('/cases/CR-1001/recordings')).body;
    assert.equal(media.recordings.length, 1);
    assert.equal(media.transcriptions.length, 0);
    const item = (await h.request('/cases/CR-1001')).body;
    assert.equal(item.sourceRevision, 1);
    assert.equal(item.analyses.length, 0);
  } finally {
    await h.close();
  }
});

test('out-of-order AI timestamps cannot become a saved transcript draft', async () => {
  const h = await harness({
    transcribe: async () => ({
      model: 'test',
      output: {
        ...transcript,
        turns: [
          { ...transcript.turns[0], time: '00:10' },
          { ...transcript.turns[1], time: '00:02' },
        ],
      },
    }),
  });
  try {
    await h.login('reviewer');
    const recording = (await h.request('/cases/CR-1001/recordings', 'POST', upload)).body;
    const result = await h.request(
      `/cases/CR-1001/recordings/${recording.id}/transcriptions`,
      'POST',
      {},
    );
    assert.equal(result.status, 502);
    assert.equal(result.body.code, 'TRANSCRIPTION_TIMESTAMPS');
    assert.equal((await h.request('/cases/CR-1001/recordings')).body.transcriptions.length, 0);
  } finally {
    await h.close();
  }
});
