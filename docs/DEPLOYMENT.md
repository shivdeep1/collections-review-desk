# Deployment boundaries

## What this prototype deploys

One Node process serves the browser app and HTTP API. A local SQLite database stores synthetic cases, all source revisions, model reports, proposals, supervisor decisions and audit events. The server calls Sarvam by default with synthetic evidence; a reviewer can manually select Gemini backup. The browser never receives either API key.

The app binds to `127.0.0.1`. Local Host checks, same-origin write checks, HTTP-only session cookies and server-side role enforcement protect the local workflow. Anyone who can use the app can deliberately select the supervisor demo persona. These controls demonstrate the approval boundary but do not replace authenticated bank identities.

## A credible first bank pilot

The intended user is a collections quality supervisor. The buyer would be the bank's collections or operations function. Start with historical, appropriately authorised call transcripts and case exports in an environment approved by that bank. Keep supervisors responsible for interpreting concerns and deciding follow-up.

An initial integration can consume a transcript and collector note exported from the existing call platform or collection system, plus a policy and approved-destination directory from the bank. The completed review should link back to the bank's existing case reference. There is no need to replace the loan ledger or settlement infrastructure.

Measure the percentage of quoted evidence that is valid, missed material concerns, false concerns on clean calls, supervisor agreement and time to reach a documented decision. Include different languages, imperfect transcripts, ambiguous commitments and policy changes. Set pilot thresholds with bank reviewers. Four synthetic cases do not establish those thresholds.

## Work required before real customer deployment

1. Replace demo personas with the bank's SSO and verified roles. Decide whether a proposer may approve their own proposal. Apply tenant and case-level access control.
2. Use a bank-approved model deployment, data-processing terms, region and retention policy. This Sarvam/Gemini prototype is for synthetic data only.
3. Connect the bank's approved recording source. The prototype already retains uploaded synthetic recordings and draft provenance. Validate speech recognition separately on the bank's languages, accents and call quality before relying on those transcripts.
4. Integrate a maintained policy store and payment directory, with ownership and completeness defined by the bank.
5. Replace the local follow-up simulation with an authenticated case-management connector and durable execution queue. Keep version binding and idempotency across that boundary.
6. Add encrypted storage, retention and deletion controls, immutable audit export, monitoring, backup restoration, operational access controls and load testing.
7. Evaluate model behavior on adjudicated bank examples. Exact quote checks prove that text exists, not that the model interpreted it correctly or mapped the right policy.

The current service flags possible discrepancies. It does not prove fraud, penalise collectors, make lending decisions, contact borrowers or move money.
