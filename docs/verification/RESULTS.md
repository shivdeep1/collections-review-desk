# Verification results

Verified locally on 26 September 2026 with Node.js 24 on Windows.

## Automated checks

`npm test`: **22 passed, 0 failed**. These tests call the public HTTP API with temporary SQLite databases and a controlled model test double. They cover:

- Session and supervisor permissions, hostile Host headers and cross-origin writes.
- Approval persistence across database/server reopen and duplicate-request idempotency.
- Stale proposals after evidence, policy or analysis changes; concurrent edits during analysis.
- Exact source citations, supplied policy references and grounded payment extraction.
- Missing directories and rejection of closure when material evidence is missing.
- Model failure without a saved report or changed case state.
- Custom synthetic cases, input validation, source history, loan provenance and export.

`npm run build`: TypeScript validation and production Vite build passed. Fonts are bundled locally.

## Live AI evaluation

The final four-case run used **gemini-3-flash-preview**, prompt `collections-review-v4`, and the user's configured Gemini key. Actual results are in `live-evaluation.json`.

| Scenario                      | Expected behavior observed                                 | Latency |
| ----------------------------- | ---------------------------------------------------------- | ------- |
| Supported concern             | Note contradicted; escalation suggested                    | 5.2 s   |
| Clean conversation            | Note supported; no findings; closure suggested             | 5.8 s   |
| Missing prior evidence        | Material gaps kept explicit; more evidence requested       | 8.9 s   |
| Held-out changed conversation | Changed evidence produced a supported note and no findings | 7.5 s   |

All four met their defined expectations. This is a small smoke evaluation, not an estimate of production accuracy or performance.

Earlier runs exposed an ambiguous-case closure error and then a Gemini 2.5 Flash daily free-quota failure. Those records remain in `live-evaluation-v3.json` and `live-evaluation-2.5-quota.json`. The revised prompt distinguishes an accurate note from a resolved case. A server rule also rejects any attempted closure with material missing evidence. No stored fixture verdict replaces a failed model response.

## Browser workflow

The actual browser journey verified queue navigation, live review, quote navigation, reviewer proposal, supervisor approval, saved follow-up and audit. Follow-up `FU-E306964A` survived an actual server restart and browser reload.

A later browser run with Gemini 3 Flash Preview changed Ravi's note to accurately describe the same call. The note assessment changed from contradicted to supported, and the inaccurate-note finding disappeared. The payment-directory concern remained. This request took 9.4 seconds. Report v1 still displayed its original source, and report v2 displayed the corrected note.

Navigating to Nisha while Ravi's review ran did not replace the selected case when the response arrived. The browser checks use synthetic data only.

The JSON export downloaded through the browser. Its audit view showed all three source revisions and the new report's model, prompt, loan context and SHA-256. Restoring the original note produced two concerns again in report v3, using Gemini 3 Flash Preview in 9.6 seconds. This is the saved rehearsal state.

Desktop layout was inspected at 1440 by 900. At a 390-pixel phone viewport, an off-screen accessibility label initially caused page overflow. Giving the table's scroll container a positioning context fixed it. The final document width equalled the available viewport width, while the table retained its own horizontal scrolling.

The editable one-slide PowerPoint passed package, geometry, font and import validation. Its rendered preview was inspected.

## Limits

The prototype uses explicit demo personas, a supplied demo policy and simulated local bank follow-up queues. It has no enterprise SSO, bank integration, audio transcription or production model approval. See `../DEPLOYMENT.md` for a bank pilot's requirements. The free model depends on provider availability and project quota; failures remain visible.
