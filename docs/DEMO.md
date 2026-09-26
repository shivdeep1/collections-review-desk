# Seven-minute demonstration

Use the local app at http://127.0.0.1:4317. Open the one-slide pitch before starting. Leave the API key out of the screen share. All names, loans, policies and conversations in the app are synthetic.

The current laptop already contains rehearsal history. Ravi's report v3 uses the original inaccurate note and the selected Gemini 3 Flash Preview model. Report v2 shows the corrected-note experiment. Report v1 retains the earlier approved follow-up. You can run a new review and complete a fresh decision without deleting this history.

## 0:00–0:45: The task

“A collector records that a customer promised to pay. But the customer actually disputed the amount. The supervisor has to compare the conversation, the case note and bank policy, then record a defensible next step. This desk completes that review workflow.”

Explain that funded vendors such as Credgenics and Convin already sell into collections and BFSI call quality. This validates spending in the category. It does not establish that this prototype is unique or that ICICI lacks such tools.

## 0:45–2:15: Evidence and live review

Open Ravi Mehta. Show the collector note first. Then point to the customer at 00:25 refusing to promise payment. Run a new AI review. The actual Gemini request normally takes several seconds. The elapsed indicator is real.

The report should identify the note discrepancy and the collector's proposed payment destination. Click a quote to locate it in the transcript. Open the policy tab. Explain that the code checks exact quotations and directory membership; the model interprets the conversation.

Say “absent from the supplied directory,” not “proven fraudulent.”

## 2:15–3:30: The result responds to the inputs

Choose Edit inputs. For a short change, replace the collector note with:

> Customer disputed the INR 18,500 amount and did not promise to pay. Customer refused an immediate transfer and requested a statement and official payment details. Collector suggested amit.collect@personal-pay, which requires verification against the bank directory.

Save a new revision and run a new review. The inaccurate-promise finding should disappear or change because the corrected note now describes the conversation. The payment-destination concern should remain. Use the report selector to show that the earlier report retains its original evidence.

For a complete clean-input demonstration, use Nisha's case. Changing only one detail does not make all other concerns disappear.

## 3:30–5:00: Complete the service

Choose the appropriate next step and write your own reviewer reason. For example:

> Investigate the payment destination cited at 00:36 against the complete supplied directory. The corrected note acknowledges the customer's dispute.

Send for supervisor approval. Switch to the explicitly labelled supervisor demo persona. Record why the action is appropriate and approve. Show the saved follow-up ID, queue and audit event. Reload and reopen the case to show that the action persists.

If this report already has a completed decision from rehearsal, run a new review first. Completed decisions remain immutable.

## 5:00–6:00: Clean and ambiguous inputs

Nisha's conversation supports its note and uses a listed destination. Farah's conversation does not establish a definite commitment and lacks the earlier recording and directory. The model should name those gaps rather than invent misconduct.

The evaluation file records actual results for these cases and a held-out changed conversation. It is a small smoke evaluation, not a production accuracy claim.

## 6:00–7:00: Bank deployment

“The app already saves the review, approval and follow-up. For a bank pilot, we would connect its existing call transcripts and case exports, use an approved model environment and authenticated staff roles, and measure missed concerns, false alarms and supervisor review time.”

Your NPCI and Airlock experience supports the focus on controlled actions: the proposed action has an owner, exact evidence, approval and a completion record. This is a bank collections workflow; it does not depend on an NPCI integration.

## If the network or free quota fails

The app displays the actual error and preserves the existing records. You may show an earlier saved report and clearly call it a previous live run. Do not present a saved report as a fresh result. Avoid rerunning all evaluation cases immediately before presenting if free-tier quota is limited.

## Sources for the commercial context

- [Credgenics: $50 million Series B and named bank clients](https://www.credgenics.com/credgenics-raises-50-mn-funding-in-series-b)
- [Convin: Kotak Life call-audit case study](https://www.convin.ai/en-us/case-studies/how-kotak-life-scaled-call-audits-from-5-to-100-with-agentic-ai)
- [Kalaari: Convin's $6.5 million Series A](https://kalaari.com/insights-from-the-fronlines/convin-raises-6-5-million-series-a-2)

Vendor statements support category validation. They are not measured results from this prototype or endorsements of it.
