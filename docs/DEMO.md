# Demo and submission

Open the [one-slide pitch](http://127.0.0.1:4317/pitch.html) and keep the [app](http://127.0.0.1:4317/) in another tab. The evidence, policy, customer and loan are synthetic. The app runs on this laptop; the GitHub link contains source code, not the local database or API keys.

## The reliable five-minute route

1. **Problem, 30 seconds.** “The collector note says the customer promised to pay. The customer actually disputes the amount and refuses to commit. A supervisor needs the call, the note and the bank's own policy before acting.”
2. **Audio evidence, 60 seconds.** Open **Ravi Mehta · Sarvam Hinglish**. Show the linked 42-second recording, play the refusal at **00:17**, and point to the collector's payment instruction at **00:22**. In **Audio evidence**, show Saaras's draft, the reviewer-assigned Collector/Customer roles and the corrected address. The accepted transcript is source revision 3. Close the modal without transcribing again.
3. **Review, 90 seconds.** The saved **report v3** was produced by **sarvam/sarvam-105b** from that accepted transcript. Click the refusal quotation to jump to its turn and playback. Show that code checked 20 exact references and compared `amit.collect@personal-pay` with the supplied complete directory. Say “absent from this supplied directory,” never “fraud proved.” Sarvam repeated related issues across eight findings; the reviewer and supervisor condensed them to the two material concerns in their reasons.
4. **Completed service, 60 seconds.** Scroll to **Decision saved**. The reviewer proposed investigation, the supervisor approved it, and the app created local follow-up **FU-96254B35**. Open the audit record and show the saved evidence revision, report and human decision. This is a simulated bank queue; it sent no bank message or payment instruction.
5. **Deployment, 45 seconds.** “For a bank pilot, ingest consented historical calls and case exports, review alongside supervisors, measure missed concerns and false alarms, then integrate the existing collections case system. Put the model in an approved environment with staff authentication and retention controls.”

The report and decision above are saved from a real earlier API run. Do not call them a fresh live result. Transcription and review buttons send new billable requests and are optional for the pitch. A later Sarvam rerun produced an unsupported citation and the server refused to save it; the earlier valid report and decision remained intact. If judges request a fresh run, say that provider responses can fail validation and show the error and retry behavior honestly. Gemini is an explicit backup in the model selector.

## What to submit

- Public code: [github.com/shivdeep1/collections-review-desk](https://github.com/shivdeep1/collections-review-desk).
- Upload: [one-page PDF](../public/collections-review-one-pager.pdf). It is one page and under 5 MB.
- Editable slide: [PowerPoint](../public/collections-review-submission.pptx).

The four-case smoke evaluation uses synthetic text scenarios and is recorded in [live-evaluation.json](verification/live-evaluation.json). It does not establish production accuracy. The local app database is excluded from Git, so judges browsing the repo must run the app and create or import synthetic evidence; the saved audio-case report and decision are demonstrated on this laptop.

## Commercial context

[Credgenics](https://www.credgenics.com/credgenics-raises-50-mn-funding-in-series-b) names ICICI among bank clients and reports a $50 million Series B. [Convin](https://www.convin.ai/en-us/case-studies/how-kotak-life-scaled-call-audits-from-5-to-100-with-agentic-ai) publishes a Kotak Life call-audit deployment. These vendor statements establish that banks and insurers buy in this category; they are not endorsements of this prototype.
