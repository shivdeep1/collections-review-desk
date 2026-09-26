import { useState } from 'react';
import { Save, FileUp, Plus, Info } from 'lucide-react';
import type { CaseRecord, Source } from '../shared/domain';
import { formatTranscript, parseTranscript, sourceSchema } from '../shared/domain';
import { Modal, Spinner } from './components';

export type NewCaseDetails = {
  customer: string;
  business: string;
  overdueAmount: number;
  daysPastDue: number;
  language: string;
  synthetic: true;
  source: Source;
};

export function SourceEditor({
  item,
  template,
  onClose,
  onSave,
}: {
  item?: CaseRecord;
  template: Source;
  onClose: () => void;
  onSave: (source: Source, details?: NewCaseDetails) => Promise<void>;
}) {
  const [source, setSource] = useState<Source>(() => structuredClone(item?.source || template));
  const [transcript, setTranscript] = useState(item ? formatTranscript(item.source) : '');
  const [note, setNote] = useState(item?.source.collectorNote || '');
  const [customer, setCustomer] = useState('');
  const [business, setBusiness] = useState('');
  const [amount, setAmount] = useState('10000');
  const [days, setDays] = useState('10');
  const [language, setLanguage] = useState('English / Hinglish');
  const [confirmed, setConfirmed] = useState(Boolean(item));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (!confirmed) throw new Error('Confirm that this case contains synthetic data only.');
      const parsed = sourceSchema.safeParse({
        ...source,
        transcript: parseTranscript(transcript),
        collectorNote: note,
      });
      if (!parsed.success)
        throw new Error(
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        );
      setSaving(true);
      await onSave(
        parsed.data,
        item
          ? undefined
          : {
              customer,
              business,
              overdueAmount: Number(amount),
              daysPastDue: Number(days),
              language,
              synthetic: true,
              source: parsed.data,
            },
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The evidence could not be saved.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={item ? 'Edit case evidence' : 'New synthetic case'}
      onClose={() => !saving && onClose()}
      wide
    >
      <form onSubmit={save} className="editor-form">
        <div className="notice">
          <Info size={17} />
          <span>
            {item
              ? 'Saving changes creates a new source revision. Existing reports remain in history, and pending approvals become invalid.'
              : 'Use made-up customer details and conversations only. Reviews send the supplied evidence to Gemini.'}
          </span>
        </div>
        {!item && (
          <div className="form-grid">
            <label>
              Customer name
              <input
                required
                maxLength={100}
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Synthetic customer"
              />
            </label>
            <label>
              Business
              <input
                required
                maxLength={100}
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="Synthetic business"
              />
            </label>
            <label>
              Overdue amount (INR)
              <input
                required
                type="number"
                min={0}
                max={100000000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Days past due
              <input
                required
                type="number"
                min={0}
                max={3650}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </label>
            <label>
              Language
              <input required value={language} onChange={(e) => setLanguage(e.target.value)} />
            </label>
          </div>
        )}
        <div className="label-row">
          <label htmlFor="transcript-input">Conversation transcript</label>
          <label className="upload-button">
            <FileUp size={15} /> Import .txt
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 120000) {
                  setError('Choose a transcript smaller than 120 KB.');
                  return;
                }
                setTranscript(await file.text());
              }}
            />
          </label>
        </div>
        <textarea
          id="transcript-input"
          required
          className="transcript-input"
          rows={10}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            '[00:00] Collector: Hello, may we discuss your instalment?\n[00:08] Customer: Yes, I can speak now.'
          }
        />
        <p className="field-hint">
          One turn per line: [00:00] Collector: words or [00:00] Customer: words. Original English,
          Hindi or Hinglish text is supported.
        </p>
        <label>
          Collector’s case note
          <textarea
            required
            rows={3}
            maxLength={8000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="The note recorded after the conversation"
          />
        </label>
        <details className="edit-policy">
          <summary>Policy and payment directory</summary>
          <label>
            Policy version
            <input
              required
              value={source.policy.version}
              onChange={(e) =>
                setSource({ ...source, policy: { ...source.policy, version: e.target.value } })
              }
            />
          </label>
          {source.policy.clauses.map((clause, index) => (
            <label key={clause.id}>
              {clause.id} · {clause.title}
              <textarea
                rows={3}
                required
                value={clause.text}
                onChange={(e) =>
                  setSource({
                    ...source,
                    policy: {
                      ...source.policy,
                      clauses: source.policy.clauses.map((c, i) =>
                        i === index ? { ...c, text: e.target.value } : c,
                      ),
                    },
                  })
                }
              />
            </label>
          ))}
          <label>
            Directory version
            <input
              required
              value={source.directory.version}
              onChange={(e) =>
                setSource({
                  ...source,
                  directory: { ...source.directory, version: e.target.value },
                })
              }
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={source.directory.available}
              onChange={(e) =>
                setSource({
                  ...source,
                  directory: { ...source.directory, available: e.target.checked },
                })
              }
            />{' '}
            Directory supplied
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={source.directory.complete}
              onChange={(e) =>
                setSource({
                  ...source,
                  directory: { ...source.directory, complete: e.target.checked },
                })
              }
            />{' '}
            Supplied directory is complete for this review
          </label>
          <label>
            Approved destinations, one per line
            <textarea
              rows={3}
              value={source.directory.destinations.join('\n')}
              onChange={(e) =>
                setSource({
                  ...source,
                  directory: {
                    ...source.directory,
                    destinations: e.target.value.split('\n').filter(Boolean),
                  },
                })
              }
            />
          </label>
        </details>
        {!item && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            I confirm that this case contains synthetic data only.
          </label>
        )}
        {error && (
          <div role="alert" className="error-box">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? (
              <Spinner label="Saving" />
            ) : item ? (
              <>
                <Save size={16} />
                Save new revision
              </>
            ) : (
              <>
                <Plus size={16} />
                Create case
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
