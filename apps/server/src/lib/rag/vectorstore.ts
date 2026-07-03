import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { dirname } from "node:path";
import { mkdirSync } from "fs";
import { getEmbeddingDimensions } from "../providers";
import { getEnv } from "../env";
import { resolveFromServerRoot } from "../paths";

const dbPool = new Map<string, Database.Database>();

function initSchema(database: Database.Database, dimensions: number) {
  database.prepare(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  database.prepare(`
    CREATE VIRTUAL TABLE IF NOT EXISTS document_embeddings USING vec0(
      document_id INTEGER,
      embedding float[${dimensions}]
    )
  `).run();
}

export function getDb(dbPath?: string): Database.Database {
  const effectivePath = dbPath || getEnv("CHATTR_DB_PATH") || "./data/chattr.db";
  const resolved = resolveFromServerRoot(effectivePath);
  const dimensions = getEmbeddingDimensions();
  // Key the pool by (path, dimensions) so swapping providers does not
  // attach to a vec0 table created with a different embedding size.
  const key = `${resolved}::${dimensions}`;

  const cached = dbPool.get(key);
  if (cached) return cached;

  mkdirSync(dirname(resolved), { recursive: true });

  const db = new Database(resolved);
  sqliteVec.load(db);
  initSchema(db, dimensions);

  dbPool.set(key, db);
  return db;
}

export function insertDocument(
  content: string,
  embedding: number[],
  metadata: Record<string, string> = {},
  dbPath?: string
): number {
  const expected = getEmbeddingDimensions();
  if (embedding.length !== expected) {
    throw new Error(
      `[Talkly] Invalid embedding size: expected ${expected}, got ${embedding.length}. ` +
        `If you switched providers, the existing database was built for a different embedding model. ` +
        `Either re-ingest from scratch (clear ./data) or restore the previous CHATTR_PROVIDER.`
    );
  }

  const database = getDb(dbPath);
  const insert = database.transaction(() => {
    const insertDoc = database.prepare(
      "INSERT INTO documents (content, metadata) VALUES (?, ?)"
    );
    const insertVec = database.prepare(
      "INSERT INTO document_embeddings (document_id, embedding) VALUES (CAST(? AS INTEGER), ?)"
    );

    const result = insertDoc.run(content, JSON.stringify(metadata));
    const docId = Number(result.lastInsertRowid);

    const vecBuffer = Buffer.from(new Float32Array(embedding).buffer);
    insertVec.run(docId, vecBuffer);

    return docId;
  });

  return insert();
}

export function searchSimilar(
  queryEmbedding: number[],
  topK = 5,
  dbPath?: string
): { content: string; metadata: string; distance: number }[] {
  const database = getDb(dbPath);
  const vecBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

  const results = database
    .prepare(
      `
      SELECT d.content, d.metadata, distance
      FROM document_embeddings e
      LEFT JOIN documents d ON d.id = e.document_id
      WHERE embedding MATCH ?
      AND k = ?
      ORDER BY distance
    `
    )
    .all(vecBuffer, topK) as { content: string; metadata: string; distance: number }[];

  return results;
}

export function getDocumentCount(dbPath?: string): number {
  const database = getDb(dbPath);
  const row = database.prepare("SELECT COUNT(*) as count FROM documents").get() as {
    count: number;
  };
  return row.count;
}

export function clearDocuments(dbPath?: string): void {
  const database = getDb(dbPath);
  const clear = database.transaction(() => {
    database.prepare("DELETE FROM document_embeddings").run();
    database.prepare("DELETE FROM documents").run();
  });
  clear();
}
