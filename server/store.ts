import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CaseRecord } from '../shared/domain.ts';
import { seedCases } from './fixtures.ts';
import { AppError } from './errors.ts';
import type { Recording, Transcription } from '../shared/audio.ts';

export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      'PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS idempotency (key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);',
    );
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS recordings (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, metadata TEXT NOT NULL, bytes BLOB NOT NULL); CREATE TABLE IF NOT EXISTS transcriptions (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, data TEXT NOT NULL);',
    );
    const count = this.db.prepare('SELECT count(*) AS count FROM cases').get() as { count: number };
    if (!count.count) for (const item of seedCases()) this.save(item);
    // Upgrade earlier local checkpoints without inventing evidence that was never saved.
    for (const item of this.list()) {
      if (item.sourceHistory) continue;
      const revisions = new Map(
        item.analyses.map((a) => [
          a.sourceRevision,
          { revision: a.sourceRevision, source: a.source, at: a.createdAt, actor: a.actor },
        ]),
      );
      if (!revisions.has(item.sourceRevision))
        revisions.set(item.sourceRevision, {
          revision: item.sourceRevision,
          source: item.source,
          at: item.updatedAt,
          actor: { id: 'migration', name: 'Existing local record', role: 'reviewer' },
        });
      item.sourceHistory = [...revisions.values()].sort((a, b) => a.revision - b.revision);
      this.save(item);
    }
  }
  list(): CaseRecord[] {
    return (this.db.prepare('SELECT data FROM cases ORDER BY id').all() as { data: string }[]).map(
      (row) => JSON.parse(row.data),
    );
  }
  get(id: string): CaseRecord {
    const row = this.db.prepare('SELECT data FROM cases WHERE id = ?').get(id) as
      { data: string } | undefined;
    if (!row) throw new AppError(404, 'CASE_NOT_FOUND', 'This case could not be found.');
    return JSON.parse(row.data);
  }
  save(item: CaseRecord) {
    this.db
      .prepare(
        'INSERT INTO cases (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
      )
      .run(item.id, JSON.stringify(item));
  }
  transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  getIdempotent(key: string, fingerprint: string): unknown | undefined {
    const row = this.db
      .prepare('SELECT fingerprint, result FROM idempotency WHERE key = ?')
      .get(key) as { fingerprint: string; result: string } | undefined;
    if (!row) return undefined;
    if (row.fingerprint !== fingerprint)
      throw new AppError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'This request identifier was already used for a different decision.',
      );
    return JSON.parse(row.result);
  }
  saveIdempotent(key: string, fingerprint: string, result: unknown) {
    this.db
      .prepare('INSERT INTO idempotency (key,fingerprint,result) VALUES (?,?,?)')
      .run(key, fingerprint, JSON.stringify(result));
  }
  saveRecording(metadata: Recording, bytes: Buffer) {
    this.db
      .prepare('INSERT INTO recordings (id, case_id, metadata, bytes) VALUES (?,?,?,?)')
      .run(metadata.id, metadata.caseId, JSON.stringify(metadata), bytes);
  }
  recordings(caseId: string): Recording[] {
    return (
      this.db
        .prepare('SELECT metadata FROM recordings WHERE case_id = ? ORDER BY rowid')
        .all(caseId) as { metadata: string }[]
    ).map((row) => JSON.parse(row.metadata));
  }
  recording(caseId: string, id: string): { metadata: Recording; bytes: Buffer } {
    const row = this.db
      .prepare('SELECT metadata, bytes FROM recordings WHERE case_id = ? AND id = ?')
      .get(caseId, id) as { metadata: string; bytes: Uint8Array } | undefined;
    if (!row)
      throw new AppError(404, 'AUDIO_NOT_FOUND', 'This recording is not attached to this case.');
    return { metadata: JSON.parse(row.metadata), bytes: Buffer.from(row.bytes) };
  }
  saveTranscription(draft: Transcription) {
    this.db
      .prepare('INSERT INTO transcriptions (id, case_id, data) VALUES (?,?,?)')
      .run(draft.id, draft.caseId, JSON.stringify(draft));
  }
  transcriptions(caseId: string): Transcription[] {
    return (
      this.db
        .prepare('SELECT data FROM transcriptions WHERE case_id = ? ORDER BY rowid')
        .all(caseId) as { data: string }[]
    ).map((row) => JSON.parse(row.data));
  }
  close() {
    this.db.close();
  }
}
