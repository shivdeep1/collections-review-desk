# Verification results

## Current Sarvam extension

36 automated tests pass; the production build passes. Sarvam batch tests use controlled external responses through the public app API and cover role uncertainty, native-script preservation, timestamp conversion, storage URL restrictions, API-key isolation and failed-job preservation. Payment checks reject a supported directory finding without an exact grounded identifier mismatch.

Actual Saaras v4 requests are retained in sarvam-english-live.json, sarvam-hinglish-live.json, sarvam-hinglish-hinted-live.json and sarvam-hinglish-verbatim-live.json. English took 4.469 s. Hindi auto-detection mixed scripts; code-mixed output misnormalised the address; Hindi-hinted verbatim output took 4.084 s and retained the spoken words. The browser run took approximately 4.3 s. Bulbul v3 generated a 42.3-second fictional Hinglish call using stock voices. This does not validate 23 languages.

The completed Hinglish case is CR-A2889970. The reviewer assigned speaker roles and corrected the known synthetic spoken address to amit.collect@personal-pay in source revision 3. The original draft and raw source revision 2 remain saved. Sarvam 105B produced saved report v3, and the reviewer and supervisor completed local follow-up FU-96254B35 against that report. The model repeated related concerns across eight findings; the human reasons condensed them to two material issues. A later Sarvam rerun failed citation validation and left the saved report intact. Raw spoken-address review remains a limitation; earlier unsupported results were rejected by validation rather than replaced with fixtures.

The current four-case review smoke run uses Sarvam 105B with prompt collections-review-v11 in live-evaluation.json. All four expected outcomes were reached on the first attempt in that run. Earlier failed and retried runs remain in the repository as history. These are small synthetic checks, not production accuracy estimates.

## Earlier implementation verification

Verified locally on 26 September 2026 with Node.js 24 on Windows.

## Automated checks

`npm test`: **27 passed, 0 failed**. API tests use temporary SQLite databases and controlled model adapters. A rendered-workspace regression also covers restored-input approval state. They cover:

- Session and supervisor permissions, hostile Host headers and cross-origin writes.
- Approval persistence across database/server reopen and duplicate-request idempotency.
- Stale proposals after evidence, policy or analysis changes; concurrent edits during analysis.
- Exact source citations, supplied policy references and grounded payment extraction.
- Missing directories and rejection of closure when material evidence is missing.
- Model failure without a saved report or changed case state.
- Custom synthetic cases, input validation, source history, loan provenance and export.
- Audio upload limits and format checks, case-scoped playback, persisted drafts, byte-range seeking, explicit adoption, failed transcription and invalid timestamps.

`npm run build`: TypeScript validation and production Vite build passed. Fonts are bundled locally.

## Live AI evaluation

The selected review model is **gemini-3.5-flash-lite**, using prompt `collections-review-v4`. Actual results are in `live-evaluation.json`. One clean-case request timed out; its successful targeted retry is recorded separately in `model-followup.json`.

| Scenario                      | Expected behavior observed                                 | Latency |
| ----------------------------- | ---------------------------------------------------------- | ------- |
| Supported concern             | Note contradicted; escalation suggested                    | 3.6 s   |
| Clean conversation            | Note supported; no findings; closure suggested, on retry   | 2.9 s   |
| Missing prior evidence        | Material gaps kept explicit; more evidence requested       | 2.7 s   |
| Held-out changed conversation | Changed evidence produced a supported note and no findings | 2.6 s   |

All four scenarios produced the expected result, with the timeout and retry retained in the evidence. This is a small smoke evaluation, not an estimate of production accuracy or performance. The earlier 3 Flash Preview four-case success remains in `live-evaluation-3-preview.json`; it later returned 503 errors for audio and text, prompting the model change.

Earlier runs exposed an ambiguous-case closure error and then a Gemini 2.5 Flash daily free-quota failure. Those records remain in `live-evaluation-v3.json` and `live-evaluation-2.5-quota.json`. The revised prompt distinguishes an accurate note from a resolved case. A server rule also rejects any attempted closure with material missing evidence. No stored fixture verdict replaces a failed model response.

## Browser workflow

The actual browser journey verified queue navigation, live review, quote navigation, reviewer proposal, supervisor approval, saved follow-up and audit. Follow-up `FU-E306964A` survived an actual server restart and browser reload.

A later browser run with Gemini 3 Flash Preview changed Ravi's note to accurately describe the same call. The note assessment changed from contradicted to supported, and the inaccurate-note finding disappeared. The payment-directory concern remained. This request took 9.4 seconds. Report v1 still displayed its original source, and report v2 displayed the corrected note.

Navigating to Nisha while Ravi's review ran did not replace the selected case when the response arrived. The browser checks use synthetic data only.

The JSON export downloaded through the browser. Its audit view showed all three source revisions and the new report's model, prompt, loan context and SHA-256. Restoring the original note produced two concerns again in report v3, using Gemini 3 Flash Preview in 9.6 seconds. That report remains in history; a later restore advanced the active source to revision 5.

Desktop layout was inspected at 1440 by 900. At a 390-pixel phone viewport, an off-screen accessibility label initially caused page overflow. Giving the table's scroll container a positioning context fixed it. The final document width equalled the available viewport width, while the table retained its own horizontal scrolling.

The editable one-slide PowerPoint passed package, geometry, font and import validation. Its rendered preview was inspected.

## Audio extension and reset fix

The original restore changed the active source but the UI still defaulted to the old report and approval. A failing rendered-workspace test reproduced that exact issue. The current view now defaults to unreviewed inputs after an edit. Previous reports and approvals remain explicitly labelled as history. The regression passed and the browser showed source revision 5 with no old approval presented as current.

The actual 52.94-second WAV was sent to Gemini 3.1 Flash-Lite. The first successful request took 4.462 seconds and returned 15 segments; its output is in `audio-live-evaluation.json`. A second browser-triggered transcription took about 4.0 seconds. The model normalised the spoken address into an address string, so both the draft screen and saved warnings call for spelling verification. Two earlier attempts with 3 Flash Preview returned 503; no replacement transcript was supplied.

The browser accepted the inspected draft as a new revision. Clicking 00:24 started the linked recording at currentTime 24 with paused=false. Metadata loaded with duration 52.94 and readyState 4. A code-review finding about Escape closing a busy native dialog was fixed; the browser confirmed the dialog remained open during transcription and displayed its completed draft afterward.

The audio-derived source was then reviewed live by Gemini 3.5 Flash-Lite in 3.6 seconds. The result identified the note discrepancy and unlisted destination with eight validated text references. A reviewer proposed investigation, and the supervisor saved local follow-up `FU-B7EEB26F`. The model used stronger wording such as "falsified" than the evidence warrants about intent; the human proposal and decision explicitly limit the conclusion to a discrepancy requiring investigation. This remains a model-output limitation.

## Limits

The prototype uses explicit demo personas, a supplied demo policy and simulated local bank follow-up queues. It has no enterprise SSO, bank integration, live calling or production model approval. Audio transcription was checked on one clean synthetic English recording, not on noisy multilingual bank calls. See `../DEPLOYMENT.md` for a bank pilot's requirements. The free models depend on provider availability and project quota; failures remain visible.

## Sarvam review and Hindi-English audio

Sarvam Saaras v4 transcribed the 42-second synthetic Hindi-English call in 4.3 seconds in the browser with `hi-IN` and verbatim output. The reviewer assigned Speaker 2 as Collector and Speaker 1 as Customer, corrected the spoken payment identifier against the known synthetic script, and accepted a new source revision. Reopening Audio evidence now displays those accepted roles and corrections. The original Roman-script Hinglish case and the Devanagari audio case remain separate cases.

Sarvam 105B is the default collections-review model; Gemini remains an explicit backup. In the final `collections-review-v11` smoke run, all four synthetic scenarios reached the expected action, note assessment and payment-directory outcome on the first request. The full outputs, attempt counts and latencies are in `live-evaluation.json`. Earlier runs were inconsistent: a clean call received a placeholder concern, a missing-prior-call case was dismissed, and one supported concern had an invented quotation. The current server rejects unsupported citations, placeholder findings, closure with a supported concern, and a request-for-information recommendation where both a contradicted note and an exact unlisted payment destination require supervisor investigation. It retries a rejected Sarvam draft once, then leaves the case unchanged if still invalid. This small test does not establish production accuracy across accents, languages or real collections calls.
