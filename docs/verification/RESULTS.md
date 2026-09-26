# Verification results

## Current Sarvam extension

32 automated tests pass; the production build passes. Sarvam batch tests use controlled external responses through the public app API and cover role uncertainty, native-script preservation, timestamp conversion, storage URL restrictions, API-key isolation and failed-job preservation. Payment checks now reject a supported directory finding without an exact grounded identifier mismatch.

Actual Saaras v4 requests are retained in sarvam-english-live.json, sarvam-hinglish-live.json, sarvam-hinglish-hinted-live.json and sarvam-hinglish-verbatim-live.json. English took 4.469 s. Hindi auto-detection mixed scripts; code-mixed output misnormalised the address; Hindi-hinted verbatim output took 4.084 s and retained the spoken words. The browser run took approximately 4.3 s. Bulbul v3 generated a 42.3-second fictional Hinglish call using stock voices. This does not validate 23 languages.

The completed Hinglish case is CR-A2889970. The reviewer assigned speaker roles and corrected the known synthetic spoken address to amit.collect@personal-pay in source revision 3. The original draft and raw source revision 2 remain saved. Report v2 under prompt collections-review-v7 passed validation in about 3.5 seconds and was approved through the UI. Raw spoken-address review remains a limitation: v5 invented an identifier and was rejected, v6 saved an overconfident payment finding, and the stricter v7 guard rejected the same unsupported claim. The v6 report is historical and was not approved. No failed request was replaced with a fixture.

The final four-case review run uses prompt collections-review-v7 in live-evaluation.json. Three passed immediately; the supported-concern scenario timed out. Its successful 3.654-second retry is in model-followup-v7.json. All expected outcomes were reached, with the timeout preserved. Earlier v4, v5 and v6 results remain as history. These are small synthetic checks, not production accuracy estimates.

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
