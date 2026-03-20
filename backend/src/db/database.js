'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'agent.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone         TEXT    UNIQUE NOT NULL,
    name          TEXT,
    email         TEXT,
    status        TEXT    NOT NULL DEFAULT 'new',
    notes         TEXT,
    last_message_at DATETIME,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_phone TEXT    NOT NULL,
    role       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS properties (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    location      TEXT    NOT NULL,
    url           TEXT    NOT NULL,
    description   TEXT,
    property_type TEXT,
    price_range   TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_phone       TEXT    NOT NULL,
    lead_name        TEXT,
    lead_email       TEXT,
    property_desc    TEXT,
    scheduled_at     DATETIME NOT NULL,
    calendar_event_id TEXT,
    status           TEXT    NOT NULL DEFAULT 'confirmed',
    notes            TEXT,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default settings if absent
const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
const defaultSettings = {
  agent_name: process.env.AGENT_NAME || 'Priya',
  company_name: process.env.REAL_ESTATE_COMPANY_NAME || 'YourRealty',
  openai_model: process.env.OPENAI_MODEL || 'gpt-4o',
  property_website_base_url:
    process.env.PROPERTY_WEBSITE_BASE_URL ||
    'https://www.yourrealestate.com/properties',
};
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

module.exports = db;
