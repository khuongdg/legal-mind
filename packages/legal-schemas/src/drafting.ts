import { z } from "zod";

export const LegalDraftCategoryEnum = z.enum([
  "CIVIL_DISPUTE",       // Dân sự: Đơn khởi kiện đòi nợ, bồi thường thiệt hại, giấy vay tiền
  "LABOR_RELATION",      // Lao động: Hợp đồng lao động, đơn khiếu nại kỷ luật, thỏa thuận chấm dứt
  "BUSINESS_COMMERCE",   // Doanh nghiệp: Hợp đồng dịch vụ, thỏa thuận bảo mật (NDA), biên bản họp
  "MARRIAGE_FAMILY",     // Hôn nhân & Gia đình: Đơn thuận tình ly hôn, đơn xin nuôi con
  "PROPERTY_REAL_ESTATE",// Đất đai & Bất động sản: Hợp đồng thuê nhà, đặt cọc mua bán, đơn kiến nghị
  "AUTHORIZATION",       // Ủy quyền: Giấy ủy quyền cá nhân, hợp đồng ủy quyền công chứng
]);

export type LegalDraftCategory = z.infer<typeof LegalDraftCategoryEnum>;

export const DraftingFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  type: z.enum(["text", "textarea", "number", "date", "select"]),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validationRule: z.string().optional(),
});

export type DraftingField = z.infer<typeof DraftingFieldSchema>;

export const DraftingTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: LegalDraftCategoryEnum,
  description: z.string(),
  applicableLaws: z.array(z.string()).describe("Các văn bản luật làm căn cứ ban hành mẫu"),
  fields: z.array(DraftingFieldSchema),
  samplePreview: z.string().optional(),
});

export type DraftingTemplate = z.infer<typeof DraftingTemplateSchema>;

export const DraftingSubmissionSchema = z.object({
  templateId: z.string(),
  formData: z.record(z.any()),
  userNotes: z.string().optional(),
  outputFormat: z.enum(["MARKDOWN", "DOCX", "PDF"]).default("MARKDOWN"),
});

export type DraftingSubmission = z.infer<typeof DraftingSubmissionSchema>;

export const GeneratedDocumentSchema = z.object({
  documentTitle: z.string(),
  category: LegalDraftCategoryEnum,
  contentMarkdown: z.string(),
  legalBasis: z.array(z.string()),
  instructionsForFiling: z.array(z.string()).describe("Hướng dẫn các bước nộp hồ sơ, án phí, nơi nộp"),
  recommendedAttachments: z.array(z.string()).describe("Danh mục tài liệu chứng cứ cần đính kèm theo đơn"),
  generatedAt: z.string(),
});

export type GeneratedDocument = z.infer<typeof GeneratedDocumentSchema>;
