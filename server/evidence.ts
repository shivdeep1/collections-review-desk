import { assessmentSchema } from '../shared/domain.ts';
import type { Source, Citation, PaymentCheck } from '../shared/domain.ts';
import { AppError } from './errors.ts';

export function validateAssessment(raw: unknown, source: Source) {
  const parsed = assessmentSchema.safeParse(raw);
  const reject = (message: string): never => {
    throw new AppError(
      502,
      'UNGROUNDED_REVIEW',
      `${message} No report was saved. Please rerun the review.`,
    );
  };
  if (!parsed.success)
    return reject('The model returned a review that did not match the required structure.');
  const assessment = parsed.data;
  if (assessment.recommendedAction === 'dismiss' && assessment.missingEvidence.length > 0) {
    reject('The model recommended closure while also listing unresolved material evidence.');
  }
  if (
    assessment.recommendedAction === 'dismiss' &&
    (assessment.noteAssessment.status === 'contradicted' ||
      assessment.findings.some((finding) => finding.severity === 'concern'))
  ) {
    reject('The model recommended closure despite a supported concern or note contradiction.');
  }
  if (assessment.findings.some((finding) => /^none$/i.test(finding.title.trim())))
    reject('The model returned a placeholder instead of a substantive finding.');
  let validatedCitations = 0;
  function check(citation: Citation) {
    const text =
      citation.source === 'note' && citation.ref === 'note'
        ? source.collectorNote
        : citation.source === 'transcript'
          ? source.transcript.find((turn) => turn.id === citation.ref)?.text
          : undefined;
    if (!text || !text.includes(citation.quote))
      reject('The model cited text that is not present in the supplied source.');
    validatedCitations++;
  }
  assessment.noteAssessment.citations.forEach(check);
  if (
    assessment.noteAssessment.status === 'contradicted' &&
    !['note', 'transcript'].every((kind) =>
      assessment.noteAssessment.citations.some((c) => c.source === kind),
    )
  ) {
    reject('A claimed note contradiction was missing one side of its evidence.');
  }
  for (const finding of assessment.findings) {
    finding.citations.forEach(check);
    for (const id of finding.policyIds)
      if (!source.policy.clauses.some((p) => p.id === id))
        reject('The model referenced a policy clause that was not supplied.');
    if (
      finding.category === 'note_accuracy' &&
      !['note', 'transcript'].every((kind) => finding.citations.some((c) => c.source === kind))
    ) {
      reject('A note accuracy finding was missing its note or transcript evidence.');
    }
  }
  const normalize = (value: string) => value.trim().toLowerCase();
  const paymentChecks: PaymentCheck[] = assessment.paymentMentions.map((mention) => {
    check(mention.citation);
    const turn = source.transcript.find((t) => t.id === mention.citation.ref);
    if (
      mention.citation.source !== 'transcript' ||
      turn?.speaker !== 'Collector' ||
      !normalize(mention.citation.quote).includes(normalize(mention.destination))
    ) {
      reject('A payment destination was not supported by the collector’s cited statement.');
    }
    const listed =
      source.directory.available &&
      source.directory.destinations.some((d) => normalize(d) === normalize(mention.destination));
    const verifiable = source.directory.available && source.directory.complete;
    const needsSpelling = /\s|[^\x20-\x7e]/.test(mention.destination);
    return {
      ...mention,
      status: listed ? 'listed' : verifiable && !needsSpelling ? 'not_listed' : 'unverifiable',
      explanation: listed
        ? 'Matches a destination in the supplied directory. This does not verify who owns the account.'
        : needsSpelling
          ? 'The transcript contains spoken words or non-canonical spelling. Verify the exact payment identifier before comparing it with the directory.'
          : verifiable
            ? 'Absent from the supplied complete directory. Supervisor review is required; this is not proof of fraud.'
            : 'The directory is unavailable or incomplete. This destination cannot be verified from the supplied evidence.',
    };
  });
  for (const finding of assessment.findings) {
    if (
      finding.category === 'payment_destination' &&
      finding.severity === 'concern' &&
      !paymentChecks.some(
        (check) =>
          check.status === 'not_listed' &&
          finding.citations.some((c) => c.source === 'transcript' && c.ref === check.citation.ref),
      )
    ) {
      reject(
        'A claimed payment-directory concern had no verified identifier mismatch. Exact spelling must be established before a supported directory finding.',
      );
    }
  }
  if (
    assessment.noteAssessment.status === 'contradicted' &&
    paymentChecks.some((check) => check.status === 'not_listed') &&
    assessment.recommendedAction !== 'escalate'
  ) {
    reject(
      'The model did not recommend supervisor investigation despite a contradicted note and an exact destination absent from the complete directory.',
    );
  }
  return { assessment, paymentChecks, validatedCitations };
}
