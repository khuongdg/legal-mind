import type { DraftingTemplate } from "@legal-mind/legal-schemas";

export const DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: "don-khoi-kien-doi-no",
    title: "Đơn Khởi Kiện Đòi Nợ (Tranh Chấp Hợp Đồng Vay Tài Sản)",
    category: "CIVIL_DISPUTE",
    description: "Mẫu đơn khởi kiện chuẩn gửi Tòa án nhân dân cấp có thẩm quyền yêu cầu người vay hoàn trả tiền gốc và tiền lãi phát sinh.",
    applicableLaws: [
      "Bộ luật Dân sự 2015 (Điều 463, Điều 466, Điều 468)",
      "Bộ luật Tố tụng Dân sự 2015 (Điều 189 về Hình thức và nội dung đơn khởi kiện)",
      "Nghị quyết số 01/2017/NQ-HĐTP của Hội đồng Thẩm phán TANDTC"
    ],
    fields: [
      { id: "courtName", label: "Tòa án có thẩm quyền tiếp nhận", type: "text", required: true, placeholder: "Ví dụ: Tòa án nhân dân Quận 1, TP. Hồ Chí Minh" },
      { id: "plaintiffName", label: "Họ và tên người khởi kiện (Bên cho vay)", type: "text", required: true },
      { id: "plaintiffCccd", label: "Số CCCD/CMND người khởi kiện", type: "text", required: true },
      { id: "plaintiffAddress", label: "Địa chỉ thường trú / liên lạc người khởi kiện", type: "text", required: true },
      { id: "defendantName", label: "Họ và tên người bị kiện (Bên vay)", type: "text", required: true },
      { id: "defendantAddress", label: "Địa chỉ cư trú của người bị kiện", type: "text", required: true },
      { id: "loanAmount", label: "Số tiền gốc đã vay (VNĐ)", type: "number", required: true, placeholder: "100000000" },
      { id: "loanDate", label: "Ngày ký giấy vay / chuyển khoản", type: "date", required: true },
      { id: "dueDate", label: "Hạn chót cam kết trả nợ", type: "date", required: true },
      { id: "evidenceList", label: "Danh mục chứng cứ đính kèm (sao kê, giấy vay, tin nhắn)", type: "textarea", required: true }
    ]
  },
  {
    id: "hop-dong-thue-nha",
    title: "Hợp Đồng Thuê Nhà Ở / Mặt Bằng Kinh Doanh",
    category: "PROPERTY_REAL_ESTATE",
    description: "Hợp đồng quy định rõ ràng quyền lợi hai bên, điều khoản tiền cọc, bảo trì tài sản và thời hạn báo trước chấm dứt hợp đồng.",
    applicableLaws: [
      "Bộ luật Dân sự 2015 (Điều 472 đến Điều 482)",
      "Luật Nhà ở 2023 (Điều 161, 162)",
      "Luật Kinh doanh Bất động sản 2023"
    ],
    fields: [
      { id: "lessorName", label: "Họ tên Bên Cho Thuê (Bên A)", type: "text", required: true },
      { id: "lessorAddress", label: "Địa chỉ thường trú Bên A", type: "text", required: true },
      { id: "lesseeName", label: "Họ tên Bên Thuê (Bên B)", type: "text", required: true },
      { id: "lesseeAddress", label: "Địa chỉ thường trú Bên B", type: "text", required: true },
      { id: "propertyAddress", label: "Địa chỉ tài sản cho thuê", type: "text", required: true },
      { id: "monthlyRent", label: "Giá thuê mỗi tháng (VNĐ)", type: "number", required: true },
      { id: "depositAmount", label: "Số tiền đặt cọc (VNĐ)", type: "number", required: true },
      { id: "leaseDurationMonths", label: "Thời hạn thuê (Số tháng)", type: "number", required: true, placeholder: "12" },
      { id: "noticeDays", label: "Số ngày báo trước khi chấm dứt hợp đồng", type: "number", required: true, placeholder: "30" }
    ]
  },
  {
    id: "giay-uy-quyen",
    title: "Giấy Ủy Quyền Giải Quyết Công Việc Cá Nhân",
    category: "AUTHORIZATION",
    description: "Văn bản ủy quyền đại diện thực hiện các thủ tục hành chính, nộp hồ sơ, hoặc nhận văn bản giấy tờ hợp pháp.",
    applicableLaws: [
      "Bộ luật Dân sự 2015 (Điều 138, Điều 562 về Hợp đồng và Giấy ủy quyền)"
    ],
    fields: [
      { id: "mandatorName", label: "Người ủy quyền", type: "text", required: true },
      { id: "mandatorCccd", label: "CCCD người ủy quyền", type: "text", required: true },
      { id: "agentName", label: "Người được ủy quyền", type: "text", required: true },
      { id: "agentCccd", label: "CCCD người được ủy quyền", type: "text", required: true },
      { id: "scopeOfAuthority", label: "Phạm vi và nội dung ủy quyền chi tiết", type: "textarea", required: true },
      { id: "validityPeriod", label: "Thời hạn ủy quyền (từ ngày đến ngày)", type: "text", required: true }
    ]
  }
];
