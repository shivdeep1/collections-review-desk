# Collections Review Desk

Build from the agreed specification in `.scratch/collections-review/spec.md`. Use synthetic evidence only. Model credentials belong in the ignored `.env` file. Keep assertions about bank integrations and legal compliance limited to what the app actually implements.

## Agent skills

### Issue tracker

Use local Markdown tickets. Before creating or updating tickets, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the default skill labels. When triaging, read `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context project. Before changing domain behavior, read `CONTEXT.md` and `docs/agents/domain.md`.

## Verification

The public HTTP API is the agreed test boundary for persistence, permissions, evidence validation, version changes and idempotency. Exercise the browser for the complete review journey. Mock the external model only in automated deterministic tests; live AI evaluation must use the configured provider and report actual results separately.
