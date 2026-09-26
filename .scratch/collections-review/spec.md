# Collections Review Desk

Status: implemented and verified locally. See docs/verification/RESULTS.md for checks and limits.

## Problem statement

A collections supervisor must establish whether a collector's note is supported by the conversation, identify concerns against supplied policy, and save a defensible follow-up decision. Reading an AI summary alone does not complete this work.

## Solution

A synthetic case queue and evidence workspace with live AI analysis, exact quotations, versioned inputs, supervisor approval and persistent follow-up records. The first demonstration compares a claimed promise to pay against a disputed amount and a payment destination absent from the supplied directory.

## User stories

1. As a reviewer, I can open synthetic cases and see their current status and owner.
2. As a reviewer, I can supply my own synthetic transcript and collector note.
3. As a reviewer, I can inspect the relevant loan context, versioned policy and payment directory.
4. As a reviewer, I can run a real model on those inputs and see its actual model identifier and latency.
5. As a reviewer, I can inspect exact source quotes for each finding and the referenced policy clause.
6. As a reviewer, I can see when evidence is insufficient without a fabricated conclusion.
7. As a reviewer, I can distinguish a directory discrepancy from proof of fraud.
8. As a reviewer, I can edit evidence or policy and rerun analysis as a separate version.
9. As a reviewer, I can propose escalation, an information request or dismissal with a reason.
10. As a supervisor, I can inspect a proposal and approve its specific action with a reason.
11. As a supervisor, I cannot approve a proposal after its evidence, analysis or action changes.
12. As a supervisor, repeated submissions cannot create duplicate follow-up records.
13. As a supervisor, I can see the saved result after reloading or restarting the server.
14. As a reviewer, I cannot bypass supervisor permissions by directly calling the action API.
15. As a demonstrator, I can switch clearly labelled demo personas, without claiming enterprise authentication.
16. As a demonstrator, I can show compliant and unresolved conversations as well as a supported concern.
17. As a demonstrator, I can export the evidence, review and audit history for the case.
18. As a demonstrator, a missing model key or failed request produces a clear error, never a fixture verdict.

## Implementation decisions

Use React and TypeScript, a Node HTTP API and SQLite on disk. Bind to loopback by default. Opaque server sessions represent two explicitly simulated demo personas. All action permissions and version checks run on the server. Store immutable analysis snapshots, proposals, decisions and audit events. Transactionally save completed actions and idempotency results. Structured model output must cite exact source spans and real supplied policy IDs. Treat all uploaded text as evidence, not instructions. Payment directory comparisons are deterministic and show directory completeness. Provider keys remain server-side.

## Testing decisions

The HTTP API is the primary public test boundary, as authorised by the build plan. Test persistence, role enforcement, stale proposals, duplicate decisions, input validation and model evidence validation through it. Inject only an external model adapter in deterministic tests. Browser checks cover the visible end-to-end workflow. Live model evaluation covers supported, clean, ambiguous and changed inputs, with its results reported separately. No existing code is available to reuse.

## Out of scope

Real customer data, live bank integration, outbound calling, real messages, automatic account or employee actions, enterprise SSO, production certification and claims of measured bank-wide savings. Optional audio playback is secondary to the working workflow.

## Further notes

The user has 4 hours 40 minutes at build start. Build fresh code in a new repository; do not reuse private Airlock code. Commit working checkpoints and push private GitHub backups. The one-slide pitch and demo instructions must distinguish working features from simulated bank systems.
