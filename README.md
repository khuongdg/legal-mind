# ⚖️ Legal-Mind: Trợ Lý AI Pháp Lý Việt Nam

**Legal-Mind** là hệ thống trợ lý trí tuệ nhân tạo chuyên sâu về pháp luật Việt Nam, cung cấp 3 tính năng cốt lõi:
1. **RAG Tra cứu Luật pháp có Dẫn nguồn chính xác**: Dẫn chiếu trực tiếp đến từng Điều/Khoản, kiểm tra trạng thái hiệu lực pháp lý và hiển thị popover nguyên văn văn bản luật.
2. **Phân tích & Rà soát Hợp đồng**: Tự động bóc tách điều khoản, đánh giá rủi ro pháp lý theo quy chuẩn luật Việt Nam, đề xuất chỉnh sửa trực quan (Visual Redline / Diff).
3. **Hỗ trợ Soạn thảo Văn bản & Đơn từ Pháp lý**: Quy trình phỏng vấn từng bước (Guided Wizard) tự động sinh văn bản đúng thể thức hành chính chuẩn (Nghị định 30/2020/NĐ-CP) và xuất file `.docx` / `.pdf`.

---

## 📖 Tài liệu Kỹ thuật, Kiến trúc & Nhật ký Tiến độ

- 🌐 **[PROJECT_PROGRESS_LOG.html](file:///Users/duongkhuong/legal-mind/PROJECT_PROGRESS_LOG.html)** (hoặc truy cập `http://localhost:3000/progress.html`): **Bảng theo dõi trực quan bằng HTML** (hỗ trợ lọc danh mục, tìm kiếm file tức thì, và dòng thời gian tương tác).
- 📜 **[PROJECT_PROGRESS_LOG.md](file:///Users/duongkhuong/legal-mind/PROJECT_PROGRESS_LOG.md)**: Nhật ký phát triển định dạng Markdown chuẩn.
- 📑 **[LEGAL_MIND_AI_ROADMAP.md](file:///Users/duongkhuong/legal-mind/LEGAL_MIND_AI_ROADMAP.md)**: Bản đặc tả kiến trúc kỹ thuật toàn diện, phân tích chuyển giao AI từ Paw-Hub và lộ trình phát triển.

---

## 🏗️ Kiến trúc Công nghệ

- **Mô hình Repository**: Monorepo (`pnpm` + `Turborepo`)
- **Frontend**: React 19 + Vite, Tailwind CSS v4, Lucide icons, TipTap Editor, Vercel AI SDK Client.
- **Backend API**: ElysiaJS trên Bun runtime (type-safe RPC, Swagger OpenAPI tại `/swagger`).
- **Cơ sở dữ liệu**: PostgreSQL 16+ với extension `pgvector` (quản lý Hybrid Search BM25 + Dense Vector).
- **Mô hình AI**: Claude 3.5 Sonnet / Gemini 2.5 Pro (Lập luận pháp lý), Claude Haiku / Gemini Flash (Trích xuất nhanh), OpenAI `text-embedding-3-large` / `vietnamese-bi-encoder`.

---

## 🚀 Hướng dẫn Chạy Nhanh

```bash
# Cài đặt dependencies toàn bộ monorepo
pnpm install

# Khởi chạy đồng thời cả Web và API
pnpm dev

# Hoặc chạy riêng lẻ:
pnpm dev:api   # API Backend: http://localhost:3001
pnpm dev:web   # Web Frontend: http://localhost:3000
```

## Nạp dữ liệu RAG

Điền đường dẫn nguồn DOCX/PDF cho văn bản trong `scripts/laws_config.yaml`. Cài dependencies Python một lần bằng `python3 -m pip install -r scripts/requirements.txt` trong interpreter định dùng; lệnh tự chọn `.venv/bin/python` nếu có, nếu không sẽ dùng `python3`. Có thể đặt `RAG_PYTHON` để chọn interpreter khác. Mỗi lần thêm hoặc cập nhật văn bản chạy:

```bash
pnpm rag:ingest
```

Lệnh này parse nguồn, chạy migration idempotent và upsert documents, collection membership cùng chunks vào PostgreSQL. Nội dung nguồn không đổi sẽ giữ embeddings hiện có; nội dung thay đổi sẽ được embed lại chỉ cho văn bản đó. Ingestion yêu cầu API key embedding thật và dừng nếu provider lỗi, không ghi vector fallback giả. JSON trung gian được giữ trong `scripts/data/` trên máy và Git bỏ qua. Không có seed corpus mẫu; `pnpm rag:ingest` chỉ nạp các luật có nguồn được cấu hình và không xóa văn bản khác.
