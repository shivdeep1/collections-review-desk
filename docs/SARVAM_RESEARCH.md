# Sarvam audio evaluation

Researched 26 September 2026. This note distinguishes documented provider capabilities, reported experience, and recommendations for this prototype. It does not record a completed live Sarvam test.

## Recommendation

Try Sarvam for the existing recording-to-review workflow. Use Saaras for transcription and Bulbul to generate a more natural synthetic demonstration recording. Keep the human transcript acceptance step and the existing review engine. These are separate jobs: better speech synthesis does not prove more accurate transcription or review.

The current sample voice comes from Windows speech synthesis in `scripts/make-demo-audio.ps1`. Gemini transcribes and reviews it; Gemini did not generate that robotic voice. Replacing the synthetic recording with Bulbul output directly addresses the user's complaint.

Do not add outbound live calling in this iteration. That is a different product workflow with telephony, interruption handling and conversation state. The existing product reviews evidence from completed calls. A Hindi-English recording processed through the complete workflow demonstrates the relevant capability without claiming a calling service exists.

## Documented capabilities and cost

| Component | What is documented | Consequence for this prototype |
| --- | --- | --- |
| Saaras v4 and v3 | 23 languages, comprising 22 Indian languages and English. v4 adds Global English; v3 remains the documented default/recommended model. Five output modes include verbatim and code-mixed transcription. | Say "supports transcription through a provider with 23-language coverage", then separately list languages actually tested. Do not say "all languages". |
| Saaras batch | Speaker diarization and segment timestamps. Up to two hours per file. Speaker identifiers do not establish collector/customer identity. | Use batch for the existing 53-second recording. Ask the reviewer to assign roles; preserve uncertainty. |
| Saaras REST | Maximum 30 seconds per request; diarization is batch-only. | Do not send the whole sample through the short REST endpoint or invent speakers from alternating turns. |
| Bulbul v3 | 11 languages, 10 Indian languages plus English; 30+ voices, 2,500 characters per REST request, up to 48 kHz. | Generate separate collector/customer turns using distinct stock voices. Keep the recording labelled synthetic. |

Sources: [Saaras model documentation](https://docs.sarvam.ai/api/getting-started/models/saaras), [batch API](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/batch-api), [speaker diarization](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/how-to/enable-speaker-diarization), [Bulbul documentation](https://docs.sarvam.ai/api/getting-started/models/bulbul).

Current published prices are INR 30/hour for standard STT, INR 45/hour for batch STT with diarization, and INR 3 per 1,000 characters for TTS. At those rates, a 53-second diarized recording costs about INR 0.66, before any tax or billing rounding. A 1,000-character generated sample costs INR 3. The screenshot's INR 30/hour catalogue price does not include the separate diarization rate. [Official pricing](https://www.sarvam.ai/api-pricing).

Some older Sarvam marketing pages claim word-level timestamps or different limits and prices. The current API documentation explicitly says timestamps are sentence/phrase chunks, not individual words. Use the API documentation for implementation and the pricing page for cost. [Current batch documentation](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/batch-api).

## What the reviews establish

Sarvam reports a blind listening study conducted by Josh Talks with more than 500 annotators and 20,000 votes across 11 languages. Its published results place Bulbul v3 first for 8 kHz telephony audio; ElevenLabs v3 alpha leads general full-band audio quality. This is useful evidence for Indian telephone speech, but it is vendor-published evaluation. The page does not establish funding independence. It is not a comparison against our Gemini transcription setup. [Sarvam's Bulbul v3 study](https://www.sarvam.ai/blogs/bulbul-v3).

Sarvam's Saaras v4 release reports results on Indian-language and English speech benchmarks. These remain vendor-reported results. They justify testing v4, not a blanket claim that it will outperform Gemini on every call or language. [Saaras v4 release and evaluation](https://www.sarvam.ai/blogs/introducing-saaras-v4).

Firsthand developer reviews are mixed. A developer building a phone agent praised Hinglish output but reported TTS latency over one second in their integration. Another reported variable transcription and pronunciation across repeated requests. Neither report supplies a controlled benchmark or enough configuration detail to generalize to this app. They are reasons to measure response times and inspect transcripts ourselves. [Phone-agent developer report](https://www.reddit.com/r/LocalLLM/comments/1tm3xxa/does_anyone_here_used_sarvam_ai_why_its_latency/), [repeated-request inconsistency report](https://www.reddit.com/r/SarvamAI/comments/1tuj7io/sarvam_ai_inconsistentency/).

A recent work-use discussion includes a developer using Sarvam speech-to-text followed by another LLM, which resembles our proposed architecture. Other users praise Hindi transcription and regional voices; comments also report disappointing translation. These are unverified anecdotes, not enterprise references or current model benchmarks. [Firsthand work-use discussion](https://www.reddit.com/r/AI_India/comments/1wkv0jh/sarvam_ai_used_at_work/).

An original research preprint comparing Indic TTS accent dimensions across Hindi, Telugu and Tamil found that performance depends on the dimension measured. It includes Sarvam Bulbul, but is a pilot benchmark and a companion to another voice system. It does not establish universal superiority or production readiness. [PSP benchmark preprint](https://arxiv.org/abs/2604.25476).

## BFSI relevance

A Sarvam customer story dated 21 September 2026 names Mahindra Finance and reports over one crore calls across sales, collections and employee engagement. It says calls are recorded and analyzed, with results connected to CRM, loan servicing and collections systems. This is a concrete named NBFC reference for both voice automation and downstream call analysis. Treat scale and outcome claims as vendor-reported customer evidence, not our independently audited result. The story's 12-language agent deployment should not be substituted for Bulbul API's documented 11-language list. [Mahindra Finance customer story](https://www.sarvam.ai/stories/mahindra-finance-voice-agents).

Sarvam also describes a joint R&D lab with IDFC FIRST Bank. This establishes a bank partnership; it does not demonstrate that our collections-review use case is deployed at that bank. [IDFC FIRST partnership](https://www.sarvam.ai/partnerships/idfc-first).

Sarvam's own call analytics workflow accepts recordings, transcribes with speaker attribution and produces LLM insights. That supports the architectural fit of our recording-review workflow. Our added value must remain evidence-linked findings, a checked collector note, reviewer corrections and a recorded supervisor decision. The speech API alone is not our differentiation. [Sarvam call analytics](https://www.sarvam.ai/call-analytics).

## What to test before changing the pitch

1. Transcribe the existing English sample and a new Hindi-English synthetic sample. Preserve original audio and raw provider output.
2. Check who said each sentence, the disputed amount, the rejected promise to pay, dates and the off-channel payment instruction. A fluent transcript that reverses a refusal is a failed test.
3. Listen to the new Bulbul voices. Judge pronunciation and naturalness separately from Saaras transcription accuracy.
4. Run the accepted transcript through the existing evidence review, supervisor decision and saved follow-up. Record actual latency and any corrections.
5. Claim only the languages and end-to-end results we actually exercised. Provider coverage can be mentioned as provider capability, not completed validation.
