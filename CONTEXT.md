# Collections review

A collections quality team checks a collector's conversation and case note against the bank's supplied policy.

## Language

**Case**: The synthetic loan context, conversation, collector note and review history for one collections interaction.

**Source revision**: An immutable version of the evidence, supplied policy and payment directory used for a review.

**Analysis**: A model-generated assessment of one source revision, with validated source references. An analysis does not authorize an action.
_Avoid_: Verdict, compliance certificate.

**Finding**: An evidence-supported concern or an explicitly unresolved question in an analysis. A finding is not a determination of fraud.

**Proposal**: A reviewer's requested disposition of an analysis: escalation, information request, or dismissal. It is tied to the exact analysis and source revision.

**Decision**: A supervisor's recorded approval of a proposal, including their reason.

**Escalation**: A saved local follow-up record resulting from a supervisor decision. It is not an instruction sent to a real bank.

**Audit event**: A chronological record of an actor's completed operation and the versions it affected.
