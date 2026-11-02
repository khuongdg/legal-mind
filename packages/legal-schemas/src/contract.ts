import { z } from "zod";

export const ContractTypeEnum = z.enum([
  "COMMERCIAL",   // Hợp đồng thương mại / mua bán hàng hóa
  "LABOR",        // Hợp đồng lao động
  "LEASE",        // Hợp đồng thuê nhà / mặt bằng / tài sản
  "SERVICE",      // Hợp đồng dịch vụ / tư vấn / phần mềm
  "NDA",          // Thỏa thuận bảo mật thông tin
  "LOAN",         // Hợp đồng vay tài sản / tiền
  "COOPERATION",  // Hợp đồng hợp tác kinh doanh (BCC)
  "OTHER",        // Hợp đồng khác
]);

export type ContractType = z.infer<typeof ContractTypeEnum>;

export const RiskLevelEnum = z.enum([
  "CRITICAL", // Vi phạm điều cấm của luật -> Vô hiệu, chế tài nặng
  "HIGH",     // Bất lợi nghiêm trọng cho quyền lợi, mất cân bằng nghĩa vụ
  "MEDIUM",   // Điều khoản mơ hồ, dễ phát sinh tranh chấp khi thực hiện
  "LOW",      // Lưu ý nhỏ về mặt kỹ thuật soạn thảo, hạn ngạch thời gian
  "SAFE",     // Điều khoản an toàn, tuân thủ đúng chuẩn
]);

export type RiskLevel = z.infer<typeof RiskLevelEnum>;

export const RedlineActionEnum = z.enum([
  "REPLACE", // Thay thế câu chữ
  "DELETE",  // Xóa bỏ hoàn toàn điều khoản rủi ro
  "ADD_NEW", // Bổ sung điều khoản bảo vệ mới
]);

export type RedlineAction = z.infer<typeof RedlineActionEnum>;

export const RedlineSuggestionSchema = z.object({
  action: RedlineActionEnum,
  originalSnippet: z.string().describe("Đoạn văn bản gốc có rủi ro"),
  proposedText: z.string().describe("Nội dung sửa đổi / bổ sung đề xuất"),
  justification: z.string().describe("Căn cứ giải thích lý do sửa đổi"),
});

export type RedlineSuggestion = z.infer<typeof RedlineSuggestionSchema>;

export const ClauseReviewSchema = z.object({
  clauseIndex: z.string().describe("Số thứ tự hoặc tên điều khoản (ví dụ: 'Điều 4.2', 'Điều 8')"),
  title: z.string().describe("Tiêu đề hoặc chủ đề điều khoản (ví dụ: 'Phạt vi phạm và bồi thường')"),
  originalText: z.string().describe("Toàn bộ nội dung nguyên văn của điều khoản"),
  riskLevel: RiskLevelEnum,
  riskTitle: z.string().describe("Tóm tắt rủi ro ngắn gọn"),
  riskExplanation: z.string().describe("Phân tích chi tiết rủi ro đối với người ký"),
  legalBasis: z.object({
    lawName: z.string().describe("Tên luật hoặc văn bản quy định (ví dụ: 'Luật Thương mại 2005')"),
    article: z.string().describe("Điều khoản viện dẫn (ví dụ: 'Điều 301')"),
    note: z.string().describe("Lưu ý đối chiếu pháp lý"),
  }).optional(),
  redline: RedlineSuggestionSchema.optional(),
  confidence: z.number().min(0).max(1).default(0.95),
});

export type ClauseReview = z.infer<typeof ClauseReviewSchema>;

export const ContractReviewSchema = z.object({
  contractTitle: z.string().describe("Tên văn bản hợp đồng"),
  contractType: ContractTypeEnum,
  detectedParties: z.array(z.object({
    role: z.string().describe("Vai trò: Bên A, Bên B, Người lao động..."),
    name: z.string().describe("Tên cá nhân hoặc tổ chức"),
    identifier: z.string().optional().describe("Mã số thuế hoặc số CCCD"),
  })),
  overallRiskScore: z.number().min(0).max(100).describe("Điểm rủi ro tổng thể (0: Rất an toàn, 100: Cực kỳ nguy hiểm)"),
  summaryConclusion: z.string().describe("Đánh giá tổng quan về tính hợp pháp và cân bằng lợi ích"),
  criticalClausesCount: z.number().int().default(0),
  highRiskClausesCount: z.number().int().default(0),
  mediumRiskClausesCount: z.number().int().default(0),
  missingEssentialClauses: z.array(z.string()).describe("Các điều khoản bắt buộc phải có nhưng bị thiếu trong hợp đồng"),
  clauses: z.array(ClauseReviewSchema),
});

export type ContractReview = z.infer<typeof ContractReviewSchema>;
