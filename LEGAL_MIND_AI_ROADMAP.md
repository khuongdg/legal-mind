# ⚖️ LEGAL-MIND: BLUEPRINT & ĐỊNH HƯỚNG PHÁT TRIỂN HỆ THỐNG TRỢ LÝ AI PHÁP LÝ

> **Tài liệu chiến lược & kiến trúc kỹ thuật** tổng hợp kinh nghiệm xử lý AI từ dự án **Paw-Hub**, nâng cấp và chuyên biệt hóa cho lĩnh vực Pháp luật Việt Nam.

---

## 📌 MỤC LỤC
1. [Tổng quan dự án & Tầm nhìn](#1-tổng-quan-dự-án--tầm-nhìn)
2. [Bài học xử lý AI từ Paw-Hub & Điểm đột phá cho Legal-Mind](#2-bài-học-xử-lý-ai-từ-paw-hub--điểm-đột-phá-cho-legal-mind)
3. [Thiết kế kỹ thuật 3 Tính năng Cốt lõi](#3-thiết-kế-kỹ-thuật-3-tính-năng-cốt-lõi)
   - [3.1. RAG Tra cứu Luật pháp có Dẫn nguồn chính xác](#31-rag-tra-cứu-luật-pháp-có-dẫn-nguồn-chính-xác-high-precision-legal-rag)
   - [3.2. Phân tích & Rà soát Hợp đồng (Contract Review & Redlining)](#32-phân-tích--rà-soát-hợp-đồng-contract-review--redlining)
   - [3.3. Hỗ trợ Soạn thảo Văn bản & Đơn từ Pháp lý (Legal Drafting Wizard)](#33-hỗ-trợ-soạn-thảo-văn-bản--đơn-từ-pháp-lý-legal-drafting-wizard)
4. [Kiến trúc Hệ thống & Tech Stack Toàn diện](#4-kiến-trúc-hệ-thống--tech-stack-toàn-diện)
5. [Thiết kế Cơ sở Dữ liệu & Schemas](#5-thiết-kế-cơ-sở-dữ-liệu--schemas)
6. [Bảo mật, Đạo đức & Giới hạn Pháp lý](#6-bảo-mật-đạo-đức--giới-hạn-pháp-lý)
7. [Lộ trình Triển khai (Milestones & Roadmap)](#7-lộ-trình-triển-khai-milestones--roadmap)

---

## 1. TỔNG QUAN DỰ ÁN & TẦM NHÌN

### 1.1. Sứ mệnh
**Legal-Mind** là nền tảng Trợ lý Trí tuệ Nhân tạo thế hệ mới chuyên sâu về **Hệ thống Pháp luật Việt Nam**, hỗ trợ 3 nhóm đối tượng:
- **Người dân & Người lao động**: Tra cứu nhanh quyền lợi, giải quyết thắc mắc đời sống (đất đai, lao động, thừa kế, hôn nhân gia đình) với ngôn ngữ bình dân, dễ hiểu.
- **Doanh nghiệp & Startup**: Rà soát hợp đồng thương mại, lao động, dịch vụ; phát hiện rủi ro pháp lý tiềm ẩn và gợi ý phương án điều chỉnh.
- **Cộng đồng Pháp lý (Luật sư, Chuyên viên tư vấn)**: Tối ưu hóa thời gian soạn thảo đơn từ, tra cứu án lệ và quy định liên quan với độ chính xác tuyệt đối.

### 1.2. Thách thức cốt tử của AI trong ngành Luật
1. **Ảo giác (Hallucination)**: AI tuyệt đối không được viện dẫn các điều luật không tồn tại hoặc trích sai số hiệu điều khoản.
2. **Hiệu lực văn bản (Temporal Validity)**: Luật liên tục được sửa đổi, bổ sung hoặc thay thế bởi các Luật, Nghị định mới. Câu trả lời phải gắn liền với trạng thái: *Còn hiệu lực*, *Hết hiệu lực*, hay *Bị sửa đổi bởi điều nào*.
3. **Cấu trúc thứ bậc văn bản**: Hiến pháp > Bộ luật/Luật > Nghị định > Thông tư > Án lệ/Văn bản hướng dẫn. AI cần nắm rõ quy tắc áp dụng văn bản có hiệu lực pháp lý cao hơn khi có xung đột.

---

## 2. BÀI HỌC XỬ LÝ AI TỪ PAW-HUB & ĐIỂM ĐỘT PHÁ CHO LEGAL-MIND

Từ việc mổ xẻ mã nguồn **Paw-Hub** (`apps/elysia-api`, `apps/web-next`, Vercel AI SDK, OpenRouter Vision), chúng ta rút ra các bài học chuyển giao:

```
┌───────────────────────────────────────────┐      ┌───────────────────────────────────────────┐
│              PAW-HUB ENGINE               │      │            LEGAL-MIND ENGINE              │
├───────────────────────────────────────────┤      ├───────────────────────────────────────────┤
│ • Claude Vision quét ảnh sổ tiêm/hóa đơn  │ ──►  │ • Multi-page OCR + Chunking Điều/Khoản    │
│ • Schema Zod bóc tách & confidence fields │ ──►  │ • Schema Hợp đồng & Bảng rủi ro chi tiết  │
│ • Medical Sources tĩnh (WSAVA catalog)    │ ──►  │ • Advanced RAG (BM25 + pgvector + Rerank) │
│ • Entity isolation per-turn (pet-context) │ ──►  │ • Case & Party Isolation (Bên A, Bên B)   │
│ • Vercel AI SDK streaming + abort handling│ ──►  │ • Streaming + Chain-of-Thought + Citations│
└───────────────────────────────────────────┘      └───────────────────────────────────────────┘
```

### 2.1. Kế thừa có chọn lọc
1. **Strict Zod Validation (`schema.ts`)**: Định nghĩa chặt chẽ đầu ra có cấu trúc, bao gồm trường độ tin cậy `confidence` (0.0 - 1.0) và `lowConfidenceFields` để hệ thống biết chính xác chỗ nào AI còn phân vân.
2. **Vercel AI SDK Architecture**: Sử dụng `streamText` ở backend và `@ai-sdk/react` (`useChat`) ở frontend để tạo trải nghiệm mượt mà, phản hồi theo thời gian thực kèm công cụ gọi hàm (Tool Calling).
3. **Quản lý Vòng đời & Hủy phản hồi (`chat-abort.ts`)**: Cho phép người dùng dừng sinh văn bản bất kỳ lúc nào, lưu trữ an toàn trạng thái dở dang và không làm hỏng lịch sử hội thoại.
4. **Metadata Grounding (`medical-sources.ts`)**: Kỹ thuật gắn kèm dữ liệu nguồn vào `ChatAssistantMetadata` để render các thẻ dẫn nguồn trực tiếp trong UI của trợ lý.

### 2.2. Điểm nâng cấp đột phá cho Legal-Mind
- **Từ danh mục tĩnh sang Hybrid Legal RAG**: Thay vì tìm từ khóa trong catalog cố định, Legal-Mind lập chỉ mục toàn bộ hệ thống Văn bản Quy phạm Pháp luật (VBQPPL) với cơ chế tìm kiếm lai (Hybrid Search) kết hợp kiểm tra hiệu lực văn bản.
- **Từ xử lý ảnh ngắn sang phân tích tài liệu nhiều trang**: Xử lý hợp đồng PDF/DOCX dài hàng chục trang qua kỹ thuật phân tách theo Điều khoản (Clause-level decomposition).
- **Từ thông báo thông thường sang Diff/Redline trực quan**: Hiển thị trực tiếp các đề xuất thêm/bớt câu từ hợp đồng trên giao diện trực quan (tương tự Track Changes của Word).

---

## 3. THIẾT KẾ KỸ THUẬT 3 TÍNH NĂNG CỐT LÕI

### 3.1. RAG Tra cứu Luật pháp có Dẫn nguồn chính xác (High-Precision Legal RAG)

#### Sơ đồ luồng dữ liệu (Data Pipeline & Retrieval Flow):
```
[User Query]
     │
     ▼
[Query Expansion & Classifier] ── (Xác định lĩnh vực: Dân sự, Đất đai, Lao động...)
     │
     ├─────────────────────────────────┐
     ▼                                 ▼
[BM25 / tsvector Search]      [Dense Vector Search (pgvector)]
(Khớp số hiệu, thuật ngữ)    (Khớp ngữ nghĩa tình huống thực tế)
     │                                 │
     └────────────────┬────────────────┘
                      ▼
            [Reciprocal Rank Fusion]
                      │
                      ▼
     [Metadata Filter: Trạng thái hiệu lực]
                      │
                      ▼
     [Cross-Encoder Reranker (Top 3-5 Điều)]
                      │
                      ▼
         [Prompt Generator + Guardrails]
                      │
                      ▼
    [LLM Streaming + Inline Citations Metadata]
```

#### Quy chuẩn Chunking theo Thứ bậc Pháp lý (Hierarchy-Aware Chunking):
Tuyệt đối không cắt chunk ngẫu nhiên theo số lượng từ (`character chunking`). Mỗi chunk bắt buộc phải là một đơn vị ngữ nghĩa hoàn chỉnh:
- **Đơn vị cơ bản**: `Điều` hoặc `Khoản` (nếu Điều quá dài).
- **Context Injection**: Mỗi chunk được chèn tiền tố ngữ cảnh (Context Header):
  ```text
  [VĂN BẢN: Bộ luật Dân sự 2015 | CHƯƠNG: XVI - Hợp đồng vay tài sản | ĐIỀU: 468 - Lãi suất]
  1. Lãi suất vay do các bên thỏa thuận. Trường hợp các bên có thỏa thuận về lãi suất thì lãi suất theo thỏa thuận không được vượt quá 20%/năm của khoản tiền vay...
  ```
- **Metadata đi kèm**:
  - `doc_id`: `blds-2015`
  - `doc_name`: `Bộ luật Dân sự 2015`
  - `article`: `468`
  - `clause`: `1`
  - `status`: `ACTIVE` (Còn hiệu lực)
  - `effective_date`: `2017-01-01`
  - `official_source_url`: `https://vanban.chinhphu.vn/...`

#### Định dạng phản hồi có Dẫn nguồn (Citation Badges):
Khi stream phản hồi, trợ lý gắn kèm mã trích dẫn:
```markdown
Theo quy định pháp luật hiện hành, mức lãi suất cho vay tối đa mà các bên được phép thỏa thuận là **20%/năm** [cit:blds-2015-art-468-c1]. Nếu vượt quá mức này, phần vượt quá sẽ không có hiệu lực pháp luật.
```
Frontend sẽ render `[cit:...]` thành một interactive badge hiển thị popover thông tin chi tiết:
- Tên văn bản & Điều khoản chính xác.
- Trích lục nguyên văn từ DB.
- Trạng thái hiệu lực (Xanh: Còn hiệu lực; Đỏ: Hết hiệu lực; Vàng: Có văn bản sửa đổi).
- Nút "Mở xem văn bản gốc".

---

### 3.2. Phân tích & Rà soát Hợp đồng (Contract Review & Redlining)

#### Quy trình xử lý 4 giai đoạn:
1. **Tiếp nhận & Trích xuất (Document Ingestion)**:
   - Hỗ trợ PDF, DOCX, hoặc ảnh scan hợp đồng.
   - Sử dụng thư viện parse cấu trúc (Docling / PyMuPDF) kết hợp Vision AI cho các trang có chữ ký, con dấu.
2. **Bóc tách Điều khoản (Clause Segmentation)**:
   - AI nhận diện và chia nhỏ văn bản thành danh sách các điều khoản độc lập (Chủ thể, Đối tượng, Giá & Thanh toán, Quyền & Nghĩa vụ, Phạt vi phạm, Bất khả kháng, Giải quyết tranh chấp).
3. **Đánh giá Rủi ro Pháp lý (Legal Risk Assessment Engine)**:
   - Đối chiếu từng điều khoản với ma trận quy định bắt buộc (Mandatory Rules Matrix):
     - **Rủi ro Cao (High / Critical)**: Điều khoản vi phạm điều cấm của luật (VD: Lãi phạt vi phạm vượt quá 8% theo Luật Thương mại 2005; thỏa thuận từ bỏ quyền khiếu nại của người lao động trái Bộ luật Lao động).
     - **Rủi ro Trung bình (Medium)**: Điều khoản mập mờ, mất cân đối quyền lợi giữa hai bên (VD: Thời hạn thanh toán không có ngày chốt cụ thể; bên bán được quyền đơn phương gia hạn không giới hạn).
     - **Thiếu sót (Missing Terms)**: Hợp đồng thiếu các điều khoản bảo vệ cơ bản (VD: Không có điều khoản bảo mật thông tin, không quy định cơ quan giải quyết tranh chấp).
4. **Tạo Đề xuất Sửa đổi (Redlining & Suggestion Engine)**:
   - Sinh ra đoạn sửa đổi cụ thể (`suggestedRedline`) và giải thích ngắn gọn nguyên nhân pháp lý.

#### Schema Đầu ra của Phân tích Hợp đồng:
```typescript
interface ContractAnalysisResult {
  summary: {
    contractType: "COMMERCIAL" | "LABOR" | "LEASE" | "SERVICE" | "NDA";
    parties: { role: string; name: string; taxId?: string }[];
    totalRiskScore: number; // Thang điểm 0 - 100
    criticalIssuesCount: number;
  };
  clausesAnalysis: Array<{
    clauseId: string;
    originalText: string;
    riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "SAFE";
    riskExplanation: string;
    violatedOrRelevantLaw: {
      lawName: string;
      article: string;
      reason: string;
    };
    suggestedRedline?: {
      action: "REPLACE" | "DELETE" | "ADD_NEW";
      proposedText: string;
    };
  }>;
  missingClausesRecommendation: string[];
}
```

---

### 3.3. Hỗ trợ Soạn thảo Văn bản & Đơn từ Pháp lý (Legal Drafting Wizard)

#### Cơ chế Guided Form Wizard:
Thay vì để người dùng tự gõ lệnh prompt mơ hồ, hệ thống triển khai theo luồng tương tác thông minh:

1. **Chọn danh mục & Mẫu chuẩn**:
   - *Dân sự*: Đơn khởi kiện đòi nợ, Đơn yêu cầu bồi thường thiệt hại, Hợp đồng thuê nhà, Giấy ủy quyền.
   - *Lao động*: Hợp đồng lao động, Thỏa thuận chấm dứt HĐLĐ, Đơn khiếu nại sa thải trái pháp luật.
   - *Doanh nghiệp*: Thỏa thuận bảo mật (NDA), Hợp đồng cung cấp dịch vụ phần mềm, Biên bản họp cổ đông.
   - *Hôn nhân*: Đơn thuận tình ly hôn, Đơn xin đơn phương ly hôn và chia tài sản.
2. **Q&A phỏng vấn dữ kiện (Dynamic Slot Filling)**:
   - Trợ lý AI lần lượt hỏi các thông tin cốt lõi (Ai là người khởi kiện? Số tiền nợ là bao nhiêu? Có bằng chứng gì chuyển khoản không? Có lãi suất thỏa thuận không?).
3. **Tự động áp dụng Thể thức Văn bản Hành chính (Nghị định 30/2020/NĐ-CP)**:
   - **Quốc hiệu & Tiêu ngữ**: Đúng định dạng in hoa, gạch chân chuẩn quy phạm.
   - **Tên cơ quan có thẩm quyền**: AI tự động gợi ý Tòa án có thẩm quyền theo địa hạt cư trú của bị đơn.
   - **Phần Căn cứ Pháp lý**: Tự động chèn các căn cứ luật tương ứng với yêu cầu khởi kiện.
4. **Xuất bản & Tùy biến**:
   - Trình chỉnh sửa Rich-Text (TipTap) tích hợp trên web cho phép chỉnh sửa ngay lập tức.
   - Hỗ trợ xuất ra file **`.docx` (Word format)** giữ nguyên căn lề và **`.pdf` chuẩn in ấn**.

---

## 4. KIẾN TRÚC HỆ THỐNG & TECH STACK TOÀN DIỆN

Kế thừa kiến trúc **Turborepo Monorepo** hiện đại và hiệu năng cao từ Paw-Hub:

```text
legal-mind/
├── apps/
│   ├── web/                        # TanStack Start / Next.js 15 (React 19)
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── chat-advisor/   # Trợ lý tra cứu hỏi đáp luật
│   │   │   │   ├── contract-audit/ # Giao diện rà soát & Diff Redlining
│   │   │   │   └── legal-drafting/ # Step-by-step drafting wizard
│   │   │   ├── components/ui/      # Shadcn UI / Radix primitives
│   │   │   └── lib/ai/             # Vercel AI SDK Client Hooks
│   └── api/                        # ElysiaJS trên Bun runtime (hoặc FastAPI)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── rag/            # Vector search, BM25, Reranker pipeline
│       │   │   ├── contract/       # Contract parser & Risk evaluator
│       │   │   ├── drafting/       # Docx/PDF generator engine
│       │   │   └── law-database/   # Ingestion & Sync VBQPPL
│       │   └── lib/ai-providers.ts # OpenRouter / Anthropic / Gemini Client
├── packages/
│   ├── db/                         # PostgreSQL + pgvector client & migrations
│   ├── legal-schemas/              # Zod schemas dùng chung cho Web & API
│   ├── env/                        # Kiểm thực biến môi trường (@legal-mind/env)
│   └── ui/                         # Bộ component giao diện chia sẻ
```

### Công nghệ đề xuất:
- **Ngôn ngữ**: TypeScript 100% end-to-end.
- **Backend Framework**: **ElysiaJS (Bun)** vì tốc độ siêu nhanh, bộ gõ type-safe Eden Treaty kết nối trực tiếp với Frontend không cần sinh mã thủ công.
- **Cơ sở dữ liệu**: **PostgreSQL 16+** kết hợp extension **`pgvector`** (vừa quản lý User/Tài liệu, vừa truy vấn Vector tương đồng).
- **Mô hình AI (LLM Providers)**:
  - **Mô hình lập luận chính (Reasoning LLM)**: `anthropic/claude-3.5-sonnet` hoặc `google/gemini-2.5-pro` (được đánh giá cao nhất về năng lực hiểu sâu ngữ cảnh tiếng Việt và suy luận logic pháp lý phức tạp).
  - **Mô hình trích xuất nhanh (Extraction & Parsing)**: `anthropic/claude-3.5-haiku` hoặc `google/gemini-2.5-flash` (chi phí thấp, tốc độ cao cho bước bóc tách điều khoản ban đầu).
  - **Mô hình Embedding**: `text-embedding-3-large` (OpenAI) hoặc mô hình mã nguồn mở tiếng Việt `bkai-foundation-models/vietnamese-bi-encoder`.
  - **Re-ranker**: `Cohere Rerank v3` hoặc `bge-reranker-v2-m3`.

---

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMAS

### 5.1. Bảng Dữ liệu Luật (`legal_documents` & `legal_chunks`)
```sql
CREATE TABLE legal_documents (
    id VARCHAR(64) PRIMARY KEY, -- 'blds-2015'
    title VARCHAR(255) NOT NULL, -- 'Bộ luật Dân sự 2015'
    code_number VARCHAR(100) NOT NULL, -- '91/2015/QH13'
    document_type VARCHAR(50) NOT NULL, -- 'LUAT', 'NGHI_DINH', 'THONG_TU', 'AN_LE'
    issued_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'AMENDED'
    source_url TEXT NOT NULL
);

CREATE TABLE legal_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(64) REFERENCES legal_documents(id) ON DELETE CASCADE,
    article_number INT NOT NULL, -- 468
    article_title TEXT, -- 'Lãi suất'
    clause_number INT, -- 1 (NULL nếu là toàn bộ điều)
    content TEXT NOT NULL, -- Nội dung nguyên văn
    context_prefix TEXT NOT NULL, -- Header phân cấp để embedding
    embedding vector(1536), -- Vector embedding
    search_vector tsvector -- Cho BM25 / Full-text search
);

CREATE INDEX idx_legal_chunks_vector ON legal_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_legal_chunks_fts ON legal_chunks USING gin(search_vector);
```

### 5.2. Bảng Rà soát Hợp đồng (`contracts` & `contract_reviews`)
```sql
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes INT NOT NULL,
    contract_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE contract_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    risk_score INT NOT NULL, -- 0 - 100
    summary JSONB NOT NULL,
    analysis_details JSONB NOT NULL, -- Mảng các clauses và rủi ro
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. BẢO MẬT, ĐẠO ĐỨC & GIỚI HẠN PHÁP LÝ

1. **Tuyên bố Miễn trừ Trách nhiệm (Legal Disclaimer)**:
   - Hệ thống luôn hiển thị thông điệp pháp lý tiêu chuẩn: *"Legal-Mind là công cụ hỗ trợ thông tin và rà soát dựa trên AI, không thay thế cho ý kiến tư vấn pháp lý chính thức của Luật sư được cấp chứng chỉ hành nghề."*
2. **Bảo mật Dữ liệu Hợp đồng (Data Privacy)**:
   - Áp dụng kỹ thuật ẩn danh hóa tự động (PII Redaction): Trước khi gửi văn bản hợp đồng lên LLM, các thông tin nhạy cảm như *Số CCCD, Số tài khoản ngân hàng, Tên riêng cá nhân* có thể được mã hóa thành các token ẩn danh (`[PARTY_A_NAME]`, `[ID_NUMBER_1]`).
   - Sử dụng các API Enterprise với chính sách **Zero Data Retention (ZDR)** (nhà cung cấp không sử dụng tài liệu của người dùng để huấn luyện mô hình).
3. **Bảo vệ Chống Jailbreak & Xuyên tạc Luật**:
   - Sử dụng System Prompt Guardrails tương tự Paw-Hub (`system-prompt.ts`) để từ chối các yêu cầu vi phạm pháp luật, lách luật phi pháp hoặc soạn thảo hợp đồng phi pháp/trốn thuế.

---

## 7. LỘ TRÌNH TRIỂN KHAI (MILESTONES & ROADMAP)

```
[THÁNG 1] ──► MVP: Tra cứu & RAG Pháp lý chính xác (5 Bộ luật cốt lõi)
[THÁNG 2] ──► Giai đoạn 2: Wizard Soạn thảo Đơn từ & Xuất DOCX/PDF
[THÁNG 3] ──► Giai đoạn 3: Engine Rà soát Hợp đồng & Visual Redlining
[THÁNG 4] ──► Giai đoạn 4: Mở rộng Dữ liệu (Án lệ, Nghị định, Thông tư) & B2B Integration
```

### Chi tiết từng giai đoạn:

#### Giai đoạn 1: MVP - Tra cứu & Trợ lý Hỏi - Đáp Luật (Tuần 1 - 4)
- [ ] Khởi tạo Monorepo cấu trúc chuẩn (`pnpm + Turborepo`), setup PostgreSQL + `pgvector`.
- [ ] Xây dựng Pipeline ETL cào và chuẩn hóa 5 bộ luật nền tảng: Bộ luật Dân sự, Bộ luật Lao động, Luật Doanh nghiệp, Luật Thương mại, Luật Đất đai.
- [ ] Hoàn thiện thuật toán Hybrid Search (BM25 + Vector) và Reranker.
- [ ] Xây dựng giao diện Chatbot bằng Vercel AI SDK, hỗ trợ streaming câu trả lời kèm **Interactive Citation Badges**.

#### Giai đoạn 2: Wizard Soạn thảo Văn bản & Đơn từ Pháp lý (Tuần 5 - 8)
- [ ] Chuẩn hóa bộ 30 mẫu đơn/hợp đồng thông dụng nhất theo quy chuẩn Nghị định 30/2020/NĐ-CP.
- [ ] Xây dựng giao diện Form tương tác (Interactive Step Wizard) tự động gợi ý điền dữ liệu.
- [ ] Tích hợp thư viện sinh file `docx` và `pdf` cho phép người dùng tải về ngay.

#### Giai đoạn 3: Phân tích & Rà soát Hợp đồng Chuyên sâu (Tuần 9 - 12)
- [ ] Xây dựng pipeline trích xuất văn bản hợp đồng nhiều trang (PDF/Scan OCR).
- [ ] Phát triển AI Risk Assessment Engine đối chiếu các quy định pháp luật.
- [ ] Thiết kế giao diện Redline (Track Changes / Split View) hiển thị trực tiếp những câu từ cần sửa đổi.

---

*Tài liệu này đóng vai trò kim chỉ nam kiến trúc và lộ trình kỹ thuật cho toàn bộ dự án Legal-Mind.*
