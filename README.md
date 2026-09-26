# Collections Review Desk

A working synthetic prototype for bank collections quality teams. It compares a call transcript with the collector's note and a supplied policy, then completes a supervisor-approved case action.

## Run locally

Requires Node.js 24 or later. SQLite is built into Node, so no database service is needed.

```powershell
npm ci
Copy-Item .env.example .env
# Add Gemini and Sarvam keys to .env. Keep keys on the server.
npm run build
npm start
```

Open **http://127.0.0.1:4317**. If `.env` already contains your key, keep that file instead of copying over it. Restart after changing a key or model setting. The server binds to this machine only.

For development, use `npm run dev`. It watches server changes. Run `npm run build` after client edits if a production build already exists.

## What works

- A queue of three synthetic cases, plus custom case creation and `.txt` transcript import.
- Synthetic WAV/MP3 upload, locally saved recordings, real Sarvam or Gemini transcription drafts, reviewer acceptance and timestamp-linked playback. Included recordings cover English with Windows voices and a 42-second Hindi-English call with Sarvam Bulbul voices.
- Live Gemini analysis of the transcript, collector note, loan context, versioned policy and payment directory. No case-ID-based verdicts or offline answer substitution.
- Exact quote and supplied-policy-reference validation. Invalid model output cannot become a saved report.
- Deterministic payment-destination comparison with an explicit unavailable/incomplete directory outcome.
- Editable evidence and policy, retained source revisions, immutable review snapshots and report history.
- Reviewer proposals, supervisor approval, transactional case updates and follow-up records. Changed evidence, reports or proposals invalidate pending approval. Duplicate requests create one action.
- SQLite persistence, an audit timeline and JSON export of evidence and decisions.

The sidebar deliberately allows switching between two **demo personas**. The API enforces the chosen session role, but this is not enterprise authentication. Bank follow-up queues are local simulations. Sarvam or Gemini can transcribe an uploaded recording; the collections review then analyses the accepted text. Exact-quote checks validate text, not the accuracy of speech recognition. The app does not send messages, move money or determine misconduct.

## Demonstrate it

Open Ravi Mehta's case and click **Run AI review**. Inspect the customer's refusal and the payment-directory discrepancy. Add a reviewer reason and send a proposal. Switch to the supervisor persona, add a decision reason and approve. Open the audit trail, export the case and reload to show persistence.

Nisha Shah's call supports its case note. Farah Khan's call lacks earlier evidence. For changed-input testing, edit a transcript or policy and run a new review. Earlier reports remain available with their original evidence.

See [the seven-minute demo script](docs/DEMO.md), [deployment boundaries](docs/DEPLOYMENT.md) and [the one-slide pitch](public/pitch.html).

For the audio workflow, follow [the audio demo guide](docs/AUDIO_DEMO.md). Set `TRANSCRIPTION_PROVIDER=sarvam` and `SARVAM_API_KEY` to use Saaras v4 batch transcription. The UI also offers Gemini transcription when its key is present. Sarvam uses paid credits; no provider fallback is automatic. Set the known recording language and map speaker IDs to roles before accepting a draft. See [research and limitations](docs/SARVAM_RESEARCH.md).

## Verify

```powershell
npm test
npm run build
npm run test:live
```

The regular tests run against the public HTTP API, real temporary SQLite databases and a model test double. They need no key and make no provider calls. The live evaluation makes four requests to the configured model and writes `docs/verification/live-evaluation.json`. A four-case check does not establish production accuracy. See [verification notes](docs/verification/RESULTS.md).

Gemini 3.5 Flash-Lite and Gemini 3.1 Flash-Lite are listed as free-tier eligible by [Google](https://ai.google.dev/gemini-api/docs/pricing). Earlier review runs reached all four expected outcomes, with one targeted retry after a timeout. Current results and failed requests are recorded in the verification notes. The earlier 3 Flash Preview model passed before later returning 503 errors; 2.5 Flash exhausted its daily free quota. Those earlier records remain in verification history. The key's project determines quota and billing. This app neither enables billing nor silently switches models. Provider errors remain explicit. Use synthetic data only with this prototype.

## Files and backups

Application data lives in `data/review-desk.sqlite` and SQLite's adjacent WAL files. Git excludes the database and `.env`. To back up saved cases, export them from the app or stop the server and copy the entire `data` directory. Git checkpoints back up the source code, not secrets or local case history.

The project uses newly written application code and public packages. It contains no reused private Airlock implementation. Public dependency and font notices are in [THIRD_PARTY.md](THIRD_PARTY.md).
