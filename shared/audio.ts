import { z } from 'zod';

export const AUDIO_MAX_BYTES = 6 * 1024 * 1024;
export const audioLinkSchema = z
  .object({
    recordingId: z.string().uuid(),
    transcriptionId: z.string().uuid(),
  })
  .strict();
export const transcriptionSchema = z
  .object({
    turns: z
      .array(
        z
          .object({
            time: z.string().regex(/^\d{2}:[0-5]\d$/),
            speaker: z.enum(['Collector', 'Customer', 'Unknown']),
            text: z.string().trim().min(1).max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(120),
    warnings: z.array(z.string().trim().min(1).max(500)).max(20),
  })
  .strict();
export type Recording = {
  id: string;
  caseId: string;
  fileName: string;
  mimeType: 'audio/wav' | 'audio/mpeg';
  bytes: number;
  sha256: string;
  createdAt: string;
};
export type Transcription = z.infer<typeof transcriptionSchema> & {
  id: string;
  caseId: string;
  recordingId: string;
  model: string;
  createdAt: string;
  latencyMs: number;
};
export function timestampSeconds(time: string): number {
  return time.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}
