-- SQL Schema for Supabase Tables
-- Run this in the Supabase SQL Editor

-- 1. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    phone         TEXT    UNIQUE NOT NULL,
    name          TEXT,
    email         TEXT,
    status        TEXT    NOT NULL DEFAULT 'new',
    notes         TEXT,
    last_message_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    lead_phone TEXT    NOT NULL REFERENCES leads(phone) ON DELETE CASCADE,
    role       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    location      TEXT    NOT NULL,
    url           TEXT    NOT NULL,
    description   TEXT,
    property_type TEXT,
    price_range   TEXT,
    images        JSONB   NOT NULL DEFAULT '[]',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id               BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    lead_phone       TEXT    NOT NULL REFERENCES leads(phone) ON DELETE CASCADE,
    lead_name        TEXT,
    lead_email       TEXT,
    property_desc    TEXT,
    scheduled_at     TIMESTAMPTZ NOT NULL,
    calendar_event_id TEXT,
    calendar_event_link TEXT,
    status           TEXT    NOT NULL DEFAULT 'confirmed',
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Optional, but recommended for production)
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────
-- AI Training Features Schema
-- ──────────────────────────────────────────────────────────────────

-- 6. AI Training Q&A Table
CREATE TABLE IF NOT EXISTS ai_training_qa (
    id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    question   TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    filename   TEXT    NOT NULL,
    file_url   TEXT,
    status     TEXT    NOT NULL DEFAULT 'processing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 8. Knowledge Chunks Table (for RAG / Vector search)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    document_id   BIGINT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    content       TEXT   NOT NULL,
    embedding     vector(768),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a function for vector similarity search matching pgvector
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  document_id bigint,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.document_id,
    k.content,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks k
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
