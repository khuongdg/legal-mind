import React, { useState, useEffect } from "react";
import { PenTool, CheckCircle, Copy, Download, BookOpen, ArrowRight, ShieldCheck, FileCheck } from "lucide-react";
import type { DraftingTemplate, GeneratedDocument } from "@legal-mind/legal-schemas";

export const LegalDraftingView: React.FC = () => {
  const [templates, setTemplates] = useState<DraftingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("don-khoi-kien-doi-no");
  const [formData, setFormData] = useState<Record<string, any>>({
    courtName: "Tòa án nhân dân Quận 1, Thành phố Hồ Chí Minh",
    plaintiffName: "Nguyễn Văn An",
    plaintiffCccd: "079201004567",
    plaintiffAddress: "123 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP.HCM",
    defendantName: "Trần Quốc Bảo",
    defendantAddress: "456 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
    loanAmount: "150000000",
    loanDate: "2025-05-10",
    dueDate: "2026-05-10",
    evidenceList: "Giấy biên nhận vay tiền có chữ ký hai bên, sao kê chuyển khoản ngân hàng Vietcombank ngày 10/05/2025.",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/drafting/templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTemplates(data);
        }
      })
      .catch(() => {
        // Fallback default templates if backend not yet running
        setTemplates([
          {
            id: "don-khoi-kien-doi-no",
            title: "Đơn Khởi Kiện Đòi Nợ (Tranh Chấp Hợp Đồng Vay Tài Sản)",
            category: "CIVIL_DISPUTE",
            description: "Mẫu đơn chuẩn gửi Tòa án nhân dân theo quy định của Bộ luật Tố tụng Dân sự 2015 và BLDS 2015.",
            applicableLaws: [
              "Bộ luật Dân sự 2015 (Điều 463, Điều 466, Điều 468)",
              "Bộ luật Tố tụng Dân sự 2015 (Điều 189)"
            ],
            fields: [
              { id: "courtName", label: "Tòa án có thẩm quyền tiếp nhận", type: "text", required: true },
              { id: "plaintiffName", label: "Họ tên người khởi kiện (Bên cho vay)", type: "text", required: true },
              { id: "plaintiffCccd", label: "Số CCCD người khởi kiện", type: "text", required: true },
              { id: "plaintiffAddress", label: "Địa chỉ thường trú người khởi kiện", type: "text", required: true },
              { id: "defendantName", label: "Họ tên người bị kiện (Bên vay)", type: "text", required: true },
              { id: "defendantAddress", label: "Địa chỉ cư trú người bị kiện", type: "text", required: true },
              { id: "loanAmount", label: "Số tiền gốc đã vay (VNĐ)", type: "number", required: true },
              { id: "loanDate", label: "Ngày ký giấy vay / chuyển khoản", type: "date", required: true },
              { id: "dueDate", label: "Hạn chót cam kết trả nợ", type: "date", required: true },
              { id: "evidenceList", label: "Chứng cứ đính kèm", type: "textarea", required: true }
            ]
          }
        ]);
      });
  }, []);

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/drafting/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          formData,
          outputFormat: "MARKDOWN",
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data: GeneratedDocument = await res.json();
      setGeneratedDoc(data);
    } catch {
      // Fallback generation for demo
      const today = new Date();
      setGeneratedDoc({
        documentTitle: currentTemplate?.title || "Đơn Khởi Kiện Đòi Nợ",
        category: "CIVIL_DISPUTE",
        contentMarkdown: `**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**  
**Độc lập - Tự do - Hạnh phúc**  
***  
*Hà Nội, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}*

# ĐƠN KHỞI KIỆN
*(V/v: Tranh chấp hợp đồng vay tài sản)*

**Kính gửi:** **${formData.courtName}**

**I. NGƯỜI KHỞI KIỆN:**  
- Họ và tên: **${formData.plaintiffName}**  
- Số CCCD: ${formData.plaintiffCccd}  
- Địa chỉ: ${formData.plaintiffAddress}  

**II. NGƯỜI BỊ KIỆN:**  
- Họ và tên: **${formData.defendantName}**  
- Địa chỉ: ${formData.defendantAddress}  

**III. NỘI DUNG SỰ VIỆC VÀ CĂN CỨ KHỞI KIỆN:**  
Vào ngày ${formData.loanDate}, tôi đã cho người bị kiện vay số tiền gốc là: **${Number(formData.loanAmount).toLocaleString("vi-VN")} VNĐ**. Thời hạn cam kết hoàn trả là ngày ${formData.dueDate}. Đến nay người bị kiện vẫn trốn tránh không hoàn trả.

**Căn cứ pháp lý:** Điều 463, 466, 468 Bộ luật Dân sự 2015.

**IV. YÊU CẦU TÒA ÁN GIẢI QUYẾT:**  
1. Buộc người bị kiện hoàn trả ngay số nợ gốc: **${Number(formData.loanAmount).toLocaleString("vi-VN")} VNĐ**.  
2. Buộc trả lãi suất chậm trả theo quy định pháp luật.

**NGƯỜI KHỞI KIỆN**  
*(Ký và ghi rõ họ tên)*  



**${formData.plaintiffName}**`,
        legalBasis: currentTemplate?.applicableLaws || [],
        instructionsForFiling: [
          "In văn bản ra giấy A4 thành 02 bản chính.",
          "Ký và ghi rõ họ tên người làm đơn.",
          "Nộp kèm chứng cứ sao kê và giấy vay nợ tại Bộ phận một cửa của Tòa án nhân dân có thẩm quyền."
        ],
        recommendedAttachments: [
          "Bản sao CCCD",
          "Giấy biên nhận vay tiền / Hợp đồng vay",
          "Sao kê giao dịch ngân hàng"
        ],
        generatedAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedDoc?.contentMarkdown) {
      navigator.clipboard.writeText(generatedDoc.contentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <PenTool className="h-5 w-5 text-amber-400" />
          Hỗ Trợ Soạn Thảo Văn Bản & Đơn Từ Pháp Lý (Legal Drafting Wizard)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Tự động áp dụng chuẩn thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP) và viện dẫn căn cứ pháp lý hiện hành.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Form fields */}
        <div className="lg:col-span-5 space-y-4">
          {/* Template picker */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <label className="text-xs font-bold text-slate-300">Chọn mẫu văn bản / đơn từ:</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-amber-400 focus:outline-none focus:border-amber-500"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {currentTemplate?.description}
            </p>
          </div>

          {/* Form input wizard */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3 max-h-[460px] overflow-y-auto">
            <div className="text-xs font-bold text-slate-300 mb-2">Điền thông tin vụ việc:</div>
            {currentTemplate?.fields?.map((field) => (
              <div key={field.id} className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <span>{field.label}</span>
                  {field.required && <span className="text-amber-500">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 text-xs font-bold text-slate-950 hover:brightness-110 disabled:opacity-50 transition-all shadow-lg"
          >
            <FileCheck className="h-4 w-4" />
            <span>Tự Động Sinh Văn Bản Chuẩn Thể Thức</span>
          </button>
        </div>

        {/* Right Output: Preview document */}
        <div className="lg:col-span-7 space-y-4">
          {!generatedDoc ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center h-[520px]">
              <PenTool className="h-12 w-12 text-slate-700 mb-3" />
              <h3 className="text-sm font-semibold text-slate-400">Xem trước văn bản</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Điền thông tin vụ việc ở cột bên trái và nhấn "Tự Động Sinh Văn Bản" để xem kết quả format chuẩn Nghị định 30/2020/NĐ-CP.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Header actions */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{generatedDoc.documentTitle}</h4>
                    <span className="text-[10px] text-slate-400">Tạo lúc: {new Date(generatedDoc.generatedAt).toLocaleTimeString("vi-VN")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:border-amber-500/50"
                  >
                    {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Đã sao chép!" : "Sao chép"}</span>
                  </button>
                </div>
              </div>

              {/* Document paper preview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl font-serif text-slate-200 text-xs leading-relaxed max-h-[460px] overflow-y-auto whitespace-pre-wrap">
                {generatedDoc.contentMarkdown}
              </div>

              {/* Instructions Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-xs space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Hướng dẫn nộp hồ sơ & Án phí:</span>
                </div>
                <ul className="space-y-1 text-slate-400 pl-4 list-disc">
                  {generatedDoc.instructionsForFiling.map((ins, idx) => (
                    <li key={idx}>{ins}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
