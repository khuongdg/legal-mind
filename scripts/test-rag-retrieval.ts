import { getDbPool } from "../packages/db/src/client";
import { LegalRAGService } from "../apps/api/src/modules/rag/service";
import { LegalChatService } from "../apps/api/src/modules/chat/service";
import { validateGroundedAnswer } from "../apps/api/src/modules/chat/grounding";
import {
  answerDocumentDateQuestion,
  answerDocumentIssuingAuthorityQuestion,
  answerKnowledgeCoverageQuestion,
} from "../apps/api/src/modules/chat/service";

const cases = [
  {
    query: "Lãi suất vay 25% một năm có hợp pháp không?",
    expectedArticle: 468,
  },
  {
    query: "Vay tiền thì lãi suất tối đa theo luật là bao nhiêu?",
    expectedArticle: 468,
  },
  {
    query: "Bên nhận cọc từ chối giao kết hợp đồng thì phải trả gì?",
    expectedArticle: 328,
  },
];

const noEvidenceCases = [
  "Quy trình cấp giấy phép khai thác tàu bay dân dụng như thế nào?",
  "Nhiệt độ sôi của nước ở mực nước biển là bao nhiêu?",
  "Thủ tục đăng ký nhãn hiệu hàng hóa tại Cục Sở hữu trí tuệ gồm những bước nào?",
];

const rag = new LegalRAGService();
const pool = getDbPool();

try {
  const corpus = await pool.query<{ chunks: number; embeddedChunks: number }>(
    `SELECT count(*)::int AS chunks,
            count(embedding)::int AS "embeddedChunks"
     FROM legal_chunks
     WHERE document_id = $1;`,
    ["blds-2015"]
  );
  const { chunks, embeddedChunks } = corpus.rows[0];

  if (chunks === 0 || chunks !== embeddedChunks) {
    throw new Error(`Civil Code corpus is incomplete: ${chunks} chunks, ${embeddedChunks} embeddings.`);
  }

  console.log(`Civil Code corpus ready: ${chunks} chunks, ${embeddedChunks} embeddings.`);

  const dateMetadata = {
    documentTitle: "Bộ luật Dân sự 2015",
    articleCount: 689,
    issuedDate: "2015-11-24",
    effectiveDate: "2017-01-01",
    status: "ACTIVE",
    issuingAuthority: "QUOC_HOI",
  };
  const issuedDateReply = answerDocumentDateQuestion("Bộ luật Dân sự 2015 ban hành khi nào?", dateMetadata);
  if (!issuedDateReply?.includes("ban hành ngày 24/11/2015") || !issuedDateReply.includes("hiệu lực là 01/01/2017")) {
    throw new Error(`Promulgation date response confused/missed dates: ${issuedDateReply}`);
  }
  console.log("PASS: promulgation-date answer reports issuance date separately from effective date.");

  const effectiveDateReply = answerDocumentDateQuestion("Bộ luật Dân sự 2015 có hiệu lực khi nào?", dateMetadata);
  if (!effectiveDateReply?.includes("hiệu lực từ ngày 01/01/2017") || !effectiveDateReply.includes("ban hành ngày 24/11/2015")) {
    throw new Error(`Effective-date response confused/missed dates: ${effectiveDateReply}`);
  }
  console.log("PASS: effective-date answer reports effective date separately from promulgation date.");

  const issuingAuthorityReply = answerDocumentIssuingAuthorityQuestion("Bộ luật Dân sự do ai ban hành?", dateMetadata);
  if (!issuingAuthorityReply?.includes("do Quốc hội ban hành") || /24\/11\/2015|01\/01\/2017/.test(issuingAuthorityReply)) {
    throw new Error(`Issuing authority answer returned date information instead: ${issuingAuthorityReply}`);
  }
  if (answerDocumentDateQuestion("Bộ luật Dân sự do ai ban hành?", dateMetadata) !== null) {
    throw new Error("Issuing authority question was misclassified as an issuance-date question.");
  }
  console.log("PASS: 'do ai ban hành' returns the issuing authority, not dates.");

  const coverageReply = answerKnowledgeCoverageQuestion(
    "Những bộ luật nào đang có thông tin để tôi hỏi?",
    [dateMetadata]
  );
  if (!coverageReply?.includes("Bộ luật Dân sự 2015") || !coverageReply.includes("689 Điều có dữ liệu")
    || !coverageReply.includes("không phải danh mục đầy đủ")) {
    throw new Error(`Knowledge coverage response missed indexed scope or its limitation: ${coverageReply}`);
  }
  if (answerKnowledgeCoverageQuestion("Bộ luật Dân sự do ai ban hành?", [dateMetadata]) !== null) {
    throw new Error("Document authority question was misclassified as a knowledge coverage question.");
  }
  console.log("PASS: knowledge coverage response lists indexed documents and limits its scope to the loaded corpus.");

  const metadataChat = new LegalChatService(async () => null);
  const issuedDateChatReply = await metadataChat.processLegalChat({
    message: "Ban hành khi nào?",
    messages: [
      { role: "user", content: "Bộ luật Dân sự 2015" },
      { role: "assistant", content: "Bạn muốn biết thông tin nào về văn bản?" },
      { role: "user", content: "Ban hành khi nào?" },
    ],
  });
  if (!issuedDateChatReply.replyText.includes("ban hành ngày 24/11/2015") || !issuedDateChatReply.replyText.includes("hiệu lực là 01/01/2017")) {
    throw new Error(`Chat issuance-date answer used wrong metadata: ${issuedDateChatReply.replyText}`);
  }
  console.log("PASS: chat follow-up 'Ban hành khi nào?' uses issuedDate from PostgreSQL metadata.");

  const effectiveDateChatReply = await metadataChat.processLegalChat({
    message: "Có hiệu lực khi nào?",
    messages: [
      { role: "user", content: "Bộ luật Dân sự 2015" },
      { role: "assistant", content: "Bạn muốn biết thông tin nào về văn bản?" },
      { role: "user", content: "Có hiệu lực khi nào?" },
    ],
  });
  if (!effectiveDateChatReply.replyText.includes("hiệu lực từ ngày 01/01/2017") || !effectiveDateChatReply.replyText.includes("ban hành ngày 24/11/2015")) {
    throw new Error(`Chat effective-date answer used wrong metadata: ${effectiveDateChatReply.replyText}`);
  }
  console.log("PASS: chat follow-up 'Có hiệu lực khi nào?' uses effectiveDate metadata.");

  const issuingAuthorityChatReply = await metadataChat.processLegalChat({
    message: "Bộ luật Dân sự 2015 do ai ban hành?",
  });
  if (!issuingAuthorityChatReply.replyText.includes("do Quốc hội ban hành")
    || /24\/11\/2015|01\/01\/2017/.test(issuingAuthorityChatReply.replyText)) {
    throw new Error(`Chat issuing-authority answer returned the wrong metadata: ${issuingAuthorityChatReply.replyText}`);
  }
  console.log("PASS: chat 'do ai ban hành?' uses issuingAuthority metadata.");

  const coverageChatReply = await metadataChat.processLegalChat({
    message: "Những bộ luật nào đang có thông tin để tôi hỏi thì hệ thống có thể dựa vào những dữ liệu kiến thức đã có để thống kê phạm vi có thể hỏi không?",
  });
  if (!coverageChatReply.replyText.includes("văn bản pháp luật được lập chỉ mục")
    || !coverageChatReply.replyText.includes("Bộ luật Dân sự 2015")
    || !coverageChatReply.replyText.includes("không phải danh mục đầy đủ")) {
    throw new Error(`Chat knowledge coverage response did not reflect the indexed database: ${coverageChatReply.replyText}`);
  }
  console.log("PASS: chat knowledge coverage question reports actual indexed corpus scope.");

  let failures = 0;
  let firstCitationId: string | undefined;
  for (const testCase of cases) {
    const citations = await rag.search({
      query: testCase.query,
      limit: 3,
      effectiveOnly: true,
    });
    const expected = citations.find(
      (citation) => citation.documentId === "blds-2015" && citation.articleNumber === testCase.expectedArticle
    );
    firstCitationId ??= expected?.id;

    const databaseBacked = citations.every((citation) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(citation.id));
    const citationValid = expected
      && expected.documentCode === "91/2015/QH13"
      && expected.issuedDate === "2015-11-24"
      && expected.status === "ACTIVE"
      && expected.contentSnippet.trim().length > 0
      && new URL(expected.officialUrl).protocol === "https:";

    if (!expected || !databaseBacked || !citationValid) {
      failures++;
      console.error(`FAIL: ${testCase.query}`);
      console.error(`  Expected Điều ${testCase.expectedArticle} in top 3 with DB-backed, complete citation metadata.`);
      console.error(`  Results: ${citations.map((citation) => `${citation.documentId}/Điều ${citation.articleNumber}`).join(", ") || "none"}`);
      continue;
    }

    console.log(`PASS: Điều ${expected.articleNumber} - ${expected.articleTitle} | ${expected.documentCode} | ${expected.status}`);
  }

  const wrongTypeResults = await rag.search({
    query: "Lãi suất vay theo Bộ luật Dân sự",
    documentTypes: ["THONG_TU"],
    limit: 3,
    effectiveOnly: true,
  });
  if (wrongTypeResults.length > 0) {
    failures++;
    console.error("FAIL: documentTypes filter returned results outside the requested type.");
  } else {
    console.log("PASS: documentTypes filter excludes non-matching document types.");
  }

  const expiredResults = await rag.search({
    query: "Lãi suất vay theo Bộ luật Dân sự",
    statusFilter: ["EXPIRED"],
    limit: 3,
    effectiveOnly: false,
  });
  if (expiredResults.length > 0) {
    failures++;
    console.error("FAIL: statusFilter returned results outside the requested status.");
  } else {
    console.log("PASS: statusFilter excludes non-matching legal status.");
  }

  if (firstCitationId) {
    const citation = await rag.getCitationById(firstCitationId);
    if (!citation || citation.documentId !== "blds-2015") {
      failures++;
      console.error("FAIL: citation lookup did not return the searched Civil Code citation.");
    } else {
      console.log(`PASS: citation lookup resolves ${citation.documentId}/Điều ${citation.articleNumber}.`);
    }
  }

  const liraSuatCitation = await rag.getCitationById(firstCitationId ?? "");
  if (!liraSuatCitation) throw new Error("Cannot run grounded-answer validation without a real citation.");
  const supportedClaim = JSON.stringify({
    claims: [{
      text: "Lãi suất thỏa thuận 25%/năm vượt giới hạn 20%/năm theo Điều 468; phần lãi vượt quá không có hiệu lực. Nguồn này quy định hệ quả đối với phần lãi vượt giới hạn, không nêu tiền phạt.",
      evidence: [{
        citationId: liraSuatCitation.id,
        quote: "Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 20%/năm của khoản tiền vay",
      }],
    }],
  });
  const acceptedClaim = validateGroundedAnswer(supportedClaim, "Lãi suất vay 25% một năm có hợp pháp không?", [liraSuatCitation]);
  if (!acceptedClaim) {
    failures++;
    console.error("FAIL: rejected a claim supported by an exact citation quote.");
  } else {
    console.log("PASS: accepted claim with a matching citation ID and exact source quote.");
  }

  const documentMetadataNumberClaim = JSON.stringify({
    claims: [{
      text: "Quy định này thuộc Bộ luật Dân sự 2015.",
      evidence: [{
        citationId: liraSuatCitation.id,
        quote: "Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 20%/năm của khoản tiền vay",
      }],
    }],
  });
  if (!validateGroundedAnswer(documentMetadataNumberClaim, "Điều 468 quy định gì?", [liraSuatCitation])) {
    failures++;
    console.error("FAIL: rejected a year supported by cited document metadata.");
  } else {
    console.log("PASS: accepted a year supported by cited document metadata.");
  }

  const separatedSourcePassagesClaim = JSON.stringify({
    claims: [{
      text: "Mức lãi suất thỏa thuận 25%/năm vượt giới hạn 20%/năm; phần lãi vượt giới hạn không có hiệu lực.",
      evidence: [{
        citationId: liraSuatCitation.id,
        quote: "Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 20%/năm của khoản tiền vay, trừ trường hợp luật khác có liên quan quy định khác. Trường hợp lãi suất theo thỏa thuận vượt quá lãi suất giới hạn được quy định tại khoản này thì mức lãi suất vượt quá không có hiệu lực.",
      }],
    }],
  });
  if (!validateGroundedAnswer(separatedSourcePassagesClaim, "Lãi suất vay 25% một năm có hợp pháp không?", [liraSuatCitation])) {
    failures++;
    console.error("FAIL: rejected a grounded conclusion quoting two exact but non-adjacent source sentences.");
  } else {
    console.log("PASS: accepted exact source sentences joined in one model quote.");
  }

  const splitEvidenceNumberClaim = JSON.stringify({
    claims: [{
      text: "Mức lãi suất vượt quá giới hạn 20%/năm không có hiệu lực theo Điều 468.",
      evidence: [{
        citationId: liraSuatCitation.id,
        quote: "Trường hợp lãi suất theo thỏa thuận vượt quá lãi suất giới hạn được quy định tại khoản này thì mức lãi suất vượt quá không có hiệu lực",
      }],
    }],
  });
  if (!validateGroundedAnswer(splitEvidenceNumberClaim, "Vay tiền thì lãi suất tối đa theo luật là bao nhiêu?", [liraSuatCitation])) {
    failures++;
    console.error("FAIL: rejected a number stated elsewhere in the same cited legal provision.");
  } else {
    console.log("PASS: accepted a number supported by the same cited legal provision.");
  }

  const unsupportedClaim = JSON.stringify({
    claims: [{
      text: "Kết luận: Lãi suất vay 25% được phép theo luật.",
      evidence: [{
        citationId: liraSuatCitation.id,
        quote: "Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 20%/năm của khoản tiền vay",
      }],
    }],
  });
  if (validateGroundedAnswer(unsupportedClaim, "Lãi suất vay 25% một năm có hợp pháp không?", [liraSuatCitation])) {
    failures++;
    console.error("FAIL: accepted a legal conclusion that contradicts the source-backed limit.");
  } else {
    console.log("PASS: rejected an unsupported permission conclusion despite a valid citation.");
  }

  const rejectedClaims = [
    {
      name: "unknown citation ID",
      output: supportedClaim.replace(liraSuatCitation.id, "not-a-retrieved-citation"),
    },
    {
      name: "fabricated evidence quote",
      output: JSON.stringify({
        claims: [{
          text: "Điều 468 quy định mức lãi suất trong đoạn này.",
          evidence: [{
            citationId: liraSuatCitation.id,
            quote: "Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 30%/năm của khoản tiền vay",
          }],
        }],
      }),
    },
    {
      name: "unsupported numerical limit",
      output: JSON.stringify({
        claims: [{
          text: "Điều 468 quy định lãi suất vay thỏa thuận không được vượt quá 30%/năm.",
          evidence: [{
            citationId: liraSuatCitation.id,
            quote: "Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 20%/năm của khoản tiền vay",
          }],
        }],
      }),
    },
    {
      name: "unsupported permission conclusion",
      output: JSON.stringify({
        claims: [{
          text: "Kết luận: Lãi suất vay 25% được phép theo luật.",
          evidence: [{
            citationId: liraSuatCitation.id,
            quote: "Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 20%/năm của khoản tiền vay",
          }],
        }],
      }),
    },
  ];
  for (const testCase of rejectedClaims) {
    if (validateGroundedAnswer(testCase.output, "Lãi suất vay 25% một năm có hợp pháp không?", [liraSuatCitation])) {
      failures++;
      console.error(`FAIL: accepted ${testCase.name}.`);
    } else {
      console.log(`PASS: rejected ${testCase.name}.`);
    }
  }

  const chat = new LegalChatService(async (query, citations) => {
    const citation = citations.find((candidate) => candidate.articleNumber === 468);
    if (!citation) return null;
    return validateGroundedAnswer(supportedClaim, query, [citation]);
  }, async () => "LEGAL_RETRIEVAL");

  for (const query of noEvidenceCases) {
    const citations = await rag.search({ query, limit: 3, effectiveOnly: true });
    if (citations.length > 0) {
      failures++;
      console.error(
        `FAIL: no-evidence query returned citation(s): ${query} => ${citations
          .map((citation) => `Điều ${citation.articleNumber} (${citation.documentTitle})`)
          .join(", ")}`
      );
    } else {
      console.log(`PASS: abstained for query outside loaded corpus: ${query}`);
    }
  }

  const groundedChat = await chat.processLegalChat({
    message: "Lãi suất vay 25% một năm có hợp pháp không?",
  });
  const chatIsExtractive = groundedChat.citations.length > 0
    && groundedChat.replyText.includes("Diễn giải dựa trên các căn cứ")
    && groundedChat.replyText.includes("không có hiệu lực")
    && !groundedChat.replyText.includes("[1]")
    && !groundedChat.replyText.includes("Nguồn đối chiếu")
    && groundedChat.citations.every((citation) => !groundedChat.replyText.includes(citation.contentSnippet))
    && !groundedChat.replyText.includes("toàn bộ hợp đồng vay vẫn có hiệu lực");
  if (!chatIsExtractive) {
    failures++;
    console.error("FAIL: chat response exposed source excerpts or did not include an explicit legal-conclusion summary for the compliance question.");
  } else {
    console.log("PASS: chat response only renders validated claims; legal sources remain in citation details.");
  }

  const directComplianceChat = await chat.processLegalChat({
    message: "Cho vay tiền thỏa thuận lãi suất 25%/năm có coi là phạm luật không?",
  });
  if (!/25%\/năm/.test(directComplianceChat.replyText) || !/20%\/năm/.test(directComplianceChat.replyText)
    || !/không có hiệu lực/i.test(directComplianceChat.replyText) || !/không nêu tiền phạt/i.test(directComplianceChat.replyText)) {
    failures++;
    console.error("FAIL: compliance answer did not explain the source-backed legal consequence without inventing a penalty.");
  } else {
    console.log("PASS: compliance answer explains the legal consequence and avoids inventing a penalty.");
  }

  const evidenceOnlyChat = new LegalChatService(async () => null, async () => "LEGAL_RETRIEVAL");
  const evidenceOnlyReply = await evidenceOnlyChat.processLegalChat({
    message: "Lãi suất vay 25% một năm có hợp pháp không?",
  });
  const keepsSourcesOutOfFallback = evidenceOnlyReply.citations.length > 0
    && evidenceOnlyReply.replyText.toLowerCase().includes("mở căn cứ pháp lý trích dẫn bên dưới")
    && evidenceOnlyReply.citations.every((citation) => !evidenceOnlyReply.replyText.includes(citation.contentSnippet));
  if (!keepsSourcesOutOfFallback) {
    failures++;
    console.error("FAIL: evidence-only fallback exposed legal source excerpts in the answer.");
  } else {
    console.log("PASS: evidence-only fallback keeps source excerpts in citation details only.");
  }

  const unsupportedChatService = new LegalChatService(async () => null, async () => "LEGAL_RETRIEVAL");
  const unsupportedChat = await unsupportedChatService.processLegalChat({
    message: "Quy trình cấp giấy phép khai thác tàu bay dân dụng như thế nào?",
  });
  if (unsupportedChat.citations.length !== 0 || !unsupportedChat.replyText.includes("chưa tìm thấy căn cứ đủ liên quan")) {
    failures++;
    console.error("FAIL: unsupported chat query did not abstain without citations.");
  } else {
    console.log("PASS: chat abstains without citations when the corpus has no relevant source.");
  }

  if (failures > 0) {
    throw new Error(`${failures} RAG retrieval smoke check(s) failed.`);
  }

  console.log(`RAG/chat checks passed: ${cases.length} expected-evidence, 3 no-evidence, 3 chat grounding.`);
} finally {
  await pool.end();
}
