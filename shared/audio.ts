import { z } from 'zod';

export const AUDIO_MAX_BYTES = 6 * 1024 * 1024;
export const speechLanguages = [
  ['unknown', 'Auto-detect'],
  ['hi-IN', 'Hindi / Hinglish'],
  ['en-IN', 'English'],
  ['as-IN', 'Assamese'],
  ['bn-IN', 'Bengali'],
  ['brx-IN', 'Bodo'],
  ['doi-IN', 'Dogri'],
  ['gu-IN', 'Gujarati'],
  ['kn-IN', 'Kannada'],
  ['ks-IN', 'Kashmiri'],
  ['kok-IN', 'Konkani'],
  ['mai-IN', 'Maithili'],
  ['ml-IN', 'Malayalam'],
  ['mni-IN', 'Manipuri'],
  ['mr-IN', 'Marathi'],
  ['ne-IN', 'Nepali'],
  ['od-IN', 'Odia'],
  ['pa-IN', 'Punjabi'],
  ['sa-IN', 'Sanskrit'],
  ['sat-IN', 'Santali'],
  ['sd-IN', 'Sindhi'],
  ['ta-IN', 'Tamil'],
  ['te-IN', 'Telugu'],
  ['ur-IN', 'Urdu'],
] as const;
export const speechOptionsSchema = z
  .object({
    provider: z.enum(['gemini', 'sarvam']).optional(),
    languageCode: z
      .string()
      .refine((value) => speechLanguages.some(([code]) => code === value))
      .optional(),
  })
  .strict();
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
            speakerId: z.string().max(40).optional(),
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
