import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  History,
  Info,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Pencil,
  Play,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import type {
  Action,
  Actor,
  Analysis,
  CaseRecord,
  Citation,
  Health,
  Source,
} from '../shared/domain';
import { actionLabels } from '../shared/domain';
import { api } from './api';
import { Breadcrumb, Modal, Spinner, Status, dateTime, money } from './components';
import { SourceEditor } from './SourceEditor';
import { AudioEvidence, recordingUrl } from './AudioEvidence';
import { timestampSeconds } from '../shared/audio';

export function Workspace({
  item,
  actor,
  health,
  onBack,
  onRefresh,
  onSwitchRole,
}: {
  item: CaseRecord;
  actor: Actor;
  health: Health | null;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onSwitchRole: () => Promise<void>;
}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [editing, setEditing] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const player = useRef<HTMLAudioElement>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [tab, setTab] = useState<'transcript' | 'policy'>('transcript');
  const [highlight, setHighlight] = useState<Citation | null>(null);
  const latest = item.analyses.at(-1);
  const latestIsCurrent = latest?.sourceRevision === item.sourceRevision;
  const analysis = selectedAnalysis
    ? item.analyses.find((a) => a.id === selectedAnalysis)
    : latestIsCurrent
      ? latest
      : undefined;
  const current = Boolean(
    analysis && analysis.id === latest?.id && analysis.sourceRevision === item.sourceRevision,
  );
  const source = analysis?.source || item.source;
  const pending = item.proposals.find(
    (p) => p.status === 'pending' && p.analysisId === analysis?.id,
  );
  const decision = item.decisions.find((d) => d.analysisId === analysis?.id);
  const [action, setAction] = useState<Action>('escalate');
  const [reason, setReason] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [approvalKey, setApprovalKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    setAction(analysis?.assessment.recommendedAction || 'escalate');
    setReason('');
    setApprovalReason('');
    setReplacing(false);
    setHighlight(null);
    setApprovalKey(crypto.randomUUID());
  }, [analysis?.id, pending?.id]);
  useEffect(() => {
    if (busy !== 'analysis') return;
    setElapsed(0);
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  function cite(citation: Citation) {
    setHighlight(citation);
    setTab('transcript');
    setTimeout(
      () =>
        document
          .getElementById(citation.source === 'note' ? 'collector-note' : `turn-${citation.ref}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      30,
    );
  }
  function seek(time: string) {
    if (!player.current) return;
    player.current.currentTime = timestampSeconds(time);
    player.current
      .play()
      .catch(() => setError('Playback could not start. Use the recording controls to retry.'));
  }
  async function runReview() {
    setBusy('analysis');
    setError('');
    setSuccess('');
    try {
      const result = await api<{ analysis: Analysis }>(`/cases/${item.id}/analyses`, {
        method: 'POST',
        body: { sourceRevision: item.sourceRevision },
      });
      setSelectedAnalysis(null);
      await onRefresh();
      setSuccess(
        `Review v${result.analysis.version} saved. Inspect the source evidence before proposing an action.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.');
    } finally {
      setBusy('');
    }
  }
  async function propose(event: React.FormEvent) {
    event.preventDefault();
    if (!analysis) return;
    setBusy('proposal');
    setError('');
    setSuccess('');
    try {
      await api(`/cases/${item.id}/proposals`, {
        method: 'POST',
        body: { analysisId: analysis.id, sourceRevision: item.sourceRevision, action, reason },
      });
      await onRefresh();
      setReplacing(false);
      setSuccess('Proposal saved. A supervisor can now review and approve it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proposal failed.');
    } finally {
      setBusy('');
    }
  }
  async function approve(event: React.FormEvent) {
    event.preventDefault();
    if (!pending) return;
    setBusy('approval');
    setError('');
    setSuccess('');
    try {
      await api(`/cases/${item.id}/decisions`, {
        method: 'POST',
        body: { proposalId: pending.id, reason: approvalReason, idempotencyKey: approvalKey },
      });
      await onRefresh();
      setSuccess('Decision completed. The follow-up record and audit event are saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="workspace">
      <Breadcrumb onBack={onBack} current={item.id} />
      <div className="workspace-heading">
        <div>
          <div className="case-eyebrow">
            <span className="mono-label">{item.id}</span>
            <span className="synthetic-tag">Synthetic case</span>
          </div>
          <h1>
            {item.customer}
            <span className="business-title">{item.business}</span>
          </h1>
        </div>
        <div className="workspace-actions">
          <button
            className="button secondary"
            disabled={Boolean(busy)}
            onClick={() => setAudioOpen(true)}
          >
            <Play size={15} /> Audio evidence
          </button>
          <button className="button secondary" onClick={() => setAuditOpen(true)}>
            <History size={16} />
            Audit trail<span className="button-count">{item.audit.length}</span>
          </button>
          <button
            className="button primary"
            onClick={runReview}
            disabled={Boolean(busy) || !health?.configured}
          >
            {busy === 'analysis' ? (
              <Spinner label={`Reviewing · ${elapsed}s`} />
            ) : (
              <>
                <Play size={15} />
                {analysis ? 'Run new review' : 'Run AI review'}
              </>
            )}
          </button>
        </div>
      </div>
      <div className="case-facts">
        <div>
          <span>Review status</span>
          <Status status={item.status} />
        </div>
        <div>
          <span>Overdue amount</span>
          <strong>
            {money(item.overdueAmount)}
            <small>{item.daysPastDue} days past due</small>
          </strong>
        </div>
        <div>
          <span>Loan reference</span>
          <strong className="mono-value">{item.loanId}</strong>
        </div>
        <div>
          <span>Assigned to</span>
          <strong>
            {item.owner}
            <small>Quality review</small>
          </strong>
        </div>
      </div>
      {error && (
        <div className="error-box" role="alert">
          <TriangleAlert size={17} />
          <span>{error}</span>
          <button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="success-box" role="status">
          <Check size={16} />
          {success}
        </div>
      )}
      {!health?.configured && (
        <div className="notice">
          Live AI is not configured. Add the Gemini key to the server .env file and restart. Reports
          are never replaced with prewritten answers.
        </div>
      )}
      {analysis && !current && (
        <div className="notice warning">
          <History size={18} />
          <span>
            You are viewing report v{analysis.version} with its saved evidence revision{' '}
            {analysis.sourceRevision}. Current evidence is revision {item.sourceRevision}.{' '}
            {latest?.id !== analysis.id
              ? 'Select the latest report to take action.'
              : 'Run a new review before taking action.'}
          </span>
        </div>
      )}
      {!analysis && latest && !latestIsCurrent && (
        <div className="notice warning">
          <History size={18} />
          <span>
            Current inputs are revision {item.sourceRevision} and need a new review. Earlier
            findings and approvals remain in report history; they do not apply to these inputs.
          </span>
        </div>
      )}
      <div className="review-columns">
        <section className="evidence-panel panel">
          <div className="panel-heading">
            <div>
              <span className="section-icon">
                <MessageSquareText size={18} />
              </span>
              <h2>Source evidence</h2>
            </div>
            <button
              className="text-button"
              onClick={() => setEditing(true)}
              disabled={Boolean(busy)}
            >
              <Pencil size={14} />
              Edit inputs
            </button>
          </div>
          <div className="evidence-meta">
            <span>Revision {analysis?.sourceRevision || item.sourceRevision}</span>
            <span>{item.language}</span>
            <span>{source.audio ? 'Audio-derived transcript' : 'Supplied transcript'}</span>
          </div>
          {source.audio && (
            <div className="recording-player">
              <strong>Recording linked to this transcript</strong>
              <audio
                ref={player}
                key={source.audio.recordingId}
                controls
                preload="metadata"
                src={recordingUrl(item.id, source.audio.recordingId)}
                aria-label="Case recording playback"
              />
              <p>
                AI draft accepted by a reviewer. Timestamps are approximate. Click a turn's time to
                listen and verify.
              </p>
            </div>
          )}
          <div
            className={`collector-note ${highlight?.source === 'note' ? 'source-highlight' : ''}`}
            id="collector-note"
          >
            <div className="note-heading">
              <FileText size={15} />
              <h3>Collector’s case note</h3>
              {analysis && (
                <span className={`note-status ${analysis.assessment.noteAssessment.status}`}>
                  {analysis.assessment.noteAssessment.status === 'contradicted'
                    ? 'Contradicted'
                    : analysis.assessment.noteAssessment.status === 'supported'
                      ? 'Supported'
                      : 'Unresolved'}
                </span>
              )}
            </div>
            <p>
              <Highlighted
                text={source.collectorNote}
                quote={highlight?.source === 'note' ? highlight.quote : undefined}
              />
            </p>
          </div>
          <div className="evidence-tabs tabs">
            <button
              className={tab === 'transcript' ? 'selected' : ''}
              onClick={() => setTab('transcript')}
            >
              <MessageSquareText size={15} />
              Conversation<span>{source.transcript.length}</span>
            </button>
            <button className={tab === 'policy' ? 'selected' : ''} onClick={() => setTab('policy')}>
              <BookOpen size={15} />
              Policy & directory
            </button>
          </div>
          {tab === 'transcript' ? (
            <div className="transcript">
              <div className="transcript-caption">
                <span className="small-dot" />
                {source.audio
                  ? 'Analysis uses the accepted transcript. Quotes are checked against text, not verified against the recording.'
                  : 'Analysis uses this supplied text. No recording is linked to this revision.'}
              </div>
              {source.transcript.map((turn) => (
                <div
                  key={turn.id}
                  id={`turn-${turn.id}`}
                  className={`transcript-turn ${turn.speaker.toLowerCase()} ${highlight?.source === 'transcript' && highlight.ref === turn.id ? 'source-highlight' : ''}`}
                >
                  <div className="turn-avatar">
                    {turn.speaker === 'Collector'
                      ? 'A'
                      : turn.speaker === 'Customer'
                        ? item.customer[0]
                        : '?'}
                  </div>
                  <div className="turn-body">
                    <div className="turn-heading">
                      <strong>{turn.speaker}</strong>
                      {source.audio ? (
                        <button
                          className="time-link"
                          onClick={() => seek(turn.time)}
                          aria-label={`Play recording at ${turn.time}`}
                        >
                          <Play size={11} />
                          {turn.time}
                        </button>
                      ) : (
                        <span>{turn.time}</span>
                      )}
                      <span className="turn-ref">{turn.id}</span>
                    </div>
                    <p>
                      <Highlighted
                        text={turn.text}
                        quote={
                          highlight?.source === 'transcript' && highlight.ref === turn.id
                            ? highlight.quote
                            : undefined
                        }
                      />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="policy-content">
              <div className="notice">
                Authored demonstration policy. Evaluate against these supplied rules, not an assumed
                legal checklist.
              </div>
              <span className="mono-label">{source.policy.version}</span>
              {source.policy.clauses.map((p) => (
                <div className="policy-clause" key={p.id}>
                  <h3>
                    <span>{p.id}</span>
                    {p.title}
                  </h3>
                  <p>{p.text}</p>
                </div>
              ))}
              <div className="directory-box">
                <h3>Approved payment directory</h3>
                <span className="mono-label">{source.directory.version}</span>
                <p>
                  {source.directory.available
                    ? source.directory.complete
                      ? 'Supplied as complete for this review.'
                      : 'Supplied, but incomplete.'
                    : 'No directory supplied.'}
                </p>
                {source.directory.available &&
                  source.directory.destinations.map((d) => <code key={d}>{d}</code>)}
              </div>
            </div>
          )}
        </section>
        <div className="analysis-column">
          <section className="analysis-panel panel">
            <div className="panel-heading">
              <div>
                <span className="section-icon">
                  <FileSearch size={18} />
                </span>
                <h2>Review findings</h2>
              </div>
              {item.analyses.length > 0 && (
                <label className="version-select">
                  <span className="sr-only">Report version</span>
                  <select
                    value={analysis?.id || ''}
                    onChange={(e) => {
                      setSelectedAnalysis(e.target.value || null);
                      setSuccess('');
                    }}
                  >
                    {!latestIsCurrent && <option value="">Current inputs · not reviewed</option>}
                    {[...item.analyses].reverse().map((a) => (
                      <option key={a.id} value={a.id}>
                        Report v{a.version}
                        {a.id === latest?.id && latestIsCurrent ? ' · latest' : ' · history'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
              )}
            </div>
            {busy === 'analysis' ? (
              <div className="analysing-state" aria-live="polite">
                <div className="scan-symbol">
                  <FileSearch size={36} />
                </div>
                <h3>Reviewing the conversation</h3>
                <p>
                  Gemini is comparing the transcript, case note and supplied policy. Exact source
                  references are checked before the report is saved.
                </p>
                <Spinner label={`${elapsed}s elapsed`} />
                <span className="field-hint">A real model request is in progress.</span>
              </div>
            ) : analysis ? (
              <>
                <div className="analysis-summary">
                  <span className="eyebrow">MODEL ASSESSMENT · HUMAN REVIEW REQUIRED</span>
                  <p>{analysis.assessment.summary}</p>
                  <div className="analysis-metadata">
                    <span>
                      <Clock3 size={13} />
                      {(analysis.latencyMs / 1000).toFixed(1)}s
                    </span>
                    <span>{analysis.model}</span>
                    <span>
                      <CheckCheck size={14} />
                      {analysis.validatedCitations} references checked
                    </span>
                  </div>
                </div>
                <div className="note-comparison">
                  <div>
                    <ListChecks size={17} />
                    <h3>Does the case note match?</h3>
                  </div>
                  <p>{analysis.assessment.noteAssessment.explanation}</p>
                  <Citations
                    citations={analysis.assessment.noteAssessment.citations}
                    source={source}
                    onCite={cite}
                  />
                </div>
                <div className="findings-heading">
                  <h3>
                    {analysis.assessment.findings.length} finding
                    {analysis.assessment.findings.length === 1 ? '' : 's'} for review
                  </h3>
                  <span>Against {source.policy.version}</span>
                </div>
                {analysis.assessment.findings.length ? (
                  analysis.assessment.findings.map((finding, index) => (
                    <article
                      className={`finding-card ${finding.severity}`}
                      key={`${analysis.id}-${index}`}
                    >
                      <div className="finding-top">
                        <span className="finding-number">{String(index + 1).padStart(2, '0')}</span>
                        <span className={`severity ${finding.severity}`}>
                          {finding.severity === 'concern'
                            ? 'Supported concern'
                            : 'Needs more evidence'}
                        </span>
                      </div>
                      <h3>{finding.title}</h3>
                      <p>{finding.explanation}</p>
                      <Citations citations={finding.citations} source={source} onCite={cite} />
                      <div className="finding-policies">
                        {finding.policyIds.map((id) => (
                          <button key={id} onClick={() => setTab('policy')}>
                            <BookOpen size={12} />
                            {id} · {source.policy.clauses.find((p) => p.id === id)?.title}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="clear-review">
                    <ShieldCheck size={22} />
                    <div>
                      <strong>No policy concern identified</strong>
                      <p>
                        This model review found no concern in the supplied evidence. A supervisor
                        still decides how to close the case.
                      </p>
                    </div>
                  </div>
                )}
                {analysis.paymentChecks.length > 0 && (
                  <div className="payment-checks">
                    <h3>
                      Payment destination check<span>Directory comparison</span>
                    </h3>
                    {analysis.paymentChecks.map((payment, index) => (
                      <div key={index} className="payment-check">
                        <div>
                          <code>{payment.destination}</code>
                          <span className={`payment-status ${payment.status}`}>
                            {payment.status === 'listed'
                              ? 'Listed'
                              : payment.status === 'not_listed'
                                ? 'Not listed'
                                : 'Unverifiable'}
                          </span>
                        </div>
                        <p>{payment.explanation}</p>
                        <Citations citations={[payment.citation]} source={source} onCite={cite} />
                      </div>
                    ))}
                  </div>
                )}
                {analysis.assessment.missingEvidence.length > 0 && (
                  <div className="missing-evidence">
                    <h3>
                      <Info size={16} />
                      What is still missing
                    </h3>
                    <ul>
                      {analysis.assessment.missingEvidence.map((missing, i) => (
                        <li key={i}>{missing}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="review-provenance">
                  <LockKeyhole size={12} />
                  <span>
                    Report v{analysis.version} · source r{analysis.sourceRevision} ·{' '}
                    {dateTime(analysis.createdAt)}
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-analysis">
                <div className="empty-illustration">
                  <FileSearch size={38} />
                  <span>
                    <MessageSquareText size={16} />
                  </span>
                </div>
                <h3>
                  From conversation to a<br />
                  defensible next step.
                </h3>
                <p>
                  Run a live review to compare the collector’s note with the customer’s words and
                  the supplied bank policy.
                </p>
                <div className="empty-checklist">
                  <span>
                    <Check size={15} />
                    Exact quotations with source references
                  </span>
                  <span>
                    <Check size={15} />
                    Payment directory comparison
                  </span>
                  <span>
                    <Check size={15} />
                    Missing evidence kept explicit
                  </span>
                </div>
                <button
                  className="button primary"
                  onClick={runReview}
                  disabled={Boolean(busy) || !health?.configured}
                >
                  <Play size={14} />
                  Run AI review
                  <ArrowRight size={16} />
                </button>
                <span className="empty-footnote">Nothing is escalated automatically.</span>
              </div>
            )}
          </section>
          {analysis && busy !== 'analysis' && (
            <section className="action-panel panel">
              <div className="panel-heading">
                <div>
                  <span className="section-icon">
                    <ShieldCheck size={18} />
                  </span>
                  <h2>{!current ? `History · report v${analysis.version}` : 'Next step'}</h2>
                </div>
                <span className="approval-label">
                  <LockKeyhole size={12} />
                  {!current
                    ? 'Historical record'
                    : decision
                      ? 'Decision saved'
                      : 'Supervisor approval'}
                </span>
              </div>
              {decision ? (
                <div className="completed-action">
                  <span className="completion-icon">
                    <Check size={23} />
                  </span>
                  <h3>{actionLabels[decision.action]}</h3>
                  <p>{decision.reason}</p>
                  <div className="follow-up-record">
                    <span>LOCAL FOLLOW-UP RECORD</span>
                    <strong>
                      {decision.followUp.id}
                      <span className="record-status">{decision.followUp.status}</span>
                    </strong>
                    <p>{decision.followUp.queue}</p>
                  </div>
                  <div className="decision-by">
                    Approved by {decision.actor.name}
                    <br />
                    {dateTime(decision.createdAt)}
                  </div>
                  <button className="text-button" onClick={() => setAuditOpen(true)}>
                    View the saved audit record
                    <ArrowRight size={14} />
                  </button>
                  <p className="field-hint">
                    Saved in this app. No action was sent to a real bank.
                  </p>
                </div>
              ) : !current ? (
                <div className="action-content">
                  <div className="notice warning">
                    This report cannot authorise an action. Review the latest source revision first.
                  </div>
                </div>
              ) : pending && !replacing ? (
                <div className="action-content">
                  <div className="pending-label">
                    <Clock3 size={15} />
                    Awaiting supervisor decision
                  </div>
                  <h3>{actionLabels[pending.action]}</h3>
                  <p className="proposal-reason">{pending.reason}</p>
                  <div className="field-hint">
                    Proposed by {pending.actor.name} · report v{analysis.version} · source r
                    {pending.sourceRevision}
                  </div>
                  {actor.role === 'supervisor' ? (
                    <form onSubmit={approve}>
                      <label>
                        Supervisor decision reason
                        <textarea
                          required
                          minLength={10}
                          maxLength={2000}
                          rows={3}
                          value={approvalReason}
                          onChange={(e) => {
                            setApprovalReason(e.target.value);
                            setApprovalKey(crypto.randomUUID());
                          }}
                          placeholder="Record what you checked and why this action is appropriate."
                        />
                      </label>
                      <button
                        className="button primary full-width"
                        disabled={Boolean(busy) || approvalReason.trim().length < 10}
                      >
                        {busy === 'approval' ? (
                          <Spinner label="Saving decision" />
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            Approve and save action
                          </>
                        )}
                      </button>
                      <p className="field-hint">
                        Applies only to this proposal and report version. Repeated submissions
                        create one action.
                      </p>
                    </form>
                  ) : (
                    <div className="supervisor-handoff">
                      <LockKeyhole size={18} />
                      <p>
                        Your reviewer role can prepare this action. A supervisor must approve it.
                      </p>
                      <button
                        className="button secondary full-width"
                        disabled={Boolean(busy)}
                        onClick={onSwitchRole}
                      >
                        Switch to supervisor demo persona
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                  <button
                    className="text-button revise-proposal"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      setReplacing(true);
                      setAction(pending.action);
                      setReason(pending.reason);
                    }}
                  >
                    Revise proposed action
                    <Pencil size={13} />
                  </button>
                </div>
              ) : (
                <form className="action-content" onSubmit={propose}>
                  <div className="recommendation">
                    <span>MODEL SUGGESTION</span>
                    <h3>{actionLabels[analysis.assessment.recommendedAction]}</h3>
                    <p>{analysis.assessment.recommendationReason}</p>
                  </div>
                  <label>
                    Proposed action
                    <select value={action} onChange={(e) => setAction(e.target.value as Action)}>
                      {Object.entries(actionLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reviewer’s reason
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain your proposed action using the evidence above."
                    />
                  </label>
                  <button
                    className="button primary full-width"
                    disabled={Boolean(busy) || reason.trim().length < 10}
                  >
                    {busy === 'proposal' ? (
                      <Spinner label="Saving proposal" />
                    ) : (
                      <>
                        <Send size={15} />
                        {replacing ? 'Save revised proposal' : 'Send for supervisor approval'}
                      </>
                    )}
                  </button>
                  {replacing && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setReplacing(false)}
                    >
                      Keep existing proposal
                    </button>
                  )}
                  <p className="field-hint">
                    The proposal saves your intent. It does not execute a bank action.
                  </p>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
      {editing && (
        <SourceEditor
          item={item}
          template={item.source}
          onClose={() => setEditing(false)}
          onSave={async (source) => {
            await api(`/cases/${item.id}/source`, {
              method: 'PUT',
              body: { expectedRevision: item.sourceRevision, source },
            });
            await onRefresh();
            setSelectedAnalysis(null);
            setSuccess('Evidence saved. Run a new review to assess the updated inputs.');
          }}
        />
      )}
      {audioOpen && (
        <AudioEvidence
          item={item}
          onClose={() => {
            setAudioOpen(false);
            void onRefresh().catch((err) => setError(err.message));
          }}
          onAdopt={async (nextSource) => {
            await api(`/cases/${item.id}/source`, {
              method: 'PUT',
              body: { expectedRevision: item.sourceRevision, source: nextSource },
            });
            await onRefresh();
            setSelectedAnalysis(null);
            setSuccess(
              'Transcript saved as a new revision. Run an AI review to compare it with the collector note.',
            );
          }}
        />
      )}
      {auditOpen && (
        <Modal title="Case audit trail" onClose={() => setAuditOpen(false)}>
          <div className="modal-content">
            <div className="audit-top">
              <div>
                <span className="mono-label">{item.id}</span>
                <p>Saved events, actors and review versions.</p>
              </div>
              <a className="button secondary" href={`/api/cases/${item.id}/export`} download>
                <Download size={15} />
                Export case
              </a>
            </div>
            <div className="notice">
              This is a local application audit log. It is not a certified tamper-proof bank
              archive.
            </div>
            {item.audit.length === 0 ? (
              <div className="empty-search">
                No review activity yet. Run the first analysis to begin the record.
              </div>
            ) : (
              <ol className="audit-timeline">
                {[...item.audit].reverse().map((event) => (
                  <li key={event.id}>
                    <span className="audit-dot">
                      {event.type === 'decision_completed' ? (
                        <ShieldCheck size={15} />
                      ) : event.type === 'analysis_completed' ? (
                        <FileCheck2 size={15} />
                      ) : (
                        <History size={15} />
                      )}
                    </span>
                    <div>
                      <h3>{event.type.replaceAll('_', ' ')}</h3>
                      <p>{event.detail}</p>
                      <span>
                        {event.actor.name} · {event.actor.role} · source r{event.sourceRevision}
                      </span>
                      <time>{dateTime(event.at)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <details className="provenance-details">
              <summary>
                {item.sourceHistory.length} saved source revision
                {item.sourceHistory.length === 1 ? '' : 's'}
              </summary>
              {[...item.sourceHistory].reverse().map((revision) => (
                <details className="source-revision" key={revision.revision}>
                  <summary>
                    Revision {revision.revision} · {dateTime(revision.at)}
                  </summary>
                  <p>
                    {revision.actor.name} · Policy {revision.source.policy.version} · Directory{' '}
                    {revision.source.directory.version}
                  </p>
                  <h3>Collector note</h3>
                  <p>{revision.source.collectorNote}</p>
                  <h3>Conversation</h3>
                  {revision.source.transcript.map((turn) => (
                    <p key={turn.id}>
                      <strong>
                        {turn.time} {turn.speaker}:
                      </strong>{' '}
                      {turn.text}
                    </p>
                  ))}
                </details>
              ))}
              <p className="field-hint">
                Export the case for complete policy, directory and evidence snapshots.
              </p>
            </details>
            {analysis && (
              <details className="provenance-details">
                <summary>Report provenance</summary>
                <dl>
                  <dt>Model</dt>
                  <dd>{analysis.model}</dd>
                  <dt>Prompt</dt>
                  <dd>{analysis.promptVersion}</dd>
                  <dt>Loan context sent to model</dt>
                  <dd>
                    {analysis.loanContext
                      ? `${money(analysis.loanContext.overdueAmount)} overdue · ${analysis.loanContext.daysPastDue} days past due · ${analysis.loanContext.loanType}`
                      : 'Not included in this earlier report. Run a new review to include it.'}
                  </dd>
                  <dt>Source SHA-256</dt>
                  <dd className="hash">{analysis.sourceHash}</dd>
                  <dt>Analysis ID</dt>
                  <dd className="hash">{analysis.id}</dd>
                </dl>
              </details>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Highlighted({ text, quote }: { text: string; quote?: string }) {
  if (!quote || !text.includes(quote)) return <>{text}</>;
  const index = text.indexOf(quote);
  return (
    <>
      {text.slice(0, index)}
      <mark>{quote}</mark>
      {text.slice(index + quote.length)}
    </>
  );
}
function Citations({
  citations,
  source,
  onCite,
}: {
  citations: Citation[];
  source: Source;
  onCite: (citation: Citation) => void;
}) {
  return (
    <div className="citations">
      {citations.map((citation, index) => {
        const turn = source.transcript.find((t) => t.id === citation.ref);
        return (
          <button
            key={index}
            className="citation"
            onClick={() => onCite(citation)}
            title="Locate this exact quote in the supplied source"
          >
            <span className="citation-label">
              {citation.source === 'note' ? (
                <FileText size={12} />
              ) : (
                <MessageSquareText size={12} />
              )}
              {citation.source === 'note' ? 'Case note' : `${turn?.time} · ${turn?.speaker}`}
              <ArrowUpRight size={12} />
            </span>
            <q>{citation.quote}</q>
          </button>
        );
      })}
    </div>
  );
}
