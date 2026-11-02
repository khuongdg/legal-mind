import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDbPool } from "./client";
import { embeddingService } from "./embeddings";

interface IngestCollection {
  id: string;
  name: string;
  description?: string;
}

interface IngestHandoff {
  configVersion: number;
  collections: IngestCollection[];
  lawIds: string[];
}

interface LegalChunk {
  articleNumber: number;
  articleTitle: string;
  clauseNumber?: number;
  content: string;
  contextPrefix: string;
}

interface LegalDocument {
  id: string;
  title: string;
  codeNumber: string;
  documentType: string;
  issuingAuthority: string;
  issuedDate: string;
  effectiveDate: string;
  status: string;
  officialSourceUrl: string;
  collections: string[];
  sourceHash: string;
  chunks: LegalChunk[];
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, "../../..");
const dataDirectory = path.join(repositoryRoot, "scripts", "data");
const handoffPath = path.join(dataDirectory, "ingest-manifest.json");

function validateDocument(value: unknown, expectedId: string): LegalDocument {
  if (!value || typeof value !== "object") {
    throw new Error(`Parsed document ${expectedId} is not a JSON object.`);
  }
  const document = value as Partial<LegalDocument>;
  if (document.id !== expectedId) {
    throw new Error(`Parsed document ID mismatch: expected ${expectedId}, got ${document.id}.`);
  }
  if (!/^[a-f0-9]{64}$/.test(document.sourceHash ?? "")) {
    throw new Error(`Parsed document ${expectedId} is missing a valid source hash.`);
  }
  if (!Array.isArray(document.collections) || !Array.isArray(document.chunks) || document.chunks.length === 0) {
    throw new Error(`Parsed document ${expectedId} must contain collections and at least one chunk.`);
  }
  return document as LegalDocument;
}

async function upsertCollections(collections: IngestCollection[]) {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const collection of collections) {
      await client.query(
        `INSERT INTO legal_collections (id, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           updated_at = NOW();`,
        [collection.id, collection.name, collection.description ?? null]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ingestDocument(document: LegalDocument, collectionIds: Set<string>) {
  const unknownCollections = document.collections.filter((id) => !collectionIds.has(id));
  if (unknownCollections.length > 0) {
    throw new Error(`${document.id} references unknown collections: ${unknownCollections.join(", ")}`);
  }

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ source_hash: string | null }>(
      "SELECT source_hash FROM legal_documents WHERE id = $1 FOR UPDATE;",
      [document.id]
    );
    const needsChunkRefresh = existing.rows[0]?.source_hash !== document.sourceHash;

    await client.query(
      `INSERT INTO legal_documents
         (id, title, code_number, document_type, issuing_authority, issued_date,
          effective_date, status, official_source_url, source_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         code_number = EXCLUDED.code_number,
         document_type = EXCLUDED.document_type,
         issuing_authority = EXCLUDED.issuing_authority,
         issued_date = EXCLUDED.issued_date,
         effective_date = EXCLUDED.effective_date,
         status = EXCLUDED.status,
         official_source_url = EXCLUDED.official_source_url,
         source_hash = EXCLUDED.source_hash,
         updated_at = NOW();`,
      [
        document.id,
        document.title,
        document.codeNumber,
        document.documentType,
        document.issuingAuthority,
        document.issuedDate,
        document.effectiveDate,
        document.status,
        document.officialSourceUrl,
        document.sourceHash,
      ]
    );

    await client.query("DELETE FROM legal_collection_documents WHERE document_id = $1;", [document.id]);
    for (const collectionId of document.collections) {
      await client.query(
        `INSERT INTO legal_collection_documents (collection_id, document_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [collectionId, document.id]
      );
    }

    if (needsChunkRefresh) {
      await client.query("DELETE FROM legal_chunks WHERE document_id = $1;", [document.id]);
      for (const chunk of document.chunks) {
        const embedding = await embeddingService.generateEmbedding(
          `${chunk.contextPrefix}\n${chunk.content}`,
          { requireProvider: true }
        );
        const vector = `[${embedding.join(",")}]`;
        await client.query(
          `INSERT INTO legal_chunks
             (document_id, article_number, article_title, clause_number, content, context_prefix, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector);`,
          [
            document.id,
            chunk.articleNumber,
            chunk.articleTitle,
            chunk.clauseNumber ?? null,
            chunk.content,
            chunk.contextPrefix,
            vector,
          ]
        );
      }
    }

    await client.query("COMMIT");
    return { refreshed: needsChunkRefresh, chunkCount: document.chunks.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ingestParsedLaws() {
  const handoff = JSON.parse(await fs.readFile(handoffPath, "utf-8")) as IngestHandoff;
  if (handoff.configVersion !== 1 || !Array.isArray(handoff.collections) || !Array.isArray(handoff.lawIds)) {
    throw new Error("Invalid scripts/data/ingest-manifest.json handoff.");
  }
  if (handoff.lawIds.length === 0) {
    console.log("No configured law sources were parsed; database unchanged.");
    return;
  }

  const collectionIds = new Set(handoff.collections.map((collection) => collection.id));
  await upsertCollections(handoff.collections);

  let refreshedCount = 0;
  let unchangedCount = 0;
  try {
    for (const lawId of handoff.lawIds) {
      if (lawId.includes("/") || lawId.includes("\\") || lawId === "." || lawId === "..") {
        throw new Error(`Unsafe law id in ingest manifest: ${lawId}`);
      }
      const jsonPath = path.join(dataDirectory, `${lawId}.json`);
      const document = validateDocument(JSON.parse(await fs.readFile(jsonPath, "utf-8")), lawId);
      const result = await ingestDocument(document, collectionIds);
      if (result.refreshed) {
        refreshedCount++;
        console.log(`Ingested ${document.id}: ${result.chunkCount} chunks embedded.`);
      } else {
        unchangedCount++;
        console.log(`Updated metadata for ${document.id}; source unchanged, embeddings reused.`);
      }
    }
    console.log(`Ingest complete: ${refreshedCount} document(s) indexed, ${unchangedCount} unchanged.`);
  } finally {
    await getDbPool().end();
  }
}

if (import.meta.main) {
  ingestParsedLaws().catch((error) => {
    console.error("RAG ingestion failed:", error);
    process.exitCode = 1;
  });
}
