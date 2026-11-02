import { z } from "zod";
import { CitationSchema } from "./citation";

export const LegalChatRequestSchema = z.object({
  id: z.string().optional(),
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })),
  caseContext: z.object({
    disputeType: z.string().optional(),
    userRole: z.string().optional(), // 'plaintiff' (người khởi kiện), 'defendant' (bị đơn), 'employee' (người lao động)...
  }).optional(),
});

export type LegalChatRequest = z.infer<typeof LegalChatRequestSchema>;

export const LegalAssistantMetadataSchema = z.object({
  citations: z.array(CitationSchema).optional(),
  reasoningSteps: z.array(z.string()).optional(),
  disclaimer: z.string().default(
    "Thông tin trả lời từ Legal-Mind chỉ mang tính chất tham khảo cứu pháp lý và không cấu thành dịch vụ tư vấn pháp lý chính thức của Luật sư."
  ),
  isEmergencyAlert: z.boolean().default(false), // Cảnh báo thời hiệu sắp hết hoặc nguy cơ vi phạm hình sự
});

export type LegalAssistantMetadata = z.infer<typeof LegalAssistantMetadataSchema>;
