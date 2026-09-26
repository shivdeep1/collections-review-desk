import { useEffect, useState } from 'react';
import { FileAudio, Upload, Play, Check, Download } from 'lucide-react';
import type { CaseRecord, Source } from '../shared/domain';
import { parseTranscript, sourceSchema } from '../shared/domain';
import { AUDIO_MAX_BYTES, speechLanguages } from '../shared/audio';
import type { Recording, Transcription } from '../shared/audio';
import { api } from './api';
import { Modal, Spinner } from './components';

export function recordingUrl(caseId: string, id: string) {
  return `/api/cases/${encodeURIComponent(caseId)}/recordings/${encodeURIComponent(id)}/content`;
}
type Media = {
  recordings: Recording[];
  transcriptions: Transcription[];
  providers?: { defaultProvider: 'gemini' | 'sarvam'; sarvam: boolean; gemini: boolean };
};

export function AudioEvidence({
  item,
  onClose,
  onAdopt,
}: {
  item: CaseRecord;
  onClose: () => void;
  onAdopt: (source: Source) => Promise<void>;
}) {
  const [media, setMedia] = useState<Media>({ recordings: [], transcriptions: [] });
  const [selected, setSelected] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [synthetic, setSynthetic] = useState(false);
  const [checked, setChecked] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'sarvam'>('gemini');
  const [roles, setRoles] = useState<Record<string, 'Collector' | 'Customer' | 'Unknown'>>({});
  const [edited, setEdited] = useState(false);
  const [sample, setSample] = useState('sarvam-hinglish-call.wav');
  const [languageCode, setLanguageCode] = useState('unknown');
  const recording = media.recordings.find((r) => r.id === selected);
  const draft = media.transcriptions.filter((d) => d.recordingId === selected).at(-1);
  useEffect(() => {
    let live = true;
    api<Media>(`/cases/${item.id}/recordings`)
      .then((data) => {
        if (!live) return;
        setMedia(data);
        if (data.providers) setProvider(data.providers.defaultProvider);
        setSelected(item.source.audio?.recordingId || data.recordings.at(-1)?.id || '');
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [item.id]);
  useEffect(() => {
    setText(draft?.turns.map((t) => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n') || '');
    setChecked(false);
    setRoles({});
    setEdited(false);
  }, [draft?.id, selected]);

  async function upload(chosen: File) {
    if (chosen.size > AUDIO_MAX_BYTES) throw new Error('Choose a WAV or MP3 recording up to 6 MB.');
    const mimeType = /\.wav$/i.test(chosen.name)
      ? 'audio/wav'
      : /\.mp3$/i.test(chosen.name)
        ? 'audio/mpeg'
        : '';
    if (!mimeType) throw new Error('This prototype accepts WAV and MP3 recordings.');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('The file could not be read.'));
      reader.readAsDataURL(chosen);
    });
    const result = await api<Recording>(`/cases/${item.id}/recordings`, {
      method: 'POST',
      body: { fileName: chosen.name, mimeType, base64, synthetic: true },
    });
    setMedia((current) => ({ ...current, recordings: [...current.recordings, result] }));
    setSelected(result.id);
    setFile(null);
  }
  async function work(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The audio operation failed.');
    } finally {
      setBusy('');
    }
  }
  return (
    <Modal title="Audio evidence" onClose={() => !busy && onClose()} wide>
      <div className="modal-content audio-importer">
        <div className="notice">
          <FileAudio size={20} />
          <span>
            Upload a synthetic call, choose a speech model, then inspect the draft before using it
            for a review. Uploading alone leaves your current transcript unchanged.
          </span>
        </div>
        <section className="audio-upload">
          <h3>1. Choose a recording</h3>
          <label>
            WAV or MP3, up to 6 MB
            <input
              type="file"
              accept=".wav,.mp3,audio/wav,audio/mpeg"
              disabled={Boolean(busy)}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={synthetic}
              disabled={Boolean(busy)}
              onChange={(e) => setSynthetic(e.target.checked)}
            />
            This recording contains made-up people and conversation only.
          </label>
          <div className="audio-buttons">
            <button
              className="button secondary"
              disabled={!file || !synthetic || Boolean(busy)}
              onClick={() =>
                work('Uploading recording', async () => {
                  if (file) await upload(file);
                })
              }
            >
              <Upload size={15} />
              Upload recording
            </button>
            <button
              className="button secondary"
              disabled={Boolean(busy)}
              onClick={() =>
                work('Loading synthetic sample', async () => {
                  const response = await fetch(`/samples/${sample}`);
                  if (!response.ok) throw new Error('The sample recording is unavailable.');
                  await upload(
                    new File([await response.blob()], sample, {
                      type: 'audio/wav',
                    }),
                  );
                  setLanguageCode(sample.startsWith('sarvam-') ? 'hi-IN' : 'en-IN');
                })
              }
            >
              Load synthetic sample
            </button>
            <a className="text-button" href={`/samples/${sample}`} download>
              <Download size={14} />
              Download sample
            </a>
          </div>
          <label>
            Sample recording
            <select
              value={sample}
              disabled={Boolean(busy)}
              onChange={(e) => setSample(e.target.value)}
            >
              <option value="sarvam-hinglish-call.wav">Hindi-English · Sarvam Bulbul voices</option>
              <option value="synthetic-collections-call.wav">
                English · original Windows voices
              </option>
            </select>
          </label>
          <p className="field-hint">
            Both samples use computer-generated voices. These are fictional disputed-payment calls,
            not bank recordings or live calls.
          </p>
        </section>
        {media.recordings.length > 0 && (
          <section className="audio-draft">
            <label>
              Saved recording
              <select
                value={selected}
                disabled={Boolean(busy)}
                onChange={(e) => setSelected(e.target.value)}
              >
                {media.recordings.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fileName} · {new Date(r.createdAt).toLocaleTimeString()}
                  </option>
                ))}
              </select>
            </label>
            {recording && (
              <>
                <audio
                  key={recording.id}
                  controls
                  preload="metadata"
                  src={recordingUrl(item.id, recording.id)}
                  aria-label="Synthetic recording playback"
                />
                <p className="field-hint">
                  Saved locally · {(recording.bytes / 1024 / 1024).toFixed(2)} MB · SHA-256{' '}
                  {recording.sha256.slice(0, 12)}…
                </p>
              </>
            )}
            <h3>2. Generate a draft transcript</h3>
            <label>
              Transcription provider
              <select
                value={provider}
                disabled={Boolean(busy)}
                onChange={(e) => setProvider(e.target.value as 'gemini' | 'sarvam')}
              >
                <option value="sarvam" disabled={!media.providers?.sarvam}>
                  Sarvam Saaras · Indian-language speech
                </option>
                <option value="gemini" disabled={!media.providers?.gemini}>
                  Gemini · audio transcription
                </option>
              </select>
            </label>
            {provider === 'sarvam' && (
              <label>
                Recording language
                <select
                  value={languageCode}
                  disabled={Boolean(busy)}
                  onChange={(e) => setLanguageCode(e.target.value)}
                >
                  {speechLanguages.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p>
              The next button sends this recording to {provider === 'sarvam' ? 'Sarvam' : 'Gemini'}{' '}
              and uses your API credits or quota. It does not run the collections review.
            </p>
            {provider === 'sarvam' && (
              <p className="field-hint">
                Saaras supports 22 Indian languages and English. This prototype has limited language
                testing. Batch transcription may take up to 3 minutes. You assign collector/customer
                roles after listening.
              </p>
            )}
            <button
              className="button secondary"
              disabled={!recording || Boolean(busy)}
              onClick={() =>
                work(
                  `Transcribing with ${provider === 'sarvam' ? 'Sarvam' : 'Gemini'}`,
                  async () => {
                    const result = await api<Transcription>(
                      `/cases/${item.id}/recordings/${selected}/transcriptions`,
                      {
                        method: 'POST',
                        body: { provider, ...(provider === 'sarvam' ? { languageCode } : {}) },
                      },
                    );
                    setMedia((current) => ({
                      ...current,
                      transcriptions: [...current.transcriptions, result],
                    }));
                  },
                )
              }
            >
              <Play size={15} />
              {draft
                ? 'Transcribe again'
                : `Transcribe with ${provider === 'sarvam' ? 'Sarvam' : 'Gemini'}`}
            </button>
            {draft && (
              <>
                <h3>3. Check the transcript</h3>
                {draft.turns.some((t) => t.speakerId !== undefined) && (
                  <div className="notice warning">
                    <div>
                      <p>
                        Listen to each speaker before assigning a role. Unknown is allowed. Assign
                        roles before editing words; later changes can be made directly in the draft.
                      </p>
                      {[
                        ...new Set(
                          draft.turns.flatMap((t) =>
                            t.speakerId === undefined ? [] : [t.speakerId],
                          ),
                        ),
                      ].map((id) => (
                        <label key={id}>
                          Speaker {id}:{' '}
                          {draft.turns.find((t) => t.speakerId === id)?.text.slice(0, 85)}
                          <select
                            aria-label={`Role for speaker ${id}`}
                            value={roles[id] || 'Unknown'}
                            disabled={Boolean(busy) || edited}
                            onChange={(e) => {
                              const next = {
                                ...roles,
                                [id]: e.target.value as 'Collector' | 'Customer' | 'Unknown',
                              };
                              setRoles(next);
                              setText(
                                draft.turns
                                  .map(
                                    (t) =>
                                      `[${t.time}] ${t.speakerId === undefined ? t.speaker : next[t.speakerId] || 'Unknown'}: ${t.text}`,
                                  )
                                  .join('\n'),
                              );
                              setChecked(false);
                            }}
                          >
                            <option>Unknown</option>
                            <option>Collector</option>
                            <option>Customer</option>
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <p className="field-hint">
                  {draft.model} · {(draft.latencyMs / 1000).toFixed(1)}s · AI-generated text and
                  approximate timestamps. This is not a verified transcript.
                </p>
                <div className="notice warning">
                  Check payment-address spelling, amounts and negation against playback. A
                  transcript can normalise or mishear spoken words.
                </div>
                {draft.warnings.length > 0 && (
                  <div className="notice warning">
                    <ul>
                      {draft.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <label>
                  Draft transcript
                  <textarea
                    rows={12}
                    value={text}
                    disabled={Boolean(busy)}
                    onChange={(e) => {
                      setText(e.target.value);
                      setEdited(true);
                      setChecked(false);
                    }}
                  />
                </label>
                <p className="field-hint">
                  Use [00:00] Collector: words, Customer: words, or Unknown: words. Preserve unclear
                  speech as [inaudible]. Correct words and speaker labels against playback.
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={Boolean(busy)}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  I have inspected the draft and accept it as the transcript for this synthetic
                  review.
                </label>
                <button
                  className="button primary"
                  disabled={!checked || Boolean(busy)}
                  onClick={() =>
                    work('Saving transcript revision', async () => {
                      const source = sourceSchema.parse({
                        ...item.source,
                        transcript: parseTranscript(text),
                        audio: { recordingId: selected, transcriptionId: draft.id },
                      });
                      await onAdopt(source);
                      onClose();
                    })
                  }
                >
                  <Check size={15} />
                  Use transcript for review
                </button>
                <p className="field-hint">
                  This saves a new source revision and invalidates pending approvals. The collector
                  note remains unchanged. Run a new AI review after saving.
                </p>
              </>
            )}
          </section>
        )}
        {busy && (
          <div role="status">
            <Spinner label={busy} />
          </div>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
