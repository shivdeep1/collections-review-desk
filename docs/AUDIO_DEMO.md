# Audio demonstration

Open the **Ravi Mehta · audio demo** case on this laptop. It is separate from the original Ravi case, so you can rehearse audio without replacing your original text scenario.

1. Choose **Audio evidence**. Use the existing saved recording, or choose **Load synthetic sample**. You can also upload your own synthetic WAV or MP3, up to 6 MB, after confirming its contents are fictional.
2. Play part of the call. The included 53-second recording uses computer-generated voices and English dialogue. It is not a real bank recording.
3. Choose **Transcribe with Gemini**, or **Transcribe again** if a saved draft already exists. This sends the actual audio bytes to Gemini. It uses a model request and may be affected by quota or provider availability.
4. Inspect the draft against playback. The sample's customer disputes the amount and says, "I cannot promise to pay." Check negation, amounts, speaker attribution and payment-address spelling. The model may normalise spoken words into an address string. Timestamps are approximate.
5. Correct the draft if needed, tick the acceptance checkbox, then choose **Use transcript for review**. This creates a new source revision. The collector note remains unchanged, so the review can now compare that note against the accepted transcript.
6. Choose **Run AI review**. Click a transcript timestamp to hear that passage. Follow the existing proposal, supervisor approval and saved-action workflow.

If you change or restore inputs after a completed decision, the current view now shows unreviewed inputs. Earlier findings and approvals are still available through the report selector, clearly labelled as history. This does not erase a completed decision or apply it to new evidence.

## What to tell the judges

"We can start from a recording, not just a typed call log. Gemini generates a draft, a reviewer checks the words against playback, and the accepted transcript becomes versioned evidence. The review compares that evidence with the collector note and policy. The supervisor owns the final action."

The first live transcription used Gemini 3.1 Flash-Lite, took 4.5 seconds and returned 15 segments. We checked one synthetic English recording. This is not a production accuracy result for noisy calls, Hindi/Hinglish or different accents.

## Quota and recovery

Uploading, playing a recording, editing a draft, accepting it and browsing history do not call Gemini. Transcription and collections review are separate calls. Changing cases does not reset quota. A provider error leaves the recording and current case evidence intact. Show a saved draft/report as a previous live run if connectivity fails; do not describe it as a fresh run.

## Persistence

Recordings and original transcription drafts are stored in the local SQLite database. Each adopted source links to its recording and draft IDs. Case JSON exports include recording metadata and original drafts; they do not embed the audio bytes. Back up the database as described in the README to preserve the full audio evidence.
