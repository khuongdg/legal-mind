import type { Citation, LegalSearchQuery } from "@legal-mind/legal-schemas";
import { getDbPool, embeddingService } from "@legal-mind/db";

const MIN_RELEVANCE_SCORE = 0.45;
const STRONG_RELEVANCE_SCORE = 0.55;
const QUERY_STOP_WORDS = new Set([
  "bao", "bên", "bị", "bỏ", "các", "có", "của", "đăng", "để", "được", "gì",
  "hay", "hợp", "ký", "khi", "không", "là", "làm", "một", "nào", "năm",
  "người", "như", "những", "ở", "phải", "quy", "sao", "thế", "thì",
  "theo", "thủ", "tại", "từ", "và", "về", "với",
]);

function normalizeForLexicalMatch(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi");
}

function hasLexicalSupport(query: string, citation: Citation): boolean {
  const queryTerms = new Set(
    normalizeForLexicalMatch(query)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length > 2 && !QUERY_STOP_WORDS.has(term) && !/^\d+$/.test(term))
  );
  const sourceText = normalizeForLexicalMatch(
    `${citation.articleTitle} ${citation.contentSnippet} ${citation.documentTitle}`
  );
  let matchedTerms = 0;
  for (const term of queryTerms) {
    if (sourceText.includes(term)) matchedTerms++;
    if (matchedTerms >= 2) return true;
  }
  return false;
}

function formatDatabaseDate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export class LegalRAGService {
  async getIndexedDocumentMetadata(): Promise<Array<{
    documentTitle: string;
    articleCount: number;
    issuedDate: string;
    effectiveDate: string;
    status: string;
    issuingAuthority: string | null;
  }>> {
    const pool = getDbPool();
    const result = await pool.query<{ documentTitle: string; articleCount: number; issuedDate: string; effectiveDate: string; status: string; issuingAuthority: string | null }>(
      `SELECT d.title AS "documentTitle", count(DISTINCT c.article_number)::int AS "articleCount",
              d.issued_date::text AS "issuedDate",
              d.effective_date::text AS "effectiveDate", d.status,
              d.issuing_authority AS "issuingAuthority"
       FROM legal_documents d
       JOIN legal_chunks c ON c.document_id = d.id
      GROUP BY d.id, d.title, d.issued_date, d.effective_date, d.status, d.issuing_authority
       ORDER BY d.title;`
    );
    return result.rows;
  }

  async search(queryData: LegalSearchQuery): Promise<Citation[]> {
    const rawQuery = queryData.query.trim();
    if (!rawQuery) return [];

    // 1. Production-Grade Hybrid Search in PostgreSQL (Vector + BM25 Full-text)
    try {
      const pool = getDbPool();

      // Generate 1536D embedding for query
      const queryVector = await embeddingService.generateEmbedding(rawQuery);
      const queryVecStr = `[${queryVector.join(",")}]`;

      const hybridQuery = `
        SELECT 
          c.id, 
          c.document_id, 
          d.title as doc_title, 
          d.code_number, 
          d.document_type,
          c.article_number, 
          c.article_title, 
          c.clause_number, 
          c.content, 
          d.status,
          d.issued_date,
          d.effective_date, 
          d.official_source_url,
          (1 - (c.embedding <=> $1::vector)) as vector_score,
          coalesce(ts_rank_cd(c.search_vector, plainto_tsquery('simple', unaccent($2))), 0) as text_score,
          (
            0.65 * (1 - (c.embedding <=> $1::vector)) + 
            0.35 * coalesce(ts_rank_cd(c.search_vector, plainto_tsquery('simple', unaccent($2))), 0)
          ) as hybrid_relevance
        FROM legal_chunks c
        JOIN legal_documents d ON c.document_id = d.id
        WHERE ($4::varchar[] IS NULL OR d.document_type = ANY($4::varchar[]))
          AND ($5::varchar[] IS NULL OR d.status = ANY($5::varchar[]))
          AND (
            NOT $6::boolean
            OR (d.status = 'ACTIVE' AND d.effective_date <= CURRENT_DATE)
          )
        ORDER BY 
          -- Prioritize exact article title match, then hybrid score
          (c.search_vector @@ plainto_tsquery('simple', unaccent($2))) DESC,
          hybrid_relevance DESC
        LIMIT $3;
      `;

      const res = await pool.query(hybridQuery, [
        queryVecStr,
        rawQuery,
        queryData.limit,
        queryData.documentTypes?.length ? queryData.documentTypes : null,
        queryData.statusFilter?.length ? queryData.statusFilter : null,
        queryData.effectiveOnly,
      ]);

      if (res.rows.length > 0) {
        const citations = res.rows.map((row) => ({
          id: row.id,
          documentId: row.document_id,
          documentTitle: row.doc_title,
          documentCode: row.code_number,
          documentType: row.document_type,
          articleNumber: row.article_number,
          articleTitle: row.article_title,
          clauseNumber: row.clause_number ?? undefined,
          contentSnippet: row.content,
          status: row.status,
          issuedDate: formatDatabaseDate(row.issued_date),
          effectiveDate: formatDatabaseDate(row.effective_date),
          officialUrl: row.official_source_url,
          relevanceScore: Number(row.vector_score ? row.vector_score.toFixed(3) : 0.95),
        }));

        const supportedCitations = citations.filter((citation) => {
          const score = citation.relevanceScore ?? 0;
          return score >= STRONG_RELEVANCE_SCORE || (score >= MIN_RELEVANCE_SCORE && hasLexicalSupport(rawQuery, citation));
        });
        return supportedCitations;
      }
    } catch (dbError) {
      console.error("PostgreSQL legal search failed; returning no unverified fallback citations.", dbError);
      throw new Error("Không thể tra cứu kho dữ liệu pháp luật. Vui lòng thử lại sau.", { cause: dbError });
    }
    return [];
  }

  async getCitationById(id: string): Promise<Citation | null> {
    try {
      const pool = getDbPool();
      const res = await pool.query(
        `SELECT c.id, c.document_id, d.title as doc_title, d.code_number, d.document_type,
                c.article_number, c.article_title, c.clause_number, c.content, d.status,
                d.issued_date, d.effective_date, d.official_source_url
         FROM legal_chunks c
         JOIN legal_documents d ON c.document_id = d.id
        WHERE c.id::text = $1::text
          OR c.document_id || '-art-' || c.article_number::text = $1::text
         LIMIT 1;`,
        [id]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          documentId: row.document_id,
          documentTitle: row.doc_title,
          documentCode: row.code_number,
          documentType: row.document_type,
          articleNumber: row.article_number,
          articleTitle: row.article_title,
          clauseNumber: row.clause_number ?? undefined,
          contentSnippet: row.content,
          status: row.status,
          issuedDate: formatDatabaseDate(row.issued_date),
          effectiveDate: formatDatabaseDate(row.effective_date),
          officialUrl: row.official_source_url,
          relevanceScore: 0.98,
        };
      }
    } catch (dbError) {
      console.error("PostgreSQL citation lookup failed.", dbError);
      throw new Error("Không thể tải trích dẫn từ cơ sở dữ liệu. Vui lòng thử lại sau.", { cause: dbError });
    }
    return null;
  }
}
