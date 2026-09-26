# Sarvam audio demonstration

Open **Ravi Mehta · Sarvam Hinglish** on this laptop. The original text and English audio cases remain separate.

1. Open **Audio evidence**. Use the existing recording or select **Hindi-English · Sarvam Bulbul voices**, then **Load synthetic sample**. The 42-second call uses two stock synthetic voices. It is not a live or real bank call.
2. Select **Sarvam Saaras** and **Hindi / Hinglish** as the recording language. Choose **Transcribe again** or **Transcribe with Sarvam**. This spends Sarvam credits. Gemini remains available as a separate transcription option.
3. Inspect the draft against playback. In the tested sample, speaker 2 introduces himself as the collector and speaker 1 is the customer. Select those roles after inspection; do not assume the numbering will always be the same.
4. Check the refusal, disputed amount and payment address. For this known synthetic script, normalise the spoken address in the draft from **अमित डॉट कलेक्ट एट पर्सनल डैश पे** to **amit.collect@personal-pay** after checking it. This is a human correction, not an automatically verified identifier. Original provider text remains saved. Never guess an address on a real call; request corroborating evidence if spelling is uncertain.
5. Tick the inspection checkbox and choose **Use transcript for review**. This saves a new source revision; the collector note remains unchanged. The completed practice case already contains the correction, so accepting a new raw draft requires checking it again.
6. Choose **Sarvam 105B** as the review model and run the review. Sarvam compares the accepted evidence with the note and supplied policy. Gemini is a manually selected backup. Click **00:17** to replay the customer's refusal. Inspect exact quotations and the directory result.
7. Propose investigation with a reason that records your correction. Switch to the supervisor, inspect the evidence and approve a local follow-up. The app retains the original draft, source revisions, model report and human reasons.

## Honest pitch

"Sarvam transcribes a Hindi-English recording. A reviewer checks the words and speaker roles, then Sarvam 105B compares that evidence with the collector note and policy. Code checks quotations and payment identifiers. The supervisor owns the final action."

Say **Sarvam supports transcription across 22 Indian languages and English; we tested English and Hindi-English synthetic samples**. Do not say every language or accent is validated. Bulbul speech generation supports a smaller 11-language set.

## What the tests found

Saaras v4 transcribed the original 53-second English recording in 4.5 seconds. Hindi-hinted verbatim mode handled the new 42-second Hinglish sample in about 4.1 seconds; the UI run took 4.3 seconds. Auto-detection mixed scripts and translated one segment. Code-mixed output normalised the address incorrectly. We therefore use verbatim output and recommend selecting the known language.

An earlier Gemini review struggled with an address left as spoken Hindi words. Exact-identifier validation rejected unsupported output. The tested completed workflow includes the documented spelling correction. Show this human step; do not imply untouched audio becomes a fully verified report.

## Credits and recovery

Uploading, playback, editing, accepting and browsing history make no AI request. Transcription uses Sarvam credits or Gemini quota according to your selection. Review is a separate Sarvam 105B request by default; Gemini backup requires manual selection. Switching cases does not reset quota. There is no silent fallback. A provider error preserves recordings and active evidence. A Sarvam transcription request exceeding three minutes may still finish and be billed remotely; retry creates a new job.

## Persistence and history

The local SQLite database stores recordings and original drafts. The adopted source links to both IDs. JSON export includes metadata and drafts, not audio bytes. Back up the database to retain audio. Editing evidence makes earlier reports and decisions historical; it does not erase them.
