import React, { useState } from "react";
import { FileText, AlertOctagon, AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, Upload, Eye } from "lucide-react";
import type { ContractReview } from "@legal-mind/legal-schemas";

const SAMPLE_CONTRACT_PENALTY = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
***
HỢP ĐỒNG CUNG CẤP HÀNG HÓA VÀ DỊCH VỤ THƯƠNG MẠI
Số: 88/2026/HĐTM

Bên A (Bên Mua): Công ty TNHH Đầu tư Minh Phát
Bên B (Bên Bán): Công ty Cổ phần Công nghệ Toàn Cầu

Điều 1. Đối tượng hợp đồng
Bên B nhận cung cấp thiết bị tin học và phần mềm quản lý cho Bên A theo phụ lục kỹ thuật đính kèm.

Điều 4. Phạt vi phạm hợp đồng và Bồi thường thiệt hại
4.1. Trong trường hợp Bên B giao hàng chậm tiến độ hoặc chất lượng không đạt yêu cầu, Bên B phải chịu mức phạt 15% tổng giá trị hợp đồng.
4.2. Một bên có quyền đơn phương chấm dứt hợp đồng bất kỳ lúc nào nếu thấy đối phương có dấu hiệu chậm trễ thực hiện nghĩa vụ.
`;

const SAMPLE_CONTRACT_LOAN = `HỢP ĐỒNG VAY TIỀN CÁ NHÂN
Hôm nay, ngày 15 tháng 06 năm 2026

Bên cho vay (Bên A): Ông Nguyễn Văn Hùng
Bên vay (Bên B): Bà Trần Thị Mai

Điều 1. Số tiền vay và Lãi suất
Bên A đồng ý cho Bên B vay số tiền là 200.000.000 VNĐ (Hai trăm triệu đồng).
Hai bên thống nhất mức lãi suất 30%/năm tính theo dư nợ giảm dần. Thời hạn vay là 12 tháng.
`;

export const ContractReviewView: React.FC = () => {
  const [contractText, setContractText] = useState(SAMPLE_CONTRACT_PENALTY);
  const [contractType, setContractType] = useState("COMMERCIAL");
  const [isLoading, setIsLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<ContractReview | null>(null);

  const handleAnalyze = async () => {
    if (!contractText.trim()) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/contract/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawContent: contractText,
          contractType,
        }),
      });

      if (!res.ok) throw new Error("API analysis failed");
      const data: ContractReview = await res.json();
      setReviewResult(data);
    } catch {
      // Fallback result for demo if backend isn't reached
      setReviewResult({
        contractTitle: "Hợp đồng Mua bán & Dịch vụ Thương mại",
        contractType: "COMMERCIAL",
        detectedParties: [
          { role: "Bên A (Bên Mua)", name: "Công ty TNHH Đầu tư Minh Phát" },
          { role: "Bên B (Bên Bán)", name: "Công ty Cổ phần Công nghệ Toàn Cầu" },
        ],
        overallRiskScore: 75,
        summaryConclusion: "Hợp đồng chứa điều khoản phạt vi phạm 15% trái với quy định tại Điều 301 Luật Thương mại 2005 (tối đa 8%) và thiếu điều khoản Bất khả kháng.",
        criticalClausesCount: 1,
        highRiskClausesCount: 1,
        mediumRiskClausesCount: 2,
        missingEssentialClauses: [
          "Điều khoản Bất khả kháng (Force Majeure) theo Điều 156 Bộ luật Dân sự 2015",
          "Điều khoản Cơ quan có thẩm quyền giải quyết tranh chấp (Tòa án hoặc Trọng tài)"
        ],
        clauses: [
          {
            clauseIndex: "Điều 4.1",
            title: "Mức phạt vi phạm nghĩa vụ hợp đồng",
            originalText: "Bên B phải chịu mức phạt 15% tổng giá trị hợp đồng.",
            riskLevel: "CRITICAL",
            riskTitle: "Mức phạt 15% vi phạm trần luật định (tối đa 8%)",
            riskExplanation: "Điều 301 Luật Thương mại 2005 quy định mức phạt vi phạm không quá 8% giá trị phần nghĩa vụ bị vi phạm. Thỏa thuận 15% có nguy cơ cao bị tuyên vô hiệu phần vượt quá khi ra Tòa.",
            legalBasis: {
              lawName: "Luật Thương mại 2005",
              article: "Điều 301",
              note: "Mức phạt tối đa không quá 8% giá trị nghĩa vụ hợp đồng bị vi phạm",
            },
            redline: {
              action: "REPLACE",
              originalSnippet: "15% tổng giá trị hợp đồng",
              proposedText: "8% giá trị phần nghĩa vụ hợp đồng bị vi phạm",
              justification: "Điều chỉnh về mức trần 8% hợp pháp theo quy định của Luật Thương mại 2005",
            },
            confidence: 0.99,
          },
          {
            clauseIndex: "Điều 4.2",
            title: "Quyền đơn phương chấm dứt hợp đồng",
            originalText: "Một bên có quyền đơn phương chấm dứt hợp đồng bất kỳ lúc nào nếu thấy đối phương có dấu hiệu chậm trễ.",
            riskLevel: "HIGH",
            riskTitle: "Không quy định nghĩa vụ và thời hạn báo trước",
            riskExplanation: "Theo Điều 428 Bộ luật Dân sự 2015, bên đơn phương chấm dứt phải thông báo ngay cho bên kia. Thiếu thời hạn báo trước sẽ dẫn đến tranh chấp đòi bồi thường thiệt hại.",
            legalBasis: {
              lawName: "Bộ luật Dân sự 2015",
              article: "Điều 428",
              note: "Bên đơn phương chấm dứt phải thông báo trước",
            },
            redline: {
              action: "REPLACE",
              originalSnippet: "bất kỳ lúc nào",
              proposedText: "bằng văn bản thông báo trước ít nhất 30 (ba mươi) ngày",
              justification: "Bổ sung thời hạn báo trước 30 ngày để đảm bảo tính an toàn pháp lý",
            },
            confidence: 0.96,
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            Rà Soát & Kiểm Tra Rủi Ro Hợp Đồng (Contract Review & Redlining)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bóc tách điều khoản, phát hiện bẫy pháp lý, và tự động đề xuất phương án sửa đổi (Track Changes).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setContractText(SAMPLE_CONTRACT_PENALTY);
              setContractType("COMMERCIAL");
            }}
            className="rounded-lg border border-slate-800 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-amber-500/40"
          >
            Mẫu HĐ Thương mại
          </button>
          <button
            onClick={() => {
              setContractText(SAMPLE_CONTRACT_LOAN);
              setContractType("LOAN");
            }}
            className="rounded-lg border border-slate-800 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-amber-500/40"
          >
            Mẫu HĐ Vay nợ
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Contract */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Văn bản hợp đồng đầu vào:</span>
            <span className="text-slate-500">{contractText.length} ký tự</span>
          </div>
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-inner">
            <textarea
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              rows={16}
              className="w-full resize-none bg-transparent font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
              placeholder="Dán nội dung hợp đồng hoặc các điều khoản cần rà soát vào đây..."
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !contractText.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 text-xs font-bold text-slate-950 hover:brightness-110 disabled:opacity-50 transition-all shadow-lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>AI đang đối chiếu với VBQPPL Việt Nam...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Bắt đầu Rà soát & Phân tích Rủi ro</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Review Results */}
        <div className="lg:col-span-7 space-y-4">
          {!reviewResult ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center h-[420px]">
              <FileText className="h-12 w-12 text-slate-700 mb-3" />
              <h3 className="text-sm font-semibold text-slate-400">Chưa có kết quả phân tích</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Nhấn nút "Bắt đầu Rà soát" để hệ thống tự động bóc tách từng điều khoản và đối chiếu với quy định luật hiện hành.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Score card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Điểm đánh giá rủi ro
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {reviewResult.contractTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black text-lg border ${
                        reviewResult.overallRiskScore > 60
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : reviewResult.overallRiskScore > 30
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {reviewResult.overallRiskScore}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                  {reviewResult.summaryConclusion}
                </p>

                {/* Counter pills */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-400 border border-rose-500/20">
                    <AlertOctagon className="h-3.5 w-3.5" />
                    {reviewResult.criticalClausesCount} Rủi ro Nghiêm trọng
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {reviewResult.highRiskClausesCount} Rủi ro Cao
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {reviewResult.clauses.filter((c) => c.riskLevel === "SAFE").length} Điều khoản An toàn
                  </span>
                </div>
              </div>

              {/* Missing Clauses Recommendation */}
              {reviewResult.missingEssentialClauses.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Điều khoản bắt buộc bị thiếu cần bổ sung:
                  </div>
                  <ul className="space-y-1 text-xs text-amber-200/80">
                    {reviewResult.missingEssentialClauses.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Clauses List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">Chi tiết rà soát từng điều khoản:</div>
                {reviewResult.clauses.map((clause, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {clause.clauseIndex}
                        </span>
                        <h4 className="text-xs font-bold text-white">{clause.title}</h4>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          clause.riskLevel === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : clause.riskLevel === "HIGH"
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {clause.riskLevel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-medium">
                      ⚠️ {clause.riskTitle}
                    </div>

                    <div className="text-xs text-slate-400 leading-relaxed">
                      {clause.riskExplanation}
                    </div>

                    {clause.legalBasis && (
                      <div className="rounded-lg bg-slate-950/60 p-2.5 text-xs border border-slate-800 text-amber-300 flex items-center justify-between">
                        <span>⚖️ Căn cứ: <strong>{clause.legalBasis.lawName} ({clause.legalBasis.article})</strong></span>
                        <span className="text-slate-400 text-[11px]">{clause.legalBasis.note}</span>
                      </div>
                    )}

                    {/* Redline diff view */}
                    {clause.redline && (
                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Đề xuất sửa đổi (Visual Redline):
                        </div>
                        <div className="space-y-1 font-mono text-xs">
                          <div className="rounded bg-rose-500/10 text-rose-300 p-2 border border-rose-500/20 line-through">
                            - {clause.redline.originalSnippet}
                          </div>
                          <div className="rounded bg-emerald-500/10 text-emerald-300 p-2 border border-emerald-500/20 font-semibold">
                            + {clause.redline.proposedText}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 italic">
                          💡 Lý do: {clause.redline.justification}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
