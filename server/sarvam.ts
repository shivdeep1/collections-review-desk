import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { AppError } from './errors.ts';
import type { Transcriber } from './transcription.ts';

const base = 'https://api.sarvam.ai/speech-to-text/job/v1';
const resultSchema = z.object({
  language_code: z.string().optional(),
  diarized_transcript: z.object({
    entries: z
      .array(
        z.object({
          transcript: z.string().trim().min(1).max(4000),
          start_time_seconds: z.number().finite().min(0).lt(6000),
          speaker_id: z
            .union([z.string().max(40), z.number()])
            .nullable()
            .optional(),
        }),
      )
      .min(1)
      .max(120),
  }),
});

function storageUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !(
      url.hostname.endsWith('.blob.core.windows.net') ||
      url.hostname === 'storage.googleapis.com' ||
      url.hostname.endsWith('.storage.googleapis.com')
    )
  )
    throw new AppError(
      502,
      'TRANSCRIPTION_STORAGE',
      'Sarvam returned an unsupported storage address. Your recording is unchanged.',
    );
  return url;
}

export function createSarvamTranscriber(
  options: {
    fetcher?: typeof fetch;
    key?: () => string | undefined;
    pollMs?: number;
  } = {},
): Transcriber {
  return async (bytes, mimeType, config) => {
    const key = (options.key?.() ?? process.env.SARVAM_API_KEY)?.trim();
    if (!key)
      throw new AppError(
        503,
        'MODEL_NOT_CONFIGURED',
        'Add SARVAM_API_KEY to the server .env file before using Sarvam. Your recording is saved.',
      );
    const model = process.env.SARVAM_STT_MODEL || 'saaras:v4';
    const fetcher = options.fetcher || fetch;
    const signal = AbortSignal.timeout(180_000);
    async function request(url: string | URL, init: RequestInit) {
      const response = await fetcher(url, { ...init, signal, redirect: 'error' });
      if (!response.ok)
        throw new AppError(
          response.status === 429 ? 429 : 502,
          'SARVAM_REQUEST_FAILED',
          `Sarvam speech request returned HTTP ${response.status}. Check credits, key access and availability. The case transcript is unchanged; no fallback was used.`,
        );
      return response;
    }
    async function api(path: string, body?: unknown) {
      return (
        await request(base + path, {
          method: body === undefined ? 'GET' : 'POST',
          headers: { 'api-subscription-key': key!, 'Content-Type': 'application/json' },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        })
      ).json();
    }
    try {
      const mode = config?.mode || 'verbatim';
      const job = await api('', {
        job_parameters: {
          model,
          mode,
          language_code: config?.languageCode || 'unknown',
          with_diarization: true,
          with_timestamps: true,
        },
      });
      const jobId = z.string().min(1).max(200).parse(job.job_id);
      const filename = mimeType === 'audio/mpeg' ? 'recording.mp3' : 'recording.wav';
      const upload = await api('/upload-files', { job_id: jobId, files: [filename] });
      const uploadUrl = storageUrl(z.string().parse(upload.upload_urls?.[filename]?.file_url));
      await request(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType, 'x-ms-blob-type': 'BlockBlob' },
        body: new Uint8Array(bytes),
      });
      await api(`/${encodeURIComponent(jobId)}/start`, {});
      let status;
      do {
        await delay(options.pollMs ?? 3000, undefined, { signal });
        status = await api(`/${encodeURIComponent(jobId)}/status`);
        if (status.job_state === 'Failed' || status.failed_files_count > 0)
          throw new AppError(
            502,
            'SARVAM_JOB_FAILED',
            'Sarvam could not transcribe this recording. No draft was saved.',
          );
      } while (status.job_state !== 'Completed');
      const filenameOut = z
        .string()
        .min(1)
        .parse(
          status.job_details
            ?.find((d: { state: string }) => d.state === 'Success')
            ?.outputs?.find((f: { file_name: string }) => f.file_name.endsWith('.json'))?.file_name,
        );
      const links = await api('/download-files', { job_id: jobId, files: [filenameOut] });
      const response = await request(
        storageUrl(z.string().parse(links.download_urls?.[filenameOut]?.file_url)),
        {},
      );
      const raw = await response.text();
      if (raw.length > 1_000_000) throw new Error('Oversized transcript');
      const result = resultSchema.parse(JSON.parse(raw));
      const turns = result.diarized_transcript.entries.map((entry) => {
        const seconds = Math.floor(entry.start_time_seconds);
        return {
          time: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
          speaker: 'Unknown' as const,
          ...(entry.speaker_id == null ? {} : { speakerId: String(entry.speaker_id) }),
          text: entry.transcript,
        };
      });
      return {
        model: `sarvam/${model}`,
        output: {
          turns,
          warnings: [
            `Detected language: ${result.language_code || 'unknown'}. Sarvam speaker IDs do not establish collector/customer roles. Assign roles after listening.`,
            `Output mode: ${mode}. Language hint: ${config?.languageCode || 'auto'}. Recognition can change scripts, normalise or mishear words. Verify negation, amounts and payment addresses against playback. Segment timestamps are approximate.`,
          ],
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (signal.aborted)
        throw new AppError(
          504,
          'SARVAM_TIMEOUT',
          'Sarvam exceeded the 3-minute wait. Your recording is saved and the case is unchanged. A provider job may still finish and consume credits; retry creates a new request.',
        );
      throw new AppError(
        502,
        'SARVAM_TRANSCRIPTION_FAILED',
        'Sarvam returned an unavailable or invalid transcription result. Your recording is saved and the case transcript is unchanged.',
      );
    }
  };
}
