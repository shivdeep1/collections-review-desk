# Synthetic audio sample

`synthetic-collections-call.wav` is a fictional English collections conversation generated locally with the installed Windows speech engine. Both voices are computer generated. No real customer, bank, account or phone recording was used.

The collector claims INR 18,500 is overdue. The customer disputes it, refuses a promise to pay, and asks for a statement and official payment details. The collector suggests an address spoken as "amit dot collect at personal dash pay". The transcription step must preserve what it hears. A reviewer may correct spelling only after checking the recording; the application does not pretend that spoken words establish an exact verified account identifier.

The script that generated this file is `scripts/make-demo-audio.ps1`. This source script is not sent to Gemini during transcription. Gemini receives the actual WAV bytes. Transcription output is not prewritten.

## Sarvam Hinglish sample

`sarvam-hinglish-call.wav` is a 42.3-second fictional Hindi-English call generated with Bulbul v3 stock voices shubh and rohan. Its script, voice names and turn offsets are in `sarvam-hinglish-call.json`. It is not a real or live call. Generate it explicitly with `node --env-file=.env scripts/make-sarvam-sample.ts`; this uses Sarvam credits. Choose Hindi / Hinglish for Saaras transcription. The intended demo payment identifier is `amit.collect@personal-pay`; its spelling must be checked and corrected by the reviewer, not inferred as a verified identifier from speech recognition alone.
