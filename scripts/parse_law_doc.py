#!/usr/bin/env python3
"""
parse_law_doc.py — Parser file .doc/.docx Văn bản Luật pháp Việt Nam
=====================================================================
Đọc file Word (.doc/.docx) từ vbpl.vn, tách theo Điều/Khoản,
xuất dữ liệu JSON cho luồng ingest pháp luật.

Cài đặt:
    pip install python-docx

Nếu file là .doc (chưa phải .docx), cần convert trước:
    # Option 1: LibreOffice (miễn phí)
    soffice --headless --convert-to docx ~/Downloads/91.2015.QH13.doc

    # Option 2: Dùng online converter (word2cleanhtml.com, etc.)

Sử dụng:
    # Xem trước 5 điều đầu (kiểm tra parser nhận đúng không)
    python3 scripts/parse_law_doc.py ~/Downloads/blds_2015.docx --preview 5

    # Xem trước toàn văn đã parse → lưu JSON tạm
    python3 scripts/parse_law_doc.py ~/Downloads/blds_2015.docx \\
        --id blds-2015 \\
        --title "Bộ luật Dân sự 2015" \\
        --code "91/2015/QH13" \\
        --type BO_LUAT \\
        --authority QUOC_HOI \\
        --issued 2015-11-24 \\
        --effective 2017-01-01 \\
        --url "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=91939" \\
        --output scripts/data/blds_2015.json

    # Nạp dữ liệu chính thức qua manifest:
    # khai báo source trong scripts/laws_config.yaml rồi chạy pnpm rag:ingest

Hỗ trợ nhiều PDF (P1 + P2):
    python3 scripts/parse_law_doc.py P1.pdf P2.pdf --merge --output scripts/data/blds_2015.json
"""

import sys
import re
import json
import argparse
from pathlib import Path
from typing import Optional

# ─── Constants ─────────────────────────────────────────────────────────────────

# Pattern nhận biết đầu Điều: "Điều 1.", "Điều 1a.", "Điều 468."
ARTICLE_PATTERN = re.compile(
    r'^(Điều\s+(\d+[a-zđ]?))\s*[.\-–:]\s*(.*)$',
    re.UNICODE
)

# Pattern nhận biết đầu Khoản: "1. ...", "2. ..."
CLAUSE_PATTERN = re.compile(r'^(\d+)\.\s+(.+)$')

# Pattern Chương để track context
CHAPTER_PATTERN = re.compile(
    r'^(CHƯƠNG|Chương)\s+(I{1,3}|IV|VI{0,3}|IX|X{0,3}|\d+)[.\s]*(.*)?$',
    re.UNICODE
)

# Số từ tối đa mỗi chunk trước khi tách theo Khoản
MAX_WORDS_PER_CHUNK = 600


# ─── Word Document Parser ───────────────────────────────────────────────────────

def extract_text_from_docx(docx_path: str) -> list[str]:
    """
    Đọc .docx và trả về list các đoạn text (paragraphs).
    Giữ nguyên cấu trúc từng đoạn để nhận biết Điều/Khoản.
    """
    try:
        import docx as python_docx
    except ImportError:
        print("❌ Cần cài: pip install python-docx")
        sys.exit(1)

    print(f"📖 Đang đọc Word document: {docx_path}")
    doc = python_docx.Document(docx_path)

    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append(text)

    # Cũng đọc trong các bảng (tables) nếu có
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    text = para.text.strip()
                    if text and text not in paragraphs:
                        paragraphs.append(text)

    print(f"   → Tổng số đoạn văn: {len(paragraphs):,}")
    return paragraphs


# ─── PDF Parser (hỗ trợ multi-part) ───────────────────────────────────────────

def extract_text_from_pdfs(pdf_paths: list[str]) -> list[str]:
    """
    Đọc 1 hoặc nhiều PDF (P1, P2...) và trả về list paragraphs.
    """
    try:
        import pdfplumber
    except ImportError:
        print("❌ Cần cài: pip install pdfplumber")
        sys.exit(1)

    all_lines = []
    for pdf_path in pdf_paths:
        print(f"📖 Đang đọc PDF: {pdf_path}")
        with pdfplumber.open(pdf_path) as pdf:
            total = len(pdf.pages)
            print(f"   → {total} trang")
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if text:
                    for line in text.split("\n"):
                        line = line.strip()
                        if line and not re.match(r'^\d+$', line):  # Bỏ số trang
                            all_lines.append(line)
                if i % 50 == 0:
                    print(f"   → {i}/{total} trang...")

    print(f"   → Tổng dòng text: {len(all_lines):,}")
    return all_lines


# ─── Core Article Parser ───────────────────────────────────────────────────────

def parse_articles(lines: list[str]) -> tuple[list[dict], dict[str, str]]:
    """
    Tách danh sách dòng text thành list Article.
    Trả về (articles, chapter_map) — chapter_map[article_num] = chapter_context
    """
    articles = []
    chapter_map: dict[str, str] = {}
    current_article: Optional[dict] = None
    current_lines: list[str] = []
    current_chapter = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Cập nhật Chương
        chap_m = CHAPTER_PATTERN.match(line)
        if chap_m:
            num = chap_m.group(2)
            title = (chap_m.group(3) or "").strip()
            current_chapter = f"{num} - {title}" if title else num
            continue

        # Nhận biết Điều mới
        art_m = ARTICLE_PATTERN.match(line)
        if art_m:
            # Lưu điều trước
            if current_article is not None:
                current_article["raw_content"] = "\n".join(current_lines)
                articles.append(current_article)
                chapter_map[current_article["article_number_str"]] = current_chapter

            full_num_str = art_m.group(2)   # "468", "1a"
            title = art_m.group(3).strip()

            try:
                article_num = int(re.sub(r'[a-zđ]+$', '', full_num_str))
            except ValueError:
                article_num = 0

            current_article = {
                "article_number": article_num,
                "article_number_str": full_num_str,
                "article_title": title,
                "raw_content": ""
            }
            current_lines = [line]

        elif current_article is not None:
            # Tránh thu thập quá nhiều (header/watermark)
            if len(current_lines) < 300:
                current_lines.append(line)

    # Lưu điều cuối
    if current_article is not None and current_lines:
        current_article["raw_content"] = "\n".join(current_lines)
        articles.append(current_article)
        chapter_map[current_article["article_number_str"]] = current_chapter

    return articles, chapter_map


# ─── Chunking ──────────────────────────────────────────────────────────────────

def split_into_chunks(article: dict, chapter_context: str, doc_title: str) -> list[dict]:
    """Chuyển 1 Article → 1 hoặc nhiều chunks."""
    raw = article["raw_content"]
    article_num = article["article_number"]
    article_title = article["article_title"]

    # Xây context prefix dùng cho các chunk pháp luật.
    base_prefix = f"[VĂN BẢN: {doc_title}"
    if chapter_context:
        base_prefix += f" | CHƯƠNG: {chapter_context}"
    base_prefix += f" | ĐIỀU: {article_num} - {article_title}]"

    word_count = len(raw.split())

    # Nội dung ngắn → 1 chunk
    if word_count <= MAX_WORDS_PER_CHUNK:
        return [{
            "articleNumber": article_num,
            "articleTitle": article_title,
            "content": raw,
            "contextPrefix": base_prefix,
        }]

    # Nội dung dài → tách theo Khoản
    clauses = _split_by_clause(raw)
    if len(clauses) <= 1:
        # Không có Khoản → truncate
        truncated = " ".join(raw.split()[:MAX_WORDS_PER_CHUNK])
        return [{
            "articleNumber": article_num,
            "articleTitle": article_title,
            "content": truncated + "...",
            "contextPrefix": base_prefix,
        }]

    chunks = []
    for i, clause_text in enumerate(clauses, 1):
        clause_text = clause_text.strip()
        if not clause_text:
            continue
        chunks.append({
            "articleNumber": article_num,
            "articleTitle": article_title,
            "clauseNumber": i,
            "content": clause_text,
            "contextPrefix": f"{base_prefix} | KHOẢN: {i}",
        })
    return chunks


def _split_by_clause(text: str) -> list[str]:
    """Tách nội dung điều theo Khoản (1., 2., 3., ...)"""
    lines = text.split("\n")
    clauses = []
    current: list[str] = []

    for line in lines:
        if CLAUSE_PATTERN.match(line) and current:
            clauses.append("\n".join(current))
            current = [line]
        else:
            current.append(line)

    if current:
        clauses.append("\n".join(current))

    return [c for c in clauses if c.strip()]


# ─── Main Pipeline ─────────────────────────────────────────────────────────────

def run_pipeline(
    input_files: list[str],
    doc_id: str,
    doc_title: str,
    code_number: str,
    document_type: str,
    issuing_authority: str,
    issued_date: str,
    effective_date: str,
    official_source_url: str,
    status: str = "ACTIVE",
) -> dict:
    """Full pipeline: file(s) -> normalized parsed-document JSON."""

    # Xác định định dạng
    first_ext = Path(input_files[0]).suffix.lower()

    if first_ext in (".docx",):
        lines = extract_text_from_docx(input_files[0])
    elif first_ext == ".doc":
        print("⚠️  File .doc (binary format) cần convert sang .docx trước!")
        print("   Chạy: soffice --headless --convert-to docx " + input_files[0])
        print("   Hoặc mở bằng Word/LibreOffice và Save As .docx")
        sys.exit(1)
    elif first_ext == ".pdf":
        lines = extract_text_from_pdfs(input_files)
    else:
        print(f"❌ Không hỗ trợ định dạng: {first_ext}")
        print("   Hỗ trợ: .docx, .pdf")
        sys.exit(1)

    # Parse
    print("🔍 Đang tách Điều/Khoản...")
    articles, chapter_map = parse_articles(lines)
    print(f"   → Tìm thấy {len(articles)} điều luật")

    # Chunking
    all_chunks = []
    for article in articles:
        chapter = chapter_map.get(article["article_number_str"], "")
        chunks = split_into_chunks(article, chapter, doc_title)
        all_chunks.extend(chunks)

    print(f"   → Tạo {len(all_chunks)} chunks")

    return {
        "id": doc_id,
        "title": doc_title,
        "codeNumber": code_number,
        "documentType": document_type,
        "issuingAuthority": issuing_authority,
        "issuedDate": issued_date,
        "effectiveDate": effective_date,
        "status": status,
        "officialSourceUrl": official_source_url,
        "chunks": all_chunks,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Parse .docx / .pdf văn bản luật Việt Nam thành JSON trung gian",
        epilog="""
Ví dụ với file .docx (tốt nhất):
  python3 scripts/parse_law_doc.py ~/Downloads/blds.docx \\
    --id blds-2015 --title "Bộ luật Dân sự 2015" \\
    --code 91/2015/QH13 --type BO_LUAT \\
    --issued 2015-11-24 --effective 2017-01-01 \\
    --output scripts/data/blds_2015.json

Ví dụ với 2 file PDF (P1 + P2):
  python3 scripts/parse_law_doc.py P1.pdf P2.pdf \\
    --id blds-2015 --title "Bộ luật Dân sự 2015" \\
    --output scripts/data/blds_2015.json
        """
    )
    parser.add_argument("files", nargs="+", help="File .docx hoặc .pdf (có thể nhiều file P1, P2...)")
    parser.add_argument("--id", default="", help="Document ID (vd: blds-2015)")
    parser.add_argument("--title", default="", help="Tên đầy đủ văn bản")
    parser.add_argument("--code", default="", help="Số hiệu (vd: 91/2015/QH13)")
    parser.add_argument("--type", default="LUAT",
                        choices=["BO_LUAT", "LUAT", "NGHI_DINH", "THONG_TU", "AN_LE"])
    parser.add_argument("--authority", default="QUOC_HOI",
                        choices=["QUOC_HOI", "CHINH_PHU", "TOA_AN_TOI_CAO", "BO_TU_PHAP"])
    parser.add_argument("--issued", default="2024-01-01")
    parser.add_argument("--effective", default="2024-01-01")
    parser.add_argument("--url", default="https://vbpl.vn")
    parser.add_argument("--status", default="ACTIVE",
                        choices=["ACTIVE", "EXPIRED", "AMENDED"])
    parser.add_argument("--output", default="", help="Lưu JSON ra file")
    parser.add_argument("--preview", type=int, default=0,
                        help="Chỉ in N điều đầu để kiểm tra parser")

    args = parser.parse_args()

    # Tự suy ra ID/title từ tên file đầu tiên nếu chưa đặt
    first_file = Path(args.files[0])
    doc_id = args.id or first_file.stem.lower().replace(" ", "-").replace("_", "-")
    doc_title = args.title or first_file.stem.replace("_", " ").title()

    print(f"\n⚖️  Legal-Mind Doc Parser")
    print(f"{'─'*50}")
    print(f"Input:    {', '.join(args.files)}")
    print(f"Doc ID:   {doc_id}")
    print(f"Loại:     {args.type}")
    print(f"{'─'*50}\n")

    seed_doc = run_pipeline(
        input_files=args.files,
        doc_id=doc_id,
        doc_title=doc_title,
        code_number=args.code,
        document_type=args.type,
        issuing_authority=args.authority,
        issued_date=args.issued,
        effective_date=args.effective,
        official_source_url=args.url,
        status=args.status,
    )

    # Preview mode
    if args.preview > 0:
        print(f"\n📋 Preview {args.preview} chunks đầu tiên:\n")
        for i, chunk in enumerate(seed_doc["chunks"][:args.preview], 1):
            print(f"  [{i}] Điều {chunk['articleNumber']} — {chunk['articleTitle']}")
            print(f"      Prefix : {chunk['contextPrefix']}")
            print(f"      Nội dung ({len(chunk['content'].split())} từ):")
            print(f"      {chunk['content'][:200]}...")
            print()
        return

    # Lưu hoặc in
    output_str = json.dumps(seed_doc, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(output_str, encoding="utf-8")
        print(f"\n✅ Đã lưu: {args.output}")
    else:
        print(output_str)

    # Thống kê
    total_words = sum(len(c["content"].split()) for c in seed_doc["chunks"])
    avg_words = total_words / max(len(seed_doc["chunks"]), 1)
    print(f"\n📊 Thống kê:")
    print(f"   Tổng chunks : {len(seed_doc['chunks'])}")
    print(f"   Tổng từ     : {total_words:,}")
    print(f"   TB từ/chunk : {avg_words:.0f}")
    print("\nĐể nạp dữ liệu, khai báo file nguồn trong scripts/laws_config.yaml rồi chạy:")
    print("   pnpm rag:ingest")


if __name__ == "__main__":
    main()
