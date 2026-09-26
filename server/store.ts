import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CaseRecord } from '../shared/domain.ts';
import { seedCases } from './fixtures.ts';
import { AppError } from './errors.ts';

export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS idempotency (key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);');
    const count = this.db.prepare('SELECT count(*) AS count FROM cases').get() as { count: number };
    if (!count.count) for (const item of seedCases()) this.save(item);
  }
  list(): CaseRecord[] {
    return (this.db.prepare('SELECT data FROM cases ORDER BY id').all() as { data: string }[]).map(row => JSON.parse(row.data));
  }
  get(id: string): CaseRecord {
    const row = this.db.prepare('SELECT data FROM cases WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) throw new AppError(404, 'CASE_NOT_FOUND', 'This case could not be found.');
    return JSON.parse(row.data);
  }
  save(item: CaseRecord) {
    this.db.prepare('INSERT INTO cases (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(item.id, JSON.stringify(item));
  }
  transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  getIdempotent(key: string, fingerprint: string): unknown | undefined {
    const row = this.db.prepare('SELECT fingerprint, result FROM idempotency WHERE key = ?').get(key) as { fingerprint: string; result: string } | undefined;
    if (!row) return undefined;
    if (row.fingerprint !== fingerprint) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'This request identifier was already used for a different decision.');
    return JSON.parse(row.result);
  }
  saveIdempotent(key: string, fingerprint: string, result: unknown) {
    this.db.prepare('INSERT INTO idempotency (key,fingerprint,result) VALUES (?,?,?)').run(key, fingerprint, JSON.stringify(result));
  }
  close() { this.db.close(); }
}
