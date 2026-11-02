import { z } from "zod";
import type { Citation } from "@legal-mind/legal-schemas";

const GroundedClaimSchema = z.object({
  text: z.string().trim().min(1).max(500),
  evidence: z.array(z.object({
    citationId: z.string().min(1),
    quote: z.string().trim().min(20).max(1200),
  }).strict()).min(1).max(3),
}).strict();

const GroundedAnswerSchema = z.object({
  claims: z.array(GroundedClaimSchema).max(5),
  abstention: z.string().trim().max(400).optional(),
}).strict();

export type GroundedClaim = z.infer<typeof GroundedClaimSchema>;

function normalizeText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi");
}

function normalizeVietnameseSourceText(value: string): string {
  let normalized = normalizeText(value);
  const toneGroups = ["àèìòùỳ", "áéíóúý", "ảẻỉỏủỷ", "ãẽĩõũỹ", "ạẹịọụỵ"];
  const oTones = ["ò", "ó", "ỏ", "õ", "ọ"];
  const uTones = ["ù", "ú", "ủ", "ũ", "ụ"];

  for (let toneIndex = 0; toneIndex < toneGroups.length; toneIndex++) {
    for (const markedVowel of toneGroups[toneIndex]) {
      const baseVowel = markedVowel.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const toneOnO = `${oTones[toneIndex]}${baseVowel}`;
      const toneOnU = `${uTones[toneIndex]}${baseVowel}`;
      normalized = normalized.replaceAll(`o${markedVowel}`, toneOnO).replaceAll(`u${markedVowel}`, toneOnU);
    }
  }

  return normalized;
}

function extractNumbers(value: string): Set<string> {
  return new Set(
    [...value.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => match[0].replace(",", "."))
  );
}

export function validateGroundedAnswer(
  rawOutput: string,
  query: string,
  citations: Citation[],
  onReject?: (reason: string) => void
): GroundedClaim[] | null {
  const reject = (reason: string) => {
    onReject?.(reason);
    return null;
  };

  let parsedJson: unknown;
  try {
    const unfenced = rawOutput
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    try {
      parsedJson = JSON.parse(unfenced);
    } catch {
      const objectStart = unfenced.indexOf("{");
      const objectEnd = unfenced.lastIndexOf("}");
      if (objectStart < 0 || objectEnd <= objectStart) return reject("invalid_json");
      parsedJson = JSON.parse(unfenced.slice(objectStart, objectEnd + 1));
    }
  } catch {
    return reject("invalid_json");
  }

  const parsed = GroundedAnswerSchema.safeParse(parsedJson);
  if (!parsed.success) return reject(`invalid_schema:${parsed.error.issues.map((issue) => issue.code).join(",")}`);
  if (parsed.data.claims.length === 0) return reject("no_claims");

  const citationsById = new Map(citations.map((citation) => [citation.id, citation]));
  const queryNumbers = extractNumbers(query);

  for (const claim of parsed.data.claims) {
    const evidenceText: string[] = [];
    for (const evidence of claim.evidence) {
      const citation = citationsById.get(evidence.citationId);
      if (!citation) return reject("citation_not_in_retrieval");
      const quoteParts = evidence.quote.split(/(?<=[.!?])\s+/u).map((part) => part.trim()).filter(Boolean);
      for (const quotePart of quoteParts) {
        if (!normalizeVietnameseSourceText(citation.contentSnippet).includes(normalizeVietnameseSourceText(quotePart))) {
          return reject("quote_not_exact_source_substring");
        }
        evidenceText.push(quotePart);
      }
    }

    const claimText = normalizeText(claim.text);
    const combinedEvidence = normalizeText(evidenceText.join(" "));
    const hasViolationInClaim = /(không được phép|không được vượt quá|vượt quá|không có hiệu lực|không hợp lệ|không hợp pháp|vi phạm|trái pháp luật|bất hợp pháp|bị cấm|bị vô hiệu)/i.test(claimText);
    const isPermissionConclusion = /(được phép|được chấp nhận|không vi phạm|không phạm luật|hợp pháp|hợp lệ|đúng quy định|không bị cấm)/i.test(claimText) && !hasViolationInClaim;
    const contradictsSourceLimit = /(không được phép|không được vượt quá|vượt quá|không có hiệu lực|không hợp lệ|không hợp pháp|vi phạm|trái pháp luật|bất hợp pháp|không được chấp nhận|bị cấm|bị vô hiệu)/i.test(combinedEvidence);
    if (isPermissionConclusion && contradictsSourceLimit) {
      return reject("unsupported_permission_conclusion");
    }

    const evidenceNumbers = extractNumbers(evidenceText.join(" "));
    for (const evidence of claim.evidence) {
      const citation = citationsById.get(evidence.citationId)!;
      evidenceNumbers.add(String(citation.articleNumber));
      for (const number of extractNumbers(`${citation.documentTitle} ${citation.documentCode}`)) {
        evidenceNumbers.add(number);
      }
      for (const number of extractNumbers(citation.contentSnippet)) {
        evidenceNumbers.add(number);
      }
    }
    for (const number of extractNumbers(claim.text)) {
      if (!evidenceNumbers.has(number) && !queryNumbers.has(number)) return reject(`unsupported_number:${number}`);
    }
  }

  return parsed.data.claims;
}
