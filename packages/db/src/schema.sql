-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Legal Documents Table (Văn bản quy phạm pháp luật)
CREATE TABLE IF NOT EXISTS legal_documents (
    id VARCHAR(64) PRIMARY KEY, -- 'blds-2015', 'luat-thuong-mai-2005'
    title VARCHAR(255) NOT NULL,
    code_number VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'BO_LUAT', 'LUAT', 'NGHI_DINH', 'THONG_TU', 'AN_LE'
    issuing_authority VARCHAR(100), -- 'QUOC_HOI', 'CHINH_PHU', 'TOA_AN_TOI_CAO'
    issued_date DATE,
    effective_date DATE,
    status VARCHAR(30) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'AMENDED'
    official_source_url TEXT,
    source_hash CHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS source_hash CHAR(64);

CREATE TABLE IF NOT EXISTS legal_collections (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_collection_documents (
    collection_id VARCHAR(64) NOT NULL REFERENCES legal_collections(id) ON DELETE CASCADE,
    document_id VARCHAR(64) NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_collection_documents_document_id
    ON legal_collection_documents(document_id);

-- 2. Legal Chunks (Phân đoạn theo Điều/Khoản)
CREATE TABLE IF NOT EXISTS legal_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(64) NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
    article_number INT NOT NULL,
    article_title VARCHAR(255),
    clause_number INT,
    point_letter VARCHAR(10),
    content TEXT NOT NULL,
    context_prefix TEXT NOT NULL,
    embedding vector(1536), -- Vector embeddings (OpenAI text-embedding-3-large or Vietnamese Bi-Encoder)
    search_vector tsvector, -- Full-text search vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to automatically update search_vector with unaccent
CREATE OR REPLACE FUNCTION legal_chunks_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('simple', unaccent(coalesce(NEW.article_title, '') || ' ' || NEW.content));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_chunks_search_vector ON legal_chunks;
CREATE TRIGGER trg_legal_chunks_search_vector
BEFORE INSERT OR UPDATE ON legal_chunks
FOR EACH ROW EXECUTE FUNCTION legal_chunks_search_vector_update();

-- Indexes for Hybrid Search
CREATE INDEX IF NOT EXISTS idx_legal_chunks_doc_id ON legal_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_fts ON legal_chunks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding ON legal_chunks USING hnsw (embedding vector_cosine_ops);

-- 3. Contract Reviews (Hợp đồng & Rà soát)
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    file_url TEXT,
    contract_type VARCHAR(50) NOT NULL,
    raw_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    overall_risk_score INT NOT NULL,
    summary JSONB NOT NULL,
    analysis_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Legal Drafting Sessions (Phiên soạn thảo đơn từ)
CREATE TABLE IF NOT EXISTS drafting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    template_id VARCHAR(100) NOT NULL,
    form_data JSONB NOT NULL,
    generated_content TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
