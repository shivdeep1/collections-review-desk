import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Run explicitly with node --env-file=.env scripts/make-sarvam-sample.ts.
// This spends Sarvam credits on fictional dialogue only. No voice cloning.
const key = process.env.SARVAM_API_KEY?.trim();
if (!key) throw new Error('Set SARVAM_API_KEY in .env first.');
const turns = [
  {
    speaker: 'shubh',
    role: 'Collector',
    text: 'नमस्ते रवि जी, मैं डेमो बैंक कलेक्शंस से अमित बोल रहा हूँ। हमारे रिकॉर्ड में अठारह हज़ार पाँच सौ रुपये overdue हैं।',
  },
  {
    speaker: 'rohan',
    role: 'Customer',
    text: 'ये amount सही नहीं लग रहा। मेरे हिसाब से पंद्रह हज़ार रुपये बाकी हैं। पहले मुझे charges का breakdown भेजिए।',
  },
  {
    speaker: 'shubh',
    role: 'Collector',
    text: 'क्या आप शुक्रवार, दो अक्टूबर तक अठारह हज़ार पाँच सौ रुपये pay कर देंगे?',
  },
  {
    speaker: 'rohan',
    role: 'Customer',
    text: 'नहीं। जब तक charges clear नहीं होते, मैं payment का promise नहीं कर सकता।',
  },
  {
    speaker: 'shubh',
    role: 'Collector',
    text: 'अभी पाँच हज़ार रुपये अमित डॉट कलेक्ट ऐट पर्सनल डैश पे पर transfer कर दीजिए। मैं record update कर दूँगा।',
  },
  {
    speaker: 'rohan',
    role: 'Customer',
    text: 'क्या ये बैंक का official payment address है? मुझे official payment link भेजिए।',
  },
  { speaker: 'shubh', role: 'Collector', text: 'अभी जो address मैंने बताया, उसी पर भेज दीजिए।' },
  {
    speaker: 'rohan',
    role: 'Customer',
    text: 'मैं अभी कोई payment नहीं कर रहा हूँ। पहले statement और official payment details भेजिए।',
  },
];
const cache = '.scratch/runtime/sarvam-tts';
mkdirSync(cache, { recursive: true });
function pcm(wave: Buffer) {
  if (wave.toString('ascii', 0, 4) !== 'RIFF' || wave.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('TTS did not return WAV');
  let data: Buffer | undefined;
  let format: Buffer | undefined;
  for (let at = 12; at + 8 <= wave.length;) {
    const size = wave.readUInt32LE(at + 4);
    if (at + 8 + size > wave.length) throw new Error('Truncated WAV');
    const name = wave.toString('ascii', at, at + 4);
    if (name === 'fmt ') format = wave.subarray(at + 8, at + 8 + size);
    if (name === 'data') data = wave.subarray(at + 8, at + 8 + size);
    at += 8 + size + (size % 2);
  }
  if (
    !format ||
    !data ||
    format.readUInt16LE(0) !== 1 ||
    format.readUInt16LE(2) !== 1 ||
    format.readUInt32LE(4) !== 16000 ||
    format.readUInt16LE(14) !== 16
  )
    throw new Error('Expected mono 16 kHz 16-bit PCM');
  return data;
}
const chunks: Buffer[] = [];
const manifest: object[] = [];
let duration = 0;
for (const turn of turns) {
  const input = {
    text: turn.text,
    language_code: 'hi-IN',
    speaker: turn.speaker,
    model: 'bulbul:v3',
    speech_sample_rate: 16000,
    output_audio_codec: 'wav',
    pace: 1,
    temperature: 0.3,
  };
  const id = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const path = `${cache}/${id}.wav`;
  if (!existsSync(path)) {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`Sarvam TTS returned HTTP ${response.status}`);
    const result = (await response.json()) as { audios?: string[] };
    if (result.audios?.length !== 1) throw new Error('Expected one TTS result');
    writeFileSync(path, Buffer.from(result.audios[0], 'base64'));
  }
  const data = pcm(readFileSync(path));
  manifest.push({ ...turn, startSeconds: duration, durationSeconds: data.length / 32000 });
  chunks.push(data, Buffer.alloc(11200));
  duration += data.length / 32000 + 0.35;
  console.log(`Generated ${turn.role} turn ${manifest.length}/${turns.length}`);
}
const audio = Buffer.concat(chunks);
const header = Buffer.alloc(44);
header.write('RIFF');
header.writeUInt32LE(audio.length + 36, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(16000, 24);
header.writeUInt32LE(32000, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(audio.length, 40);
writeFileSync('public/samples/sarvam-hinglish-call.wav', Buffer.concat([header, audio]));
writeFileSync(
  'public/samples/sarvam-hinglish-call.json',
  JSON.stringify(
    {
      synthetic: true,
      model: 'bulbul:v3',
      at: new Date().toISOString(),
      durationSeconds: duration,
      turns: manifest,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ durationSeconds: duration, bytes: audio.length + 44 }));
