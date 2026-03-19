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
