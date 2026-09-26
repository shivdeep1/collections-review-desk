import express from 'express';
import type { Request } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { AUDIO_MAX_BYTES } from '../shared/audio.ts';
import type { Recording, Transcription } from '../shared/audio.ts';
import type { Actor, CaseRecord, Source } from '../shared/domain.ts';
import type { Store } from './store.ts';
import { AppError } from './errors.ts';
import { transcribeAudio, validateTranscription } from './transcription.ts';
import type { Transcriber } from './transcription.ts';

export function validateAudioLink(store: Store, caseId: string, source: Source) {
  if (!source.audio) return;
  store.recording(caseId, source.audio.recordingId);
  if (
    !store
      .transcriptions(caseId)
      .some(
        (d) =>
          d.id === source.audio!.transcriptionId && d.recordingId === source.audio!.recordingId,
      )
  )
    throw new AppError(
      400,
      'INVALID_AUDIO_LINK',
      'Select a saved transcription belonging to this case.',
    );
}

export function audioRouter(
  store: Store,
  actor: (req: Request) => Actor,
  event: (item: CaseRecord, who: Actor, type: string, detail: string) => void,
  transcribe: Transcriber = transcribeAudio,
) {
  const router = express.Router();
  const active = new Set<string>();
  router.get('/cases/:id/recordings', (req, res) => {
    actor(req);
    store.get(req.params.id);
    res.json({
      recordings: store.recordings(req.params.id),
      transcriptions: store.transcriptions(req.params.id),
    });
  });
  router.post('/cases/:id/recordings', (req, res) => {
    const who = actor(req);
    const body = z
      .object({
        fileName: z.string().trim().min(1).max(120),
        mimeType: z.enum(['audio/wav', 'audio/mpeg']),
        base64: z
          .string()
          .min(16)
          .max(Math.ceil((AUDIO_MAX_BYTES * 4) / 3)),
        synthetic: z.literal(true),
      })
      .strict()
      .parse(req.body);
    const bytes = Buffer.from(body.base64, 'base64');
    if (bytes.toString('base64') !== body.base64 || bytes.length > AUDIO_MAX_BYTES)
      throw new AppError(400, 'INVALID_AUDIO', 'Upload a valid WAV or MP3 file up to 6 MB.');
    const wav =
      bytes.length > 44 &&
      bytes.subarray(0, 4).toString() === 'RIFF' &&
      bytes.subarray(8, 12).toString() === 'WAVE';
    const mp3 =
      bytes.length > 32 &&
      (bytes.subarray(0, 3).toString() === 'ID3' ||
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
    if ((body.mimeType === 'audio/wav' && !wav) || (body.mimeType === 'audio/mpeg' && !mp3))
      throw new AppError(
        400,
        'AUDIO_FORMAT',
        'The file contents do not match the declared WAV or MP3 format.',
      );
    const recording: Recording = {
      id: randomUUID(),
      caseId: req.params.id,
      fileName: body.fileName,
      mimeType: body.mimeType,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      createdAt: new Date().toISOString(),
    };
    store.transaction(() => {
      const item = store.get(req.params.id);
      if (store.recordings(item.id).length >= 10)
        throw new AppError(
          400,
          'AUDIO_LIMIT',
          'This demonstration supports up to 10 recordings per case.',
        );
      store.saveRecording(recording, bytes);
      event(
        item,
        who,
        'audio_uploaded',
        `Synthetic recording ${recording.id} saved locally. Existing transcript unchanged.`,
      );
      store.save(item);
    });
    res.status(201).json(recording);
  });
  router.get('/cases/:id/recordings/:recordingId/content', (req, res) => {
    actor(req);
    const recording = store.recording(req.params.id, req.params.recordingId);
    const length = recording.bytes.length;
    res.setHeader('Content-Type', recording.metadata.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const suffix = match && !match[1] && match[2] ? Number(match[2]) : 0;
      const start = suffix > 0 ? Math.max(0, length - suffix) : match?.[1] ? Number(match[1]) : -1;
      const end = suffix > 0 || !match?.[2] ? length - 1 : Math.min(Number(match[2]), length - 1);
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start >= length ||
        end < start
      )
        return res.status(416).setHeader('Content-Range', `bytes */${length}`).end();
      res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${length}`);
      res.setHeader('Content-Length', end - start + 1);
      return res.end(recording.bytes.subarray(start, end + 1));
    }
    res.setHeader('Content-Length', length);
    res.end(recording.bytes);
  });
  router.post('/cases/:id/recordings/:recordingId/transcriptions', async (req, res) => {
    const who = actor(req);
    const recording = store.recording(req.params.id, req.params.recordingId);
    const key = recording.metadata.id;
    if (active.has(key))
      throw new AppError(
        409,
        'TRANSCRIPTION_RUNNING',
        'A transcription is already running for this recording.',
      );
    active.add(key);
    const start = Date.now();
    try {
      const result = await transcribe(recording.bytes, recording.metadata.mimeType);
      const draft: Transcription = {
        ...validateTranscription(result.output),
        id: randomUUID(),
        caseId: req.params.id,
        recordingId: key,
        model: result.model,
        createdAt: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
      store.transaction(() => {
        const item = store.get(req.params.id);
        store.saveTranscription(draft);
        event(
          item,
          who,
          'audio_transcribed',
          `Draft ${draft.id} generated from recording ${key}. Reviewer confirmation required before adoption.`,
        );
        store.save(item);
      });
      res.status(201).json(draft);
    } finally {
      active.delete(key);
    }
  });
  return router;
}
