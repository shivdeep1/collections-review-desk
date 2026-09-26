import { mkdirSync, writeFileSync } from 'node:fs';
import { PROMPT_VERSION } from '../server/model.ts';
import { reviewProviders } from '../server/review-provider.ts';
import { validateAssessment } from '../server/evidence.ts';
import { seedCases } from '../server/fixtures.ts';
import { AppError } from '../server/errors.ts';

// Expected outcomes are held here, never in the model request or application fixtures.
const seeds = seedCases();
const changed = structuredClone(seeds[0].source);
changed.transcript[1].text = 'Haan, statement check kar liya. INR 18,500 amount sahi hai.';
changed.transcript[3].text =
  'Haan, main INR 18,500 Friday, 2 October 2026 tak pay kar doonga. Aaj INR 5,000 part-payment karne ko taiyaar hoon.';
changed.transcript[4].text =
  'Aap INR 5,000 collections@demo-bank par transfer kar sakte hain. Yeh official destination hai.';
changed.transcript[5].text =
  'Theek hai, main official destination collections@demo-bank use karoonga.';
changed.transcript[6].text = 'Thank you. Main aapka commitment record kar raha hoon.';
changed.transcript[7].text = 'Haan, amount aur Friday ki date confirmed hai.';
const scenarios = [
  {
    name: 'supported concern',
    source: seeds[0].source,
    expected: { note: 'contradicted', payment: 'not_listed', action: 'escalate' },
  },
  {
    name: 'compliant conversation',
    source: seeds[1].source,
    expected: { note: 'supported', payment: 'listed', action: 'dismiss' },
  },
  {
    name: 'missing prior evidence',
    source: seeds[2].source,
    expected: { action: 'request_information' },
  },
  {
    name: 'held-out changed conversation',
    source: changed,
    expected: { note: 'supported', payment: 'listed', action: 'dismiss' },
  },
];
const model = reviewProviders().model;
const results: unknown[] = [];
let failed = false;
for (const scenario of scenarios.filter((s) => !process.argv[2] || s.name === process.argv[2])) {
  const started = Date.now();
  try {
    const item = seeds[scenarios.indexOf(scenario)] || seeds[0];
    const loanContext = {
      loanType: item.loanType,
      overdueAmount: item.overdueAmount,
      daysPastDue: item.daysPastDue,
      currency: 'INR' as const,
    };
    let result!: Awaited<ReturnType<typeof model.review>>;
    let validated!: ReturnType<typeof validateAssessment>;
    let attempts = 0;
    let feedback = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      attempts++;
      try {
        result = await model.review(scenario.source, loanContext, { feedback });
        validated = validateAssessment(result.assessment, scenario.source);
        break;
      } catch (error) {
        if (
          attempt === 0 &&
          error instanceof AppError &&
          ['UNGROUNDED_REVIEW', 'MODEL_INCOMPLETE'].includes(error.code)
        ) {
          feedback = error.message;
          continue;
        }
        throw error;
      }
    }
    const checks = {
      note:
        !scenario.expected.note ||
        validated.assessment.noteAssessment.status === scenario.expected.note,
      payment:
        !scenario.expected.payment ||
        validated.paymentChecks.some((p) => p.status === scenario.expected.payment),
      action: validated.assessment.recommendedAction === scenario.expected.action,
      zeroConcernOnClean:
        !['compliant conversation', 'held-out changed conversation'].includes(scenario.name) ||
        validated.assessment.findings.filter((f) => f.severity === 'concern').length === 0,
      supportedConcernLabel:
        scenario.name !== 'supported concern' ||
        validated.assessment.findings.some(
          (f) => f.category === 'note_accuracy' && f.severity === 'concern',
        ),
      missingEvidenceNamed:
        scenario.name !== 'missing prior evidence' ||
        validated.assessment.missingEvidence.length > 0,
    };
    const passed = Object.values(checks).every(Boolean);
    if (!passed) failed = true;
    const record = {
      scenario: scenario.name,
      model: result.model,
      passed,
      latencyMs: Date.now() - started,
      attempts,
      checks,
      ...validated,
    };
    results.push(record);
    console.log(
      JSON.stringify({
        scenario: scenario.name,
        passed,
        checks,
        action: validated.assessment.recommendedAction,
        note: validated.assessment.noteAssessment.status,
        findings: validated.assessment.findings.length,
        validatedCitations: validated.validatedCitations,
        latencyMs: record.latencyMs,
        attempts,
      }),
    );
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : 'Unknown failure';
    results.push({ scenario: scenario.name, passed: false, error: message });
    console.log(JSON.stringify({ scenario: scenario.name, passed: false, error: message }));
  }
}
mkdirSync('docs/verification', { recursive: true });
writeFileSync(
  'docs/verification/live-evaluation.json',
  JSON.stringify(
    {
      ranAt: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      scope:
        'Four synthetic scenarios; one run each. This is a smoke evaluation, not a production accuracy estimate. Only exact citations and supplied policy references are validated mechanically.',
      results,
    },
    null,
    2,
  ),
);
if (failed) process.exitCode = 1;
