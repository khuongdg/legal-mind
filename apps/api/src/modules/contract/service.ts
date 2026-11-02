import type { ContractReview, ContractType, RiskLevel } from "@legal-mind/legal-schemas";

export class ContractReviewService {
  async analyzeContract(rawText: string, contractType: ContractType = "COMMERCIAL"): Promise<ContractReview> {
    const textLower = rawText.toLowerCase();

    const clauses: ContractReview["clauses"] = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    // Rule 1: Phạt vi phạm quá 8% (Luật Thương mại 2005 Điều 301)
    const penaltyMatch = rawText.match(/phạt\s+(\d+)%/i) || rawText.match(/mức\s+phạt.*?(\d+)%/i);
    if (penaltyMatch) {
      const percent = parseInt(penaltyMatch[1]);
      if (percent > 8 && contractType === "COMMERCIAL") {
        criticalCount++;
        clauses.push({
          clauseIndex: "Điều khoản Phạt vi phạm",
          title: "Thỏa thuận mức phạt vi phạm nghĩa vụ",
          originalText: penaltyMatch[0],
          riskLevel: "CRITICAL",
          riskTitle: `Mức phạt ${percent}% vượt quá trần quy định của Luật Thương mại`,
          riskExplanation: `Điều 301 Luật Thương mại 2005 quy định mức phạt vi phạm nghĩa vụ hợp đồng tối đa không quá 8% giá trị phần nghĩa vụ bị vi phạm. Thỏa thuận ${percent}% có nguy cơ bị Tòa án tuyên vô hiệu phần vượt quá.`,
          legalBasis: {
            lawName: "Luật Thương mại 2005",
            article: "Điều 301",
            note: "Mức phạt tối đa không quá 8% giá trị nghĩa vụ vi phạm",
          },
          redline: {
            action: "REPLACE",
            originalSnippet: `${percent}%`,
            proposedText: "8% giá trị phần nghĩa vụ hợp đồng bị vi phạm",
            justification: "Điều chỉnh về mức trần 8% hợp pháp theo quy định của Luật Thương mại 2005",
          },
          confidence: 0.99,
        });
      }
    }

    // Rule 2: Lãi suất vượt quá 20%/năm (Bộ luật Dân sự 2015 Điều 468)
    const interestMatch = rawText.match(/lãi\s+suất.*?(\d+)%/i);
    if (interestMatch) {
      const rate = parseInt(interestMatch[1]);
      if (rate > 20) {
        criticalCount++;
        clauses.push({
          clauseIndex: "Điều khoản Lãi suất",
          title: "Thỏa thuận mức lãi suất",
          originalText: interestMatch[0],
          riskLevel: "CRITICAL",
          riskTitle: `Lãi suất ${rate}%/năm vượt quá trần 20%/năm`,
          riskExplanation: "Khoản 1 Điều 468 Bộ luật Dân sự 2015 quy định mức lãi suất cho vay theo thỏa thuận không được vượt quá 20%/năm. Mức lãi suất vượt quá sẽ không có hiệu lực pháp luật.",
          legalBasis: {
            lawName: "Bộ luật Dân sự 2015",
            article: "Điều 468 Khoản 1",
            note: "Mức lãi suất tối đa không quá 20%/năm",
          },
          redline: {
            action: "REPLACE",
            originalSnippet: `${rate}%`,
            proposedText: "20%/năm",
            justification: "Giảm mức lãi suất về mức tối đa luật định để tránh bị tuyên vô hiệu",
          },
          confidence: 0.98,
        });
      }
    }

    // Rule 3: Đơn phương chấm dứt hợp đồng không báo trước
    if (textLower.includes("đơn phương chấm dứt") && !textLower.includes("báo trước")) {
      highCount++;
      clauses.push({
        clauseIndex: "Điều khoản Chấm dứt hợp đồng",
        title: "Quyền đơn phương chấm dứt",
        originalText: "Một bên có quyền đơn phương chấm dứt hợp đồng bất kỳ lúc nào.",
        riskLevel: "HIGH",
        riskTitle: "Đơn phương chấm dứt không quy định thời hạn báo trước",
        riskExplanation: "Không quy định thời hạn báo trước và căn cứ chính đáng dễ dẫn đến tranh chấp bồi thường thiệt hại ngoài hợp đồng khi một bên dừng đột ngột.",
        legalBasis: {
          lawName: "Bộ luật Dân sự 2015",
          article: "Điều 428",
          note: "Phải thông báo ngay cho bên kia biết, nếu không thông báo mà gây thiệt hại thì phải bồi thường",
        },
        redline: {
          action: "REPLACE",
          originalSnippet: "bất kỳ lúc nào",
          proposedText: "bằng văn bản thông báo trước ít nhất 30 (ba mươi) ngày",
          justification: "Quy định rõ thời hạn báo trước 30 ngày để các bên chủ động bàn giao công việc",
        },
        confidence: 0.95,
      });
    }

    // Rule 4: Thiếu điều khoản Bất khả kháng
    const missing: string[] = [];
    if (!textLower.includes("bất khả kháng") && !textLower.includes("force majeure")) {
      mediumCount++;
      missing.push("Điều khoản Bất khả kháng (Force Majeure) theo Điều 156 Bộ luật Dân sự 2015");
    }

    // Rule 5: Thiếu điều khoản Tài phán giải quyết tranh chấp
    if (!textLower.includes("tòa án") && !textLower.includes("trọng tài")) {
      mediumCount++;
      missing.push("Điều khoản Cơ quan có thẩm quyền giải quyết tranh chấp (Tòa án nhân dân hoặc Trọng tài thương mại)");
    }

    // Add general safe clause demo if empty
    if (clauses.length === 0) {
      clauses.push({
        clauseIndex: "Điều 1",
        title: "Mục đích và phạm vi công việc",
        originalText: "Các bên cam kết thực hiện đúng trách nhiệm theo thỏa thuận hợp đồng.",
        riskLevel: "SAFE",
        riskTitle: "Điều khoản chuẩn xác",
        riskExplanation: "Nội dung rõ ràng, phù hợp quy định pháp luật hiện hành.",
        confidence: 0.99,
      });
    }

    // Compute overall score
    const riskScore = Math.min(100, criticalCount * 35 + highCount * 20 + mediumCount * 10);

    return {
      contractTitle: "Văn bản Hợp đồng Phân tích",
      contractType,
      detectedParties: [
        { role: "Bên A (Bên giao việc / Cho thuê)", name: "Công ty / Cá nhân Bên A" },
        { role: "Bên B (Bên thực hiện / Thuê)", name: "Công ty / Cá nhân Bên B" },
      ],
      overallRiskScore: riskScore,
      summaryConclusion:
        riskScore > 60
          ? "Hợp đồng có nhiều rủi ro nghiêm trọng (đặc biệt về phạt vi phạm và thẩm quyền) cần điều chỉnh trước khi ký kết."
          : riskScore > 30
          ? "Hợp đồng ở mức rủi ro trung bình, cần bổ sung một số điều khoản bảo vệ quyền lợi."
          : "Hợp đồng tương đối an toàn, các điều khoản cơ bản tuân thủ đúng khung pháp luật.",
      criticalClausesCount: criticalCount,
      highRiskClausesCount: highCount,
      mediumRiskClausesCount: mediumCount,
      missingEssentialClauses: missing,
      clauses,
    };
  }
}
