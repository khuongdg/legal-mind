import { z } from "zod";

export const LegalDocumentTypeEnum = z.enum([
  "BO_LUAT",       // Bộ luật
  "LUAT",          // Luật
  "NGHI_DINH",     // Nghị định
  "THONG_TU",      // Thông tư
  "NGHI_QUYET",    // Nghị quyết
  "QUYET_DINH",    // Quyết định
  "AN_LE",         // Án lệ
  "CONG_VAN",      // Công văn hướng dẫn
]);

export type LegalDocumentType = z.infer<typeof LegalDocumentTypeEnum>;

export const LegalEffectStatusEnum = z.enum([
  "ACTIVE",             // Còn hiệu lực toàn bộ
  "PARTIALLY_EXPIRED",  // Hết hiệu lực một phần
  "EXPIRED",            // Đã hết hiệu lực hoàn toàn
  "AMENDED",            // Đã được sửa đổi, bổ sung
  "NOT_YET_EFFECTIVE",  // Chưa có hiệu lực thi hành
]);

export type LegalEffectStatus = z.infer<typeof LegalEffectStatusEnum>;

export const CitationSchema = z.object({
  id: z.string().describe("Mã định danh duy nhất của trích dẫn (ví dụ: blds-2015-art-468)"),
  documentId: z.string().describe("Mã văn bản (ví dụ: blds-2015)"),
  documentTitle: z.string().describe("Tên văn bản (ví dụ: Bộ luật Dân sự 2015)"),
  documentCode: z.string().describe("Số ký hiệu văn bản (ví dụ: 91/2015/QH13)"),
  documentType: LegalDocumentTypeEnum,
  articleNumber: z.number().int().describe("Số thứ tự Điều luật (ví dụ: 468)"),
  articleTitle: z.string().describe("Tiêu đề Điều luật (ví dụ: Lãi suất)"),
  clauseNumber: z.number().int().optional().describe("Số thứ tự Khoản (nếu có, ví dụ: 1)"),
  pointLetter: z.string().optional().describe("Điểm (nếu có, ví dụ: a, b)"),
  contentSnippet: z.string().describe("Trích lục nguyên văn đoạn luật liên quan"),
  status: LegalEffectStatusEnum.describe("Trạng thái hiệu lực hiện hành"),
  issuedDate: z.string().optional().describe("Ngày ban hành văn bản (YYYY-MM-DD)"),
  effectiveDate: z.string().describe("Ngày bắt đầu có hiệu lực (YYYY-MM-DD)"),
  expirationDate: z.string().optional().describe("Ngày hết hiệu lực nếu có"),
  amendedBy: z.string().optional().describe("Văn bản sửa đổi, bổ sung thay thế (nếu có)"),
  officialUrl: z.string().url().describe("Đường dẫn đến văn bản chính thống trên Cổng TTĐT / Thư viện pháp luật"),
  relevanceScore: z.number().min(0).max(1).optional().describe("Điểm tương đồng và liên quan với câu hỏi"),
});

export type Citation = z.infer<typeof CitationSchema>;

export const LegalSearchQuerySchema = z.object({
  query: z.string().min(2, "Câu hỏi tra cứu phải có ít nhất 2 ký tự"),
  documentTypes: z.array(LegalDocumentTypeEnum).optional(),
  statusFilter: z.array(LegalEffectStatusEnum).optional(),
  limit: z.number().int().min(1).max(20).default(5),
  effectiveOnly: z.boolean().default(true),
});

export type LegalSearchQuery = z.infer<typeof LegalSearchQuerySchema>;

export const LegalSearchResultSchema = z.object({
  query: z.string(),
  totalMatches: z.number().int(),
  citations: z.array(CitationSchema),
  searchMode: z.enum(["HYBRID", "KEYWORD_BM25", "SEMANTIC_VECTOR"]),
});

export type LegalSearchResult = z.infer<typeof LegalSearchResultSchema>;
