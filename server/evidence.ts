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
    return {
      ...mention,
      status: listed ? 'listed' : verifiable ? 'not_listed' : 'unverifiable',
      explanation: listed
        ? 'Matches a destination in the supplied directory. This does not verify who owns the account.'
        : verifiable
          ? 'Absent from the supplied complete directory. Supervisor review is required; this is not proof of fraud.'
          : 'The directory is unavailable or incomplete. This destination cannot be verified from the supplied evidence.',
    };
  });
  return { assessment, paymentChecks, validatedCitations };
}
