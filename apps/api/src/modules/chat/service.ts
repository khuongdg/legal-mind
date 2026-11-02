import { LegalRAGService } from "../rag/service";
import type { Citation } from "@legal-mind/legal-schemas";
import { CitationSchema } from "@legal-mind/legal-schemas";
import { getServerEnv } from "@legal-mind/env";
import { validateGroundedAnswer, type GroundedClaim } from "./grounding";

const ragService = new LegalRAGService();
const DISCLAIMER = "Thông tin chỉ diễn giải các đoạn nguồn được truy xuất, không thay thế việc đối chiếu văn bản đầy đủ và tình tiết cụ thể.";
type GroundedClaimGenerator = (message: string, citations: Citation[]) => Promise<GroundedClaim[] | null>;
type ChatIntent = "LEGAL_RETRIEVAL" | "DOCUMENT_METADATA" | "GENERAL_CONVERSATION" | "UNSAFE_EVASION";
type ChatIntentClassifier = (message: string, messages: ChatMessage[]) => Promise<ChatIntent | null>;
type ChatMessage = { role: string; content: string };
type DocumentMetadata = {
  documentTitle: string;
  articleCount: number;
  issuedDate: string;
  effectiveDate: string;
  status: string;
  issuingAuthority: string | null;
};

function normalizeQuestion(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
}

function formatVietnameseDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDate;
}

export function answerDocumentDateQuestion(message: string, document: DocumentMetadata): string | null {
  const question = normalizeQuestion(message);
  const asksIssuedDate = /(ngày ban hành|ban hành ngày nào|ban hành khi nào|được ban hành khi nào|ngày ký|ký ngày nào|ký khi nào)/.test(question);
  const asksEffectiveDate = /(ngày có hiệu lực|có hiệu lực khi nào|hiệu lực khi nào|hiệu lực từ ngày|thi hành từ ngày)/.test(question);
  if (!asksIssuedDate && !asksEffectiveDate) return null;

  if (asksIssuedDate) {
    if (!document.issuedDate) return `Kho dữ liệu chưa ghi nhận ngày ban hành của ${document.documentTitle}.`;
    const effectiveDate = document.effectiveDate
      ? ` Ngày có hiệu lực là ${formatVietnameseDate(document.effectiveDate)}.`
      : " Ngày có hiệu lực chưa được ghi nhận trong kho.";
    return `${document.documentTitle} được ban hành ngày ${formatVietnameseDate(document.issuedDate)}.${effectiveDate}`;
  }

  if (!document.effectiveDate) return `Kho dữ liệu chưa ghi nhận ngày có hiệu lực của ${document.documentTitle}.`;
  const issuedDate = document.issuedDate
    ? ` Văn bản được ban hành ngày ${formatVietnameseDate(document.issuedDate)}.`
    : " Ngày ban hành chưa được ghi nhận trong kho.";
  return `${document.documentTitle} có hiệu lực từ ngày ${formatVietnameseDate(document.effectiveDate)}.${issuedDate}`;
}

export function answerDocumentIssuingAuthorityQuestion(message: string, document: DocumentMetadata): string | null {
  const question = normalizeQuestion(message);
  if (!/(do ai ban hành|ai ban hành|cơ quan nào ban hành|đơn vị nào ban hành|cơ quan ban hành)/.test(question)) {
    return null;
  }

  const authorities: Record<string, string> = {
    QUOC_HOI: "Quốc hội",
    CHINH_PHU: "Chính phủ",
    TOA_AN_TOI_CAO: "Tòa án nhân dân tối cao",
  };
  const authority = document.issuingAuthority ? authorities[document.issuingAuthority] : undefined;
  return authority
    ? `${document.documentTitle} do ${authority} ban hành.`
    : `Kho dữ liệu chưa ghi nhận cơ quan ban hành của ${document.documentTitle}.`;
}

export function answerKnowledgeCoverageQuestion(message: string, documents: DocumentMetadata[]): string | null {
  const question = normalizeQuestion(message);
  const asksCoverage = /(những|các) (bộ luật|luật|văn bản).{0,60}(nào|thông tin|đã nạp|để hỏi|có thể hỏi)|(phạm vi|danh sách).{0,50}(có thể hỏi|đã nạp|đang có)|(hệ thống|kho dữ liệu).{0,50}(có những gì|đã nạp những gì)/.test(question);
  if (!asksCoverage) return null;

  if (documents.length === 0) {
    return "Hiện kho dữ liệu chưa có văn bản pháp luật nào được lập chỉ mục để tra cứu.";
  }

  const documentList = documents
    .map((document) => `- ${document.documentTitle}: ${document.articleCount} Điều có dữ liệu${document.status ? `; trạng thái ${document.status}` : ""}.`)
    .join("\n");
  return [
    `Hiện kho dữ liệu có ${documents.length} văn bản pháp luật được lập chỉ mục:`,
    documentList,
    "Bạn có thể hỏi về các Điều đã nêu hoặc mô tả tình huống để tra cứu nội dung liên quan. Phạm vi này chỉ phản ánh dữ liệu hiện có trong kho, không phải danh mục đầy đủ mọi văn bản pháp luật; câu trả lời sẽ phụ thuộc vào các đoạn nguồn truy xuất được cho từng câu hỏi.",
  ].join("\n");
}

function findMentionedDocument(
  question: string,
  documents: DocumentMetadata[]
): DocumentMetadata | null {
  const ignoredTerms = new Set(["bộ", "luật", "năm", "bao", "nhiêu", "mấy", "điều", "có", "bao", "là"]);
  const questionTerms = new Set(
    normalizeQuestion(question).split(/[^\p{L}\p{N}]+/u).filter((term) => term.length > 1 && !ignoredTerms.has(term))
  );
  const matches = documents
    .map((document) => {
      const titleTerms = normalizeQuestion(document.documentTitle)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length > 1 && !ignoredTerms.has(term) && !/^\d+$/.test(term));
      return { document, matchedTerms: titleTerms.filter((term) => questionTerms.has(term)).length };
    })
    .filter(({ matchedTerms }) => matchedTerms >= 2)
    .sort((left, right) => right.matchedTerms - left.matchedTerms);
  return matches[0]?.document ?? null;
}

async function classifyChatIntent(message: string, messages: ChatMessage[]): Promise<ChatIntent | null> {
  const env = getServerEnv();
  const useOpenRouter = Boolean(env.OPENROUTER_API_KEY);
  const apiKey = useOpenRouter ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const endpoint = useOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const model = useOpenRouter ? "anthropic/claude-haiku-4.5" : "gpt-4o-mini";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Phân loại duy nhất ý định tin nhắn cho trợ lý pháp luật Việt Nam. Trả JSON {\"intent\":\"LEGAL_RETRIEVAL|DOCUMENT_METADATA|GENERAL_CONVERSATION|UNSAFE_EVASION\"}. DOCUMENT_METADATA khi câu hỏi về tên, số điều, ngày ban hành/ký, ngày hiệu lực, trạng thái hoặc mã của một văn bản pháp luật. LEGAL_RETRIEVAL khi yêu cầu quy định pháp luật cụ thể. GENERAL_CONVERSATION cho trò chuyện hay nội dung không phải pháp luật. UNSAFE_EVASION khi họ muốn lách luật, che giấu, né tránh nghĩa vụ hoặc thực hiện hành vi trái pháp luật. Không trả lời nội dung câu hỏi.",
          },
          { role: "user", content: JSON.stringify({ currentMessage: message, recentConversation: messages.slice(-8) }) },
        ],
      }),
    });
    if (!response.ok) return null;
    const content = (await response.json()).choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const intent = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))?.intent;
    return intent === "LEGAL_RETRIEVAL" || intent === "DOCUMENT_METADATA" || intent === "GENERAL_CONVERSATION" || intent === "UNSAFE_EVASION"
      ? intent
      : null;
  } catch {
    return null;
  }
}

async function generateConversationalReply(messages: ChatMessage[]): Promise<string | null> {
  const env = getServerEnv();
  const useOpenRouter = Boolean(env.OPENROUTER_API_KEY);
  const apiKey = useOpenRouter ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const endpoint = useOpenRouter ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = useOpenRouter ? "anthropic/claude-haiku-4.5" : "gpt-4o-mini";
  const currentTime = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full", timeStyle: "short",
  }).format(new Date());
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `Bạn là Legal-Mind, một trợ lý trò chuyện thân thiện. Trả lời tự nhiên, trực tiếp bằng ngôn ngữ của người dùng và không dùng Markdown vì giao diện hiển thị văn bản thuần. Không đưa ra tư vấn hay khẳng định pháp lý khi chưa có căn cứ được truy xuất; các câu hỏi pháp luật chuyên môn sẽ do luồng khác xử lý. Thời gian hệ thống đã xác minh theo giờ Việt Nam là: ${currentTime}.`,
          },
          ...messages.slice(-12).map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content })),
        ],
      }),
    });
    if (!response.ok) return null;
    const content = (await response.json()).choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}

async function generateDocumentMetadataReply(message: string, document: DocumentMetadata): Promise<string | null> {
  const env = getServerEnv();
  const useOpenRouter = Boolean(env.OPENROUTER_API_KEY);
  const apiKey = useOpenRouter ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const endpoint = useOpenRouter ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = useOpenRouter ? "anthropic/claude-haiku-4.5" : "gpt-4o-mini";
  const issuingAuthorityLabels: Record<string, string> = {
    QUOC_HOI: "Quốc hội",
    CHINH_PHU: "Chính phủ",
    TOA_AN_TOI_CAO: "Tòa án nhân dân tối cao",
  };
  const documentForPrompt = {
    ...document,
    issuingAuthority: document.issuingAuthority
      ? issuingAuthorityLabels[document.issuingAuthority] ?? document.issuingAuthority
      : null,
  };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: "Trả lời ngắn gọn câu hỏi về metadata văn bản, chỉ dùng dữ liệu JSON được cung cấp. Phân biệt issuedDate là ngày ban hành và effectiveDate là ngày bắt đầu có hiệu lực; không dùng ngày này thay cho ngày kia. Không thêm thông tin ngoài dữ liệu và không dùng Markdown." },
          { role: "user", content: JSON.stringify({ question: message, document: documentForPrompt }) },
        ],
      }),
    });
    if (!response.ok) return null;
    const content = (await response.json()).choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}

function renderGroundedClaims(claims: GroundedClaim[]): string {
  const renderedClaims = claims.map((claim) => claim.text);

  return ["Diễn giải dựa trên các căn cứ được truy xuất:", ...renderedClaims].join("\n\n");
}

function asksLegalComplianceQuestion(value: string): boolean {
  return /(phạm luật|phạm pháp|không hợp pháp|hợp pháp|vi phạm|được phép|không được phép|vượt quá|không vượt quá|có phạm|không phạm)/i.test(value);
}

function buildComplianceReply(message: string, claims: GroundedClaim[]): string {
  const question = normalizeQuestion(message);
  if (!asksLegalComplianceQuestion(question)) return renderGroundedClaims(claims);

  return ["Diễn giải dựa trên các căn cứ được truy xuất:", ...claims.map((claim) => claim.text)].join("\n\n");
}

function buildEvidenceOnlyReply(citations: Citation[]): string {
  if (citations.length === 0) {
    return "Chưa đủ căn cứ để kết luận có phạm luật hay không phạm luật. Trong các văn bản đã nạp, chưa tìm thấy căn cứ đủ liên quan để trả lời câu hỏi này. Có thể cần bổ sung văn bản thuộc lĩnh vực phù hợp.";
  }

  return [
    "Kết luận: Chưa đủ căn cứ để kết luận có phạm luật hay không phạm luật.",
    "Chưa thể xác nhận phần diễn giải tự động từ các đoạn được truy xuất.",
    "Hãy mở căn cứ pháp lý trích dẫn bên dưới để đối chiếu nguyên văn.",
  ].join("\n\n");
}

async function generateGroundedClaims(message: string, citations: Citation[]): Promise<GroundedClaim[] | null> {
  const env = getServerEnv();
  const useOpenRouter = Boolean(env.OPENROUTER_API_KEY);
  const apiKey = useOpenRouter ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const endpoint = useOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const model = useOpenRouter ? "anthropic/claude-haiku-4.5" : "gpt-4o-mini";
  const sources = citations.map((citation) => ({
    citationId: citation.id,
    documentTitle: citation.documentTitle,
    documentCode: citation.documentCode,
    articleNumber: citation.articleNumber,
    articleTitle: citation.articleTitle,
    clauseNumber: citation.clauseNumber,
    status: citation.status,
    effectiveDate: citation.effectiveDate,
    sourceText: citation.contentSnippet,
  }));

  try {
    const systemPrompt = "Bạn là trợ lý diễn giải pháp luật dựa trên truy xuất. Chỉ suy luận từ nguồn được cung cấp và dữ kiện trong câu hỏi; không giả định hoặc thêm dữ kiện. Trả JSON đúng dạng {\"claims\":[{\"text\":\"nhận định hoặc phần giải thích\",\"evidence\":[{\"citationId\":\"ID nguồn\",\"quote\":\"trích nguyên văn liên tục từ sourceText\"}]}]}. Mỗi nhận định phải gắn ít nhất một citationId hợp lệ và quote nguyên văn liên tục từ đúng một đoạn nguồn; nếu viện dẫn các câu không liền nhau, đặt chúng thành các evidence riêng, không ghép thành một quote. Với câu hỏi có/không phạm luật, phải nói rõ hành vi được nêu có trái quy định hay không, hoặc chưa đủ căn cứ để xác định; diễn đạt tự nhiên, không bắt buộc mở đầu bằng 'Kết luận:' hoặc dùng nhãn cố định. Sau đó giải thích phần hành vi/tình tiết nào khớp hoặc không khớp với điều kiện, giới hạn, nghĩa vụ hay điều cấm trong nguồn, rồi nêu hệ quả pháp lý cụ thể mà nguồn quy định. Nếu nguồn quy định chế tài hành chính hoặc hình sự thì nêu đúng loại và mức chế tài kèm căn cứ; nếu nguồn truy xuất không quy định chế tài thì không suy đoán hay biến hệ quả dân sự (như phần vượt giới hạn không có hiệu lực) thành tiền phạt hoặc tội phạm, và nói rõ nguồn hiện có chỉ xác định hệ quả nào. Nếu nguồn chỉ quy định hệ quả cho một phần, không kết luận toàn bộ giao dịch trái luật hoặc khẳng định phần còn lại vẫn có hiệu lực khi nguồn không nói rõ. Không tự tính hiệu số, tỷ lệ, tiền phạt hay số liệu mới; chỉ nêu số có trong câu hỏi hoặc nguồn. Nếu nguồn chưa đủ để trả lời, nói rõ thiếu căn cứ nào và không đoán. Không đưa ra kết luận quá rộng. Nếu không thể diễn giải an toàn, trả {\"claims\":[]}. Không dùng Markdown trong text.";
    const baseMessages = [
      { role: "system", content: `${systemPrompt} Phạm vi của nhãn kết luận phải gắn với đúng hành vi/phần bị ảnh hưởng, không hàm ý toàn bộ giao dịch vi phạm nếu nguồn không nói vậy. Mọi điều kiện ngoại lệ ảnh hưởng đến kết luận và được nêu trực tiếp trong nguồn (ví dụ câu bắt đầu bằng 'trừ trường hợp') bắt buộc phải được nhắc trong claim; nếu cần, trích ngắn điều kiện đó nguyên văn.` },
      { role: "user", content: JSON.stringify({ question: message, sources }) },
    ];
    const requestCompletion = async (requestMessages: typeof baseMessages) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: requestMessages,
        }),
      });

      if (!response.ok) {
        console.error(`Legal explanation provider failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
        return null;
      }
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      return typeof content === "string" ? content : null;
    };

    const validate = (content: string) => {
      let rejectionReason = "unknown";
      const claims = validateGroundedAnswer(content, message, citations, (reason) => {
        rejectionReason = reason;
      });
      return { claims, rejectionReason };
    };

    const firstContent = await requestCompletion(baseMessages);
    if (!firstContent) return null;
    const firstResult = validate(firstContent);
    if (firstResult.claims?.length) return firstResult.claims;

    const repairedContent = await requestCompletion([
      ...baseMessages,
      {
        role: "user",
        content: JSON.stringify({
          correction: `Câu trả lời trước bị từ chối do ${firstResult.rejectionReason}. Hãy viết lại JSON claims: mỗi quote phải là một chuỗi liên tục, chính xác từ sourceText; bỏ mọi số tự tính hoặc kết luận không được nguồn hỗ trợ; vẫn trả lời câu hỏi trực tiếp trong phạm vi căn cứ.`,
          previousOutput: firstContent,
        }),
      },
    ]);
    if (!repairedContent) return null;
    const repairedResult = validate(repairedContent);
    if (!repairedResult.claims?.length) {
      console.warn(`LLM claim validation rejected repaired response (${repairedResult.rejectionReason}); using source excerpts only.`);
      return null;
    }
    return repairedResult.claims;
  } catch (error) {
    console.error("Legal explanation provider request failed:", error);
    return null;
  }
}

export class LegalChatService {
  constructor(
    private readonly claimGenerator: GroundedClaimGenerator = generateGroundedClaims,
    private readonly intentClassifier: ChatIntentClassifier = classifyChatIntent
  ) {}

  async processLegalChat({
    message,
    messages = [{ role: "user", content: message }],
  }: {
    message: string;
    messages?: ChatMessage[];
  }): Promise<{
    replyText: string;
    citations: Citation[];
    disclaimer: string;
    reasoningSteps: string[];
  }> {
    const knowledgeCoverageReply = answerKnowledgeCoverageQuestion(
      message,
      await ragService.getIndexedDocumentMetadata()
    );
    if (knowledgeCoverageReply) {
      return {
        replyText: knowledgeCoverageReply,
        citations: [],
        disclaimer: DISCLAIMER,
        reasoningSteps: ["Thống kê văn bản và số Điều đã lập chỉ mục từ PostgreSQL; không suy rộng ra ngoài kho dữ liệu."],
      };
    }

    const recentUserContext = messages
      .filter((entry) => entry.role === "user")
      .slice(-6)
      .map((entry) => entry.content)
      .join(" ");
    const asksForDocumentMetadata = /(ban hành|ngày ký|ký ngày|hiệu lực|thi hành từ)/i
      .test(normalizeQuestion(message));
    if (asksForDocumentMetadata) {
      const document = findMentionedDocument(recentUserContext, await ragService.getIndexedDocumentMetadata());
      if (document) {
        const replyText = answerDocumentIssuingAuthorityQuestion(message, document)
          ?? answerDocumentDateQuestion(message, document);
        if (replyText) {
          return {
            replyText,
            citations: [],
            disclaimer: DISCLAIMER,
            reasoningSteps: ["Đối chiếu thông tin cơ quan ban hành, ngày ban hành hoặc ngày hiệu lực từ metadata văn bản trong PostgreSQL."],
          };
        }
      }
    }

    const intent = await this.intentClassifier(message, messages);
    if (intent === "GENERAL_CONVERSATION") {
      const replyText = await generateConversationalReply(messages);
      return {
        replyText: replyText ?? "Tôi có thể trò chuyện và hỗ trợ tra cứu pháp luật khi có căn cứ trong kho dữ liệu đã nạp.",
        citations: [],
        disclaimer: DISCLAIMER,
        reasoningSteps: ["Nhận diện nội dung trò chuyện; phản hồi bằng mô hình hội thoại, không thực hiện truy xuất pháp luật."],
      };
    }
    if (intent === "UNSAFE_EVASION") {
      return {
        replyText: "Tôi không thể hỗ trợ hướng dẫn lách luật, che giấu hành vi hoặc né tránh nghĩa vụ pháp lý. Tôi có thể giúp bạn tìm hiểu cách tuân thủ quy định hoặc các lựa chọn hợp pháp.",
        citations: [],
        disclaimer: DISCLAIMER,
        reasoningSteps: ["Nhận diện yêu cầu né tránh hoặc vi phạm pháp luật; không thực hiện tra cứu để hỗ trợ hành vi đó."],
      };
    }
    if (intent === "DOCUMENT_METADATA") {
      const document = findMentionedDocument(recentUserContext, await ragService.getIndexedDocumentMetadata());
      if (document) {
        const metadataReply = answerDocumentIssuingAuthorityQuestion(message, document)
          ?? answerDocumentDateQuestion(message, document);
        if (metadataReply) {
          return {
            replyText: metadataReply,
            citations: [],
            disclaimer: DISCLAIMER,
            reasoningSteps: ["Đối chiếu thông tin cơ quan ban hành, ngày ban hành hoặc ngày hiệu lực trong metadata văn bản đã nạp."],
          };
        }
        const replyText = await generateDocumentMetadataReply(message, document);
        if (replyText) {
          return {
            replyText,
            citations: [],
            disclaimer: DISCLAIMER,
            reasoningSteps: ["Đối chiếu metadata văn bản trong kho dữ liệu và diễn đạt theo câu hỏi."],
          };
        }
      }
    }

    // Retrieve source passages first; the response below only quotes verified results.
    const citations = await ragService.search({
      query: message,
      limit: 3,
      effectiveOnly: true,
    });

    for (const citation of citations) {
      const parsed = CitationSchema.safeParse(citation);
      if (!parsed.success || !citation.contentSnippet.trim()) {
        throw new Error(`Invalid legal citation returned by retrieval: ${citation.id}`);
      }
    }

    const claims = citations.length > 0 ? await this.claimGenerator(message, citations) : null;
    const usedCitationIds = new Set(claims?.flatMap((claim) => claim.evidence.map((evidence) => evidence.citationId)) ?? []);
    const responseCitations = claims
      ? citations.filter((citation) => usedCitationIds.has(citation.id))
      : citations;
    const replyText = claims
      ? (asksLegalComplianceQuestion(normalizeQuestion(message)) ? buildComplianceReply(message, claims) : renderGroundedClaims(claims))
      : buildEvidenceOnlyReply(citations);

    const reasoningSteps = [
      "Tìm kiếm hybrid trên các văn bản đã nạp.",
      citations.length > 0
        ? `Trả nguyên văn ${citations.length} đoạn có điểm liên quan đạt ngưỡng.`
        : "Không có đoạn nào đạt ngưỡng liên quan; không tạo citation.",
      claims
        ? `Đã kiểm tra ${claims.length} nhận định: citation thuộc kết quả truy xuất, quote khớp nguyên văn, số liệu và cụm kết luận pháp lý được kiểm tra với chứng cứ.`
        : "Diễn giải không đạt kiểm tra hoặc provider không khả dụng; chỉ trả trích dẫn nguyên văn.",
    ];

    return {
      replyText,
      citations: responseCitations,
      disclaimer: DISCLAIMER,
      reasoningSteps,
    };
  }
}
