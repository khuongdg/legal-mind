import type { DraftingSubmission, GeneratedDocument } from "@legal-mind/legal-schemas";
import { DRAFTING_TEMPLATES } from "./templates";

export class LegalDraftingService {
  async getTemplates() {
    return DRAFTING_TEMPLATES;
  }

  async generateDocument(submission: DraftingSubmission): Promise<GeneratedDocument> {
    const template = DRAFTING_TEMPLATES.find((t) => t.id === submission.templateId);
    if (!template) {
      throw new Error(`Template not found with ID: ${submission.templateId}`);
    }

    const { formData } = submission;
    const today = new Date();
    const dateStr = `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

    let contentMarkdown = "";

    if (template.id === "don-khoi-kien-doi-no") {
      contentMarkdown = `
**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**  
**Độc lập - Tự do - Hạnh phúc**  
***  
*Hà Nội, ${dateStr}*

# ĐƠN KHỞI KIỆN
*(V/v: Tranh chấp hợp đồng vay tài sản)*

**Kính gửi:** **${formData.courtName || "TÒA ÁN NHÂN DÂN CÓ THẨM QUYỀN"}**

**I. NGƯỜI KHỞI KIỆN:**  
- Họ và tên: **${formData.plaintiffName || "...................................................."}**  
- Số CCCD/Hộ chiếu: ${formData.plaintiffCccd || "..................."}  
- Địa chỉ thường trú: ${formData.plaintiffAddress || "...................................................."}  

**II. NGƯỜI BỊ KIỆN:**  
- Họ và tên: **${formData.defendantName || "...................................................."}**  
- Địa chỉ cư trú: ${formData.defendantAddress || "...................................................."}  

**III. NỘI DUNG SỰ VIỆC VÀ CĂN CỨ KHỞI KIỆN:**  
Vào ngày **${formData.loanDate || "..../..../........"}**, tôi và người bị kiện có lập hợp đồng vay tiền/giấy biên nhận vay tiền. Theo đó, tôi đã cho người bị kiện vay số tiền gốc là: **${Number(formData.loanAmount || 0).toLocaleString("vi-VN")} VNĐ**.

Thời hạn trả nợ hai bên đã thỏa thuận là ngày: **${formData.dueDate || "..../..../........"}**.

Tuy nhiên, đến thời hạn cam kết, mặc dù tôi đã nhiều lần đôn đốc và nhắc nhở nhưng người bị kiện vẫn cố tình trốn tránh, không hoàn trả số tiền nợ gốc nêu trên, xâm phạm nghiêm trọng đến quyền và lợi ích hợp pháp của tôi được pháp luật bảo vệ.

**Căn cứ pháp lý:**  
- Điều 463, Điều 466 Bộ luật Dân sự 2015 về nghĩa vụ trả nợ của bên vay;  
- Điều 189 Bộ luật Tố tụng Dân sự 2015.

**IV. YÊU CẦU TÒA ÁN GIẢI QUYẾT:**  
Kính đề nghị Quý Tòa án thụ lý và giải quyết các yêu cầu sau:  
1. Buộc người bị kiện phải hoàn trả ngay cho tôi toàn bộ số tiền nợ gốc: **${Number(formData.loanAmount || 0).toLocaleString("vi-VN")} VNĐ**.  
2. Buộc người bị kiện trả tiền lãi chậm trả theo quy định tại Điều 357 và Điều 468 Bộ luật Dân sự 2015 tính từ ngày quá hạn đến thời điểm thanh toán thực tế.  
3. Người bị kiện phải chịu toàn bộ án phí dân sự sơ thẩm theo quy định pháp luật.

**DANH MỤC TÀI LIỆU, CHỨNG CỨ KÈM THEO:**  
- Giấy vay tiền / Hợp đồng vay bản gốc hoặc bản sao y công chứng;  
- Sao kê giao dịch chuyển khoản ngân hàng;  
- Bản sao CCCD của người khởi kiện;  
- Chứng cứ trao đổi, tin nhắn đòi nợ: ${formData.evidenceList || "Biên bản, vi bằng hoặc tin nhắn xác nhận."}.

**NGƯỜI KHỞI KIỆN**  
*(Ký và ghi rõ họ tên)*  



**${formData.plaintiffName || "Nguyễn Văn A"}**
`.trim();
    } else {
      // Default formatting for other templates
      contentMarkdown = `
**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**  
**Độc lập - Tự do - Hạnh phúc**  
***  
*Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}*

# ${template.title.toUpperCase()}

**Căn cứ pháp lý:**  
${template.applicableLaws.map((law) => `- ${law}`).join("\n")}

**NỘI DUNG VĂN BẢN:**  
${Object.entries(formData)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

**CAM KẾT CÁC BÊN:**  
Các bên xác nhận nội dung trên hoàn toàn tự nguyện, không bị ép buộc lừa dối và cam kết thực hiện đầy đủ nghĩa vụ.
`.trim();
    }

    return {
      documentTitle: template.title,
      category: template.category,
      contentMarkdown,
      legalBasis: template.applicableLaws,
      instructionsForFiling: [
        "In đơn ra giấy A4 thành ít nhất 02 bản chính.",
        "Ký và ghi rõ họ tên tại vị trí Người làm đơn (không được ký thay nếu không có ủy quyền).",
        "Nộp đơn kèm tài liệu chứng cứ trực tiếp tại Bộ phận một cửa của Tòa án nhân dân hoặc gửi qua đường bưu điện.",
        "Nộp tạm ứng án phí tại Chi cục Thi hành án dân sự sau khi nhận thông báo của Tòa án."
      ],
      recommendedAttachments: [
        "Bản sao CCCD người nộp đơn",
        "Chứng cứ chứng minh yêu cầu khởi kiện (Hợp đồng, Biên bản giao nhận, Sao kê ngân hàng)",
        "Tài liệu về nơi cư trú của người bị kiện"
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}
