# Audio evidence extension

The user explicitly requested audio upload, Gemini transcription and playback after reporting confusing restored-input approval state. Use synthetic data only and preserve the existing working review workflow.

- Upload WAV or MP3 files up to 6 MB with synthetic-only confirmation. Persist recordings locally, scope them to their case, and record their hash and audit event.
- Generate an actual Gemini transcript from audio bytes. Record model, latency, timestamps, speaker labels, warnings and the original generated draft. Do not use a canned transcript.
- Keep upload and draft generation separate from the case's active transcript. Let the user inspect playback and edit the draft before explicitly adopting it.
- Adoption creates a new source revision, preserves the collector note, invalidates pending approvals, and requires a fresh review. Retain previous evidence and completed decisions as history.
- Let the reviewer play the original recording and seek from transcript timestamps. Disclose approximate timestamps, speech-recognition uncertainty and the fact that quote validation checks text rather than audio.
- Include a clearly labelled synthetic sample generated without private customer recordings. Record the real live test results separately from deterministic tests.
- Handle unavailable providers, invalid transcripts, unsupported files and incorrect cross-case links without substituting results or corrupting the active review.
- Do not add live calling, real bank actions, claims of verified transcripts, automatic borrower decisions or enterprise authentication.
