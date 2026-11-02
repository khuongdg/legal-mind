# 📜 LEGAL-MIND: NHẬT KÝ PHÁT TRIỂN & BẢN ĐỒ KIẾN TRÚC TOÀN DỰ ÁN
> **Tài liệu theo dõi (Audit Trail & Change Tracker)** lưu trữ chi tiết cấu trúc hệ thống, chức năng của từng file và lịch sử thay đổi theo mốc thời gian để phục vụ việc tra cứu và đối soát lâu dài.

---

## 📌 MỤC LỤC
1. [Nguyên tắc Ghi nhận & Truy vết (Traceability Protocol)](#1-nguyên-tắc-ghi-nhận--truy-vết-traceability-protocol)
2. [Bản đồ Cấu trúc Toàn bộ Dự án & Chức năng Từng File](#2-bản-đồ-cấu-trúc-toàn-bộ-dự-án--chức-năng-từng-file)
   - [2.1. Cấu hình Gốc (Root Workspace & Monorepo)](#21-cấu-hình-gốc-root-workspace--monorepo)
   - [2.2. Gói dùng chung `@legal-mind/legal-schemas`](#22-gói-dùng-chung-legal-mindlegal-schemas)
   - [2.3. Gói dùng chung `@legal-mind/env`](#23-gói-dùng-chung-legal-mindenv)
   - [2.4. Gói dùng chung `@legal-mind/db`](#24-gói-dùng-chung-legal-minddb)
   - [2.5. Ứng dụng Backend API `@legal-mind/api` (ElysiaJS + Bun)](#25-ứng-dụng-backend-api-legal-mindapi-elysiajs--bun)
   - [2.6. Ứng dụng Frontend Web `@legal-mind/web` (React 19 + Vite)](#26-ứng-dụng-frontend-web-legal-mindweb-react-19--vite)
3. [Nhật ký Thay đổi Chi tiết theo Mốc Thời Gian (Audit Trail)](#3-nhật-ký-thay-đổi-chi-tiết-theo-mốc-thời-gian-audit-trail)
4. [Hướng dẫn Cập nhật Nhật ký cho các Lần chỉnh sửa Tiếp theo](#4-hướng-dẫn-cập-nhật-nhật-ký-cho-các-lần-chỉnh-sửa-tiếp-theo)

---

## 1. NGUYÊN TẮC GHI NHẬN & TRUY VẾT (TRACEABILITY PROTOCOL)

Để dự án duy trì tính minh bạch và có thể truy vết ngược lại bất kỳ thay đổi nào trong tương lai:
- **Mỗi lần can thiệp mã nguồn**: Ghi nhận một mục mới trong [Phần 3](#3-nhật-ký-thay-đổi-chi-tiết-theo-mốc-thời-gian-audit-trail) gồm:
  - **Thời gian (Timestamp)**: Định dạng `YYYY-MM-DD HH:mm:ss GMT+7`.
  - **Phạm vi tác động (Scope)**: Chỉ rõ package/app (`apps/api`, `apps/web`, `packages/db`...).
  - **Phân loại thay đổi**:
    - `[ADDED]`: Thêm mới tính năng, file, hoặc bảng dữ liệu.
    - `[MODIFIED]`: Cập nhật logic, sửa đổi giao diện hoặc cấu hình.
    - `[REFACTORED]`: Tái cấu trúc mã nguồn mà không thay đổi hành vi ngoài.
    - `[FIXED]`: Sửa lỗi (bug fix, build error, type error).
  - **Mô tả chi tiết & Căn cứ kỹ thuật**: Tại sao cần sửa, logic xử lý thế nào, tác động ra sao.

---

## 2. BẢN ĐỒ CẤU TRÚC TOÀN BỘ DỰ ÁN & CHỨC NĂNG TỪNG FILE

### 2.1. Cấu hình Gốc (Root Workspace & Monorepo)
| Đường dẫn file | Vai trò & Chức năng chi tiết |
| :--- | :--- |
| [`package.json`](file:///Users/duongkhuong/legal-mind/package.json) | Định nghĩa Monorepo `legal-mind`, quản lý scripts tổng (`dev`, `build`, `dev:api`, `dev:web`, `lint`, `typecheck`), tích hợp Turborepo 2.x và pnpm 11.x. |
| [`pnpm-workspace.yaml`](file:///Users/duongkhuong/legal-mind/pnpm-workspace.yaml) | Khai báo các thư mục workspace (`apps/*`, `packages/*`) và cấu hình `allowBuilds: { esbuild: true }` để vượt qua cơ chế chặn build script của pnpm 11+. |
| [`turbo.json`](file:///Users/duongkhuong/legal-mind/turbo.json) | Cấu hình pipeline thực thi song song của Turborepo, kiểm soát cache đầu ra (`dist/**`, `.next/**`) và khai báo danh sách biến môi trường toàn cục (`PORT`, `DATABASE_URL`, API Keys). |
| [`tsconfig.base.json`](file:///Users/duongkhuong/legal-mind/tsconfig.base.json) | Bộ quy chuẩn TypeScript cơ sở (ES2022, Bundler resolution, Strict mode) cho toàn bộ các package và app con kế thừa. |
| [`.gitignore`](file:///Users/duongkhuong/legal-mind/.gitignore) | Loại bỏ `node_modules`, cache `.turbo`, build `dist`, file môi trường `.env` khỏi git để bảo vệ bí mật dự án. |
| [`.env.example`](file:///Users/duongkhuong/legal-mind/.env.example) | Mẫu biến môi trường tiêu chuẩn (cấu hình DB PostgreSQL, OpenRouter, OpenAI, Gemini, Anthropic API Keys). |
| [`.env`](file:///Users/duongkhuong/legal-mind/.env) | File cấu hình môi trường thực tế sử dụng khi chạy dev cục bộ. |
| [`README.md`](file:///Users/duongkhuong/legal-mind/README.md) | Tài liệu tổng quan dự án, hướng dẫn khởi chạy nhanh và điều hướng. |
| [`LEGAL_MIND_AI_ROADMAP.md`](file:///Users/duongkhuong/legal-mind/LEGAL_MIND_AI_ROADMAP.md) | Bản thiết kế kiến trúc toàn diện (Blueprint), phân tích chuyển giao AI từ Paw-Hub, thiết kế chi tiết 3 tính năng cốt lõi và lộ trình 4 giai đoạn. |

---

### 2.2. Gói dùng chung `@legal-mind/legal-schemas`
*Vị trí: `packages/legal-schemas` - Thư viện định nghĩa dữ liệu trung tâm dùng chung giữa Web và API bằng Zod.*

| Đường dẫn file | Vai trò & Chức năng chi tiết |
| :--- | :--- |
| [`package.json`](file:///Users/duongkhuong/legal-mind/packages/legal-schemas/package.json) | Khai báo package name `@legal-mind/legal-schemas`, phụ thuộc `zod`. |
| [`src/index.ts`](file:///Users/duongkhuong/legal-mind/packages/legal-schemas/src/index.ts) | Export toàn bộ schemas ra ngoài cho các package khác tiêu thụ. |
| [`src/citation.ts`](file:///Users/duongkhuong/legal-mind/packages/legal-schemas/src/citation.ts) | Định nghĩa `LegalDocumentTypeEnum` (Bộ luật, Luật, Nghị định...), `LegalEffectStatusEnum` (`ACTIVE`, `EXPIRED`, `AMENDED`), `CitationSchema` (dẫn nguồn đến từng Điều/Khoản) và `LegalSearchQuerySchema`. |
| [`src/contract.ts`](file:///Users/duongkhuong/legal-mind/packages/legal-schemas/src/contract.ts) | Định nghĩa cấu trúc phân tích hợp đồng: `ContractTypeEnum`, `RiskLevelEnum` (`CRITICAL`, `HIGH`, `MEDIUM`, `SAFE`), `RedlineSuggestionSchema` (đề xuất thay/xóa/thêm), `ContractReviewSchema`. |
| [`src/drafting.ts`](file:///Users/duongkhuong/legal-mind/packages/legal-schemas/src/drafting.ts) | Định nghĩa danh mục soạn thảo `LegalDraftCategoryEnum`, trường form `DraftingFieldSchema`, mẫu đơn `DraftingTemplateSchema`, và kết quả sinh văn bản `GeneratedDocumentSchema`. |
| [`src/chat.ts`](file:///Users/duongkhuong/legal-mind/packages/legal-schemas/src/chat.ts) | Định nghĩa cấu trúc tin nhắn trao đổi `LegalChatRequestSchema` và metadata trả về `LegalAssistantMetadataSchema` (chứa mảng trích dẫn, các bước lập luận reasoning steps, và tuyên bố miễn trừ). |

---

### 2.3. Gói dùng chung `@legal-mind/env`
*Vị trí: `packages/env` - Đảm bảo tính Type-safe tuyệt đối cho biến môi trường.*

| Đường dẫn file | Vai trò & Chức năng chi tiết |
| :--- | :--- |
| [`src/schema.ts`](file:///Users/duongkhuong/legal-mind/packages/env/src/schema.ts) | Định nghĩa `serverEnvSchema` và `clientEnvSchema` bằng Zod, kiểm tra kiểu dữ liệu của `PORT`, `DATABASE_URL`, API Keys. |
| [`src/server.ts`](file:///Users/duongkhuong/legal-mind/packages/env/src/server.ts) | Hàm `getServerEnv()` singleton, validate và cache biến môi trường phía server. |
| [`src/client.ts`](file:///Users/duongkhuong/legal-mind/packages/env/src/client.ts) | Hàm `getClientEnv()` singleton, đọc biến môi trường phía client từ `import.meta.env`. |
| [`src/index.ts`](file:///Users/duongkhuong/legal-mind/packages/env/src/index.ts) | Export server/client env helpers. |

---

### 2.4. Gói dùng chung `@legal-mind/db`
*Vị trí: `packages/db` - Tầng truy cập cơ sở dữ liệu PostgreSQL + `pgvector`.*

| Đường dẫn file | Vai trò & Chức năng chi tiết |
| :--- | :--- |
| [`src/schema.sql`](file:///Users/duongkhuong/legal-mind/packages/db/src/schema.sql) | Script khởi tạo DB PostgreSQL: Kích hoạt extension `vector`, `unaccent`, `uuid-ossp`; tạo bảng `legal_documents`, `legal_chunks` (kèm vector embedding và `search_vector tsvector`), `contracts`, `contract_reviews`, `drafting_sessions`. |
| [`src/client.ts`](file:///Users/duongkhuong/legal-mind/packages/db/src/client.ts) | Quản lý connection pool `pg.Pool`, cung cấp hàm `query()` an toàn với kết nối tự động tái sử dụng. |
| [`src/migrate.ts`](file:///Users/duongkhuong/legal-mind/packages/db/src/migrate.ts) | Script chạy áp dụng file `schema.sql` vào cơ sở dữ liệu qua lệnh `pnpm db:migrate`. |
| [`src/index.ts`](file:///Users/duongkhuong/legal-mind/packages/db/src/index.ts) | Export pool client và migration runner. |

---

### 2.5. Ứng dụng Backend API `@legal-mind/api` (ElysiaJS + Bun)
*Vị trí: `apps/api` - Máy chủ Backend hiệu năng cao xử lý I/O và AI pipeline.*

| Đường dẫn file | Vai trò & Chức năng chi tiết |
| :--- | :--- |
| [`src/index.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/index.ts) | Khởi tạo server Elysia, gắn plugin `@elysiajs/cors`, tài liệu tương tác `@elysiajs/swagger` tại `/swagger`, endpoint `/health`, và liên kết 4 module con (`/api/rag`, `/api/contract`, `/api/drafting`, `/api/chat`). |
| [`src/lib/ai-providers.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/lib/ai-providers.ts) | Khởi tạo kết nối đa mô hình (OpenRouter Claude 3.5 Sonnet / Haiku hoặc OpenAI GPT-4o / GPT-4o-mini). |
| [`src/modules/rag/catalog.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/rag/catalog.ts) | Kho tri thức luật cốt lõi (Bộ luật Dân sự 2015, Luật Thương mại 2005, Bộ luật Lao động 2019, Luật Đất đai 2024, Luật Doanh nghiệp 2020) được chuẩn hóa để hệ thống hoạt động ngay lập tức kể cả khi DB chưa cào dữ liệu lớn. |
| [`src/modules/rag/service.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/rag/service.ts) | Dịch vụ tìm kiếm lai (Hybrid Search): Truy vấn Postgres Full-text search `tsvector` khi DB sẵn sàng, tự động chuyển đổi sang chấm điểm tương đồng thông minh với catalog. |
| [`src/modules/rag/index.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/rag/index.ts) | Endpoint GET `/api/rag/search` và GET `/api/rag/citations/:id`. |
| [`src/modules/contract/service.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/contract/service.ts) | Engine rà soát hợp đồng: Tự động phát hiện bẫy phạt vi phạm quá 8% (Luật Thương mại Đ301), lãi suất quá 20%/năm (BLDS Đ468), đơn phương chấm dứt không báo trước (BLDS Đ428), thiếu điều khoản bất khả kháng; tính điểm rủi ro và tạo Redline sửa đổi. |
| [`src/modules/contract/index.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/contract/index.ts) | Endpoint POST `/api/contract/analyze`. |
| [`src/modules/drafting/templates.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/drafting/templates.ts) | Thư viện 3 mẫu đơn từ chuẩn: Đơn khởi kiện đòi nợ, Hợp đồng thuê nhà ở/mặt bằng, Giấy ủy quyền cá nhân. |
| [`src/modules/drafting/service.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/drafting/service.ts) | Dịch vụ sinh văn bản hành chính theo quy chuẩn Nghị định 30/2020/NĐ-CP (Quốc hiệu, Tiêu ngữ, Căn cứ pháp luật, Danh mục chứng cứ kèm theo, Hướng dẫn nộp án phí). |
| [`src/modules/drafting/index.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/drafting/index.ts) | Endpoint GET `/api/drafting/templates` và POST `/api/drafting/generate`. |
| [`src/modules/chat/service.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/chat/service.ts) | Dịch vụ Trợ lý AI: Tích hợp RAG, trích xuất căn cứ pháp lý, lập chuỗi suy luận 4 bước (Chain of Thought), tổng hợp lời khuyên và đính kèm tuyên bố miễn trừ trách nhiệm. |
| [`src/modules/chat/index.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/chat/index.ts) | Endpoint POST `/api/chat`. |

---

### 2.6. Ứng dụng Frontend Web `@legal-mind/web` (React 19 + Vite)
*Vị trí: `apps/web` - Giao diện người dùng sang trọng, trực quan chuẩn phong cách Pháp lý.*

| Đường dẫn file | Vai trò & Chức năng chi tiết |
| :--- | :--- |
| [`vite.config.ts`](file:///Users/duongkhuong/legal-mind/apps/web/vite.config.ts) | Cấu hình Vite dev server chạy port 3000, cấu hình proxy `/api` chuyển tiếp tự động sang backend port 3001. |
| [`tailwind.config.js`](file:///Users/duongkhuong/legal-mind/apps/web/tailwind.config.js) | Cấu hình bảng màu pháp lý: Tông xanh đêm hoàng gia (`legal` navy), điểm nhấn vàng đồng (`gold` / amber), font chữ kết hợp giữa Sans hiện đại và Serif học thuật (`Merriweather`). |
| [`src/index.css`](file:///Users/duongkhuong/legal-mind/apps/web/src/index.css) | Tailwind directives, tùy biến thanh cuộn vàng đồng tinh tế. |
| [`src/lib/utils.ts`](file:///Users/duongkhuong/legal-mind/apps/web/src/lib/utils.ts) | Hàm `cn()` kết hợp `clsx` và `tailwind-merge`. |
| [`src/components/CitationDrawer.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/CitationDrawer.tsx) | Modal hiển thị chi tiết điều luật: Trích lục nguyên văn, Số hiệu văn bản, Huy hiệu trạng thái "Còn hiệu lực", liên kết kiểm tra trên Cổng TTĐT Chính phủ. |
| [`src/components/LegalChatView.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/LegalChatView.tsx) | Giao diện Chatbot pháp lý: Gợi ý 4 câu hỏi thực tế phổ biến, hiển thị khối suy luận Chain-of-Thought gập/mở, gắn các huy hiệu dẫn nguồn tương tác (Interactive Citation Badges). |
| [`src/components/ContractReviewView.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/ContractReviewView.tsx) | Giao diện rà soát hợp đồng: Nút nạp nhanh mẫu HĐ thương mại/vay tiền, đồng hồ đo điểm rủi ro (0 - 100), phân loại cảnh báo Critical/High/Safe, và khối so sánh Redline (gạch đỏ đoạn rủi ro, nền xanh đoạn sửa đổi). |
| [`src/components/LegalDraftingView.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/LegalDraftingView.tsx) | Giao diện Wizard soạn thảo: Cho phép chọn mẫu đơn, hiển thị form nhập dữ liệu động, sinh văn bản hành chính trang trọng trên giấy ảo, cung cấp nút sao chép và hướng dẫn nộp hồ sơ. |
| [`src/App.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/App.tsx) | Khung giao diện chính (Header với logo cán cân công lý, thanh chuyển 3 Tab tính năng, đèn trạng thái hệ thống, và Footer tuyên bố miễn trừ pháp lý). |
| [`src/main.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/main.tsx) | Điểm gắn React 19 vào DOM (`#root`). |

---

## 3. NHẬT KÝ THAY ĐỔI CHI TIẾT THEO MỐC THỜI GIAN (AUDIT TRAIL)

### ⏱️ Mốc 1: Phân tích & Xây dựng Chiến lược Kỹ thuật
- **Thời gian**: `2026-10-25 17:15:42 GMT+7`
- **Tác vụ**: Phân tích kiến trúc AI của Paw-Hub và chuyển giao sang Legal-Mind.
- **Chi tiết thay đổi**:
  - `[ADDED]` [`LEGAL_MIND_AI_ROADMAP.md`](file:///Users/duongkhuong/legal-mind/LEGAL_MIND_AI_ROADMAP.md): Tạo bản thiết kế kiến trúc toàn diện gồm 7 phần, đối chiếu kinh nghiệm từ Paw-Hub, thiết kế 3 tính năng cốt lõi (RAG Dẫn nguồn, Rà soát Hợp đồng, Soạn thảo Đơn từ) và kế hoạch 4 giai đoạn.
  - `[ADDED]` [`README.md`](file:///Users/duongkhuong/legal-mind/README.md): Khởi tạo tài liệu giới thiệu dự án ban đầu.

---

### ⏱️ Mốc 2: Thiết lập Hạ tầng Monorepo & Các Gói Dùng Chung
- **Thời gian**: `2026-10-25 17:35:00 - 17:40:00 GMT+7`
- **Tác vụ**: Khởi tạo cấu trúc Turborepo + pnpm workspaces và 3 packages cơ sở.
- **Chi tiết thay đổi**:
  - `[ADDED]` [`package.json`](file:///Users/duongkhuong/legal-mind/package.json), [`pnpm-workspace.yaml`](file:///Users/duongkhuong/legal-mind/pnpm-workspace.yaml), [`turbo.json`](file:///Users/duongkhuong/legal-mind/turbo.json), [`tsconfig.base.json`](file:///Users/duongkhuong/legal-mind/tsconfig.base.json), [`.gitignore`](file:///Users/duongkhuong/legal-mind/.gitignore), [`.env.example`](file:///Users/duongkhuong/legal-mind/.env.example).
  - `[ADDED]` **`packages/legal-schemas`**: Tạo các Zod schema cho Citation, Contract Review, Drafting Wizard, và Chat Metadata.
  - `[ADDED]` **`packages/env`**: Tạo schema xác thực biến môi trường phía server (`PORT`, `DATABASE_URL`, API keys) và client (`VITE_API_URL`).
  - `[ADDED]` **`packages/db`**: Tạo file migration SQL [`schema.sql`](file:///Users/duongkhuong/legal-mind/packages/db/src/schema.sql) kích hoạt `pgvector`, `unaccent`, tạo bảng cho văn bản luật, chunks, hợp đồng, và client kết nối `pg.Pool`.

---

### ⏱️ Mốc 3: Xây dựng Backend API (ElysiaJS + Bun)
- **Thời gian**: `2026-10-25 17:40:00 - 17:42:00 GMT+7`
- **Tác vụ**: Phát triển toàn bộ các module xử lý logic nghiệp vụ và AI tại `apps/api`.
- **Chi tiết thay đổi**:
  - `[ADDED]` **Module RAG** (`apps/api/src/modules/rag/`): Cung cấp kho dữ liệu mẫu 5 bộ luật cốt lõi Việt Nam, thuật toán tìm kiếm lai Hybrid Search, tra cứu trích dẫn theo ID.
  - `[ADDED]` **Module Contract** (`apps/api/src/modules/contract/`): Cung cấp engine rà soát rủi ro hợp đồng tự động, tính thang điểm rủi ro và sinh đoạn đề xuất sửa đổi (Redline).
  - `[ADDED]` **Module Drafting** (`apps/api/src/modules/drafting/`): Cung cấp 3 mẫu đơn từ chuẩn và engine sinh văn bản chuẩn Nghị định 30/2020/NĐ-CP.
  - `[ADDED]` **Module Chat** (`apps/api/src/modules/chat/`): Trợ lý hội thoại kết nối RAG, tạo các bước suy luận Chain-of-Thought và gắn huy hiệu dẫn nguồn.
  - `[ADDED]` **Máy chủ chính** (`apps/api/src/index.ts`): Cấu hình Swagger UI tự động tại `/swagger`, kích hoạt CORS.

---

### ⏱️ Mốc 4: Xây dựng Frontend Web (React 19 + Tailwind CSS)
- **Thời gian**: `2026-10-25 17:42:00 - 17:45:15 GMT+7`
- **Tác vụ**: Phát triển ứng dụng Web trực quan tại `apps/web`.
- **Chi tiết thay đổi**:
  - `[ADDED]` Cấu hình giao diện: [`tailwind.config.js`](file:///Users/duongkhuong/legal-mind/apps/web/tailwind.config.js) với bảng màu navy & gold sang trọng, font Merriweather + Plus Jakarta Sans.
  - `[ADDED]` [`CitationDrawer.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/CitationDrawer.tsx): Modal xem nguyên văn điều luật và kiểm tra hiệu lực văn bản.
  - `[ADDED]` [`LegalChatView.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/LegalChatView.tsx): Giao diện hỏi đáp luật có trích dẫn nguồn và suy luận Chain-of-Thought.
  - `[ADDED]` [`ContractReviewView.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/ContractReviewView.tsx): Giao diện rà soát hợp đồng kèm bộ so sánh Redline Track Changes.
  - `[ADDED]` [`LegalDraftingView.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/components/LegalDraftingView.tsx): Trình Wizard điền form và sinh văn bản hành chính trang trọng.
  - `[ADDED]` [`App.tsx`](file:///Users/duongkhuong/legal-mind/apps/web/src/App.tsx): Thanh điều hướng 3 tab chức năng, chỉ báo trạng thái và chân trang miễn trừ trách nhiệm.

---

### ⏱️ Mốc 5: Tinh chỉnh Cấu hình Dependencies & Kiểm thực Vận hành
- **Thời gian**: `2026-10-25 17:45:30 - 17:47:35 GMT+7`
- **Tác vụ**: Xử lý lỗi cài đặt pnpm và kiểm tra build/run thực tế.
- **Chi tiết thay đổi**:
  - `[FIXED]` [`apps/api/package.json`](file:///Users/duongkhuong/legal-mind/apps/api/package.json): Loại bỏ gói không tồn tại `@ai-sdk/openrouter`, chuẩn hóa cấu hình sử dụng `@ai-sdk/openai` với baseURL OpenRouter.
  - `[FIXED]` [`pnpm-workspace.yaml`](file:///Users/duongkhuong/legal-mind/pnpm-workspace.yaml): Bổ sung `allowBuilds: { esbuild: true }` để khắc phục lỗi chặn build script của pnpm v11+.
  - `[MODIFIED]` [`.env`](file:///Users/duongkhuong/legal-mind/.env): Khởi tạo file cấu hình môi trường thực tế từ `.env.example`.
  - `[VERIFIED]` Chạy thử nghiệm thành công:
    - Frontend build: `pnpm --filter=@legal-mind/web build` hoàn tất không lỗi trong 1.30s.
    - Backend API: Khởi động thành công trên cổng 3001, endpoint `/health` và `/api/rag/search?q=lãi suất` trả về dữ liệu trích dẫn chuẩn xác.

---

### ⏱️ Mốc 6: Khởi tạo File Nhật ký Truy vết Dự án Toàn diện
- **Thời gian**: `2026-10-25 17:53:07 GMT+7`
- **Tác vụ**: Tạo file theo dõi tiến độ và bản đồ kiến trúc toàn dự án.
- **Chi tiết thay đổi**:
  - `[ADDED]` [`PROJECT_PROGRESS_LOG.md`](file:///Users/duongkhuong/legal-mind/PROJECT_PROGRESS_LOG.md): Tổng hợp cấu trúc, phân loại chi tiết từng file, lập bảng theo dõi mốc thời gian và quy chuẩn cập nhật liên tục cho các phiên làm việc tiếp theo.
  - `[MODIFIED]` [`README.md`](file:///Users/duongkhuong/legal-mind/README.md): Cập nhật liên kết dẫn trực tiếp tới file nhật ký tiến độ.

---

### ⏱️ Mốc 7: Hiện Thực Hóa RAG Với Embeddings & Database Thật (PostgreSQL + pgvector)
- **Thời gian**: `2026-10-25 19:05:00 GMT+7`
- **Tác vụ**: Triển khai cơ sở dữ liệu vector thật, sinh embeddings 1536D bằng OpenRouter, và nâng cấp thuật toán Hybrid Search.
- **Chi tiết thay đổi**:
  - `[ADDED]` [`docker-compose.yml`](file:///Users/duongkhuong/legal-mind/docker-compose.yml): Triển khai container `legalmind-postgres` image `pgvector/pgvector:pg16` trên cổng `5433` kèm volume `legalmind-pgdata`.
  - `[ADDED]` [`packages/db/src/embeddings.ts`](file:///Users/duongkhuong/legal-mind/packages/db/src/embeddings.ts): Service sinh vector embedding 1536 chiều bằng OpenRouter `text-embedding-3-small`, kèm fallback deterministic vector.
  - `[ADDED]` [`packages/db/src/seed-data.ts`](file:///Users/duongkhuong/legal-mind/packages/db/src/seed-data.ts): Tập dữ liệu 5 bộ luật cốt lõi (Bộ luật Dân sự 2015, Luật Thương mại 2005, Bộ luật Lao động 2019, Luật Đất đai 2024, Luật Doanh nghiệp 2020) chuẩn cấu trúc phân cấp.
  - `[ADDED]` [`packages/db/src/seed.ts`](file:///Users/duongkhuong/legal-mind/packages/db/src/seed.ts): Pipeline ETL tự động sinh embeddings thật và lưu trữ 18 chunks vào PostgreSQL.
  - `[MODIFIED]` [`packages/db/src/schema.sql`](file:///Users/duongkhuong/legal-mind/packages/db/src/schema.sql): Bổ sung index HNSW `vector_cosine_ops` và trigger tự động cập nhật `search_vector tsvector` với `unaccent`.
  - `[MODIFIED]` [`apps/api/src/modules/rag/service.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/rag/service.ts): Nâng cấp sang **True Hybrid Search** kết hợp giữa Cosine Similarity và BM25 Full-text rank, có lọc theo `status = 'ACTIVE'`.
  - `[MODIFIED]` [`apps/api/src/modules/chat/service.ts`](file:///Users/duongkhuong/legal-mind/apps/api/src/modules/chat/service.ts): Kết nối OpenRouter LLM, nạp trích lục từ database thật làm căn cứ pháp lý chống hallucination.
  - `[VERIFIED]`: Đã kiểm thử vector search trong PostgreSQL:
    - *"lãi suất cho vay tối đa"*: Trả về chính xác **Điều 468 Bộ luật Dân sự 2015**.
    - *"phạt vi phạm hợp đồng thương mại tối đa"*: Trả về chính xác **Điều 301 Luật Thương mại 2005** (Score 90%).
    - *"điều kiện chuyển nhượng đất"*: Trả về chính xác **Điều 45 Luật Đất đai 2024** (Score 100%).

---

## 4. HƯỚNG DẪN CẬP NHẬT NHẬT KÝ CHO CÁC LẦN CHỈNH SỬA TIẾP THEO

Khi thực hiện bất kỳ chỉnh sửa nào trong tương lai (thêm tính năng mới, chỉnh sửa logic, sửa lỗi), hãy thực hiện theo mẫu chuẩn dưới đây và nối tiếp vào cuối **Phần 3**:

```markdown
### ⏱️ Mốc [Số thứ tự]: [Tên tóm tắt công việc thực hiện]
- **Thời gian**: `YYYY-MM-DD HH:mm:ss GMT+7`
- **Tác vụ**: [Mô tả ngắn gọn mục tiêu của phiên làm việc]
- **Chi tiết thay đổi**:
  - `[ADDED / MODIFIED / FIXED / REFACTORED]` [`[Tên file]`]([Đường dẫn file]): [Mô tả chi tiết nội dung đã thay đổi và lý do thực hiện].
  - `[VERIFIED]`: [Kết quả kiểm tra, test, build sau khi thay đổi].
```

---
*Tài liệu này được cập nhật tự động và liên tục sau mỗi phiên làm việc trên dự án Legal-Mind.*
