-- Migration: Create frames table
CREATE TABLE IF NOT EXISTS frames (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  tags TEXT,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0
);

-- Index for faster discovery
CREATE INDEX IF NOT EXISTS idx_frames_created_at ON frames(created_at);
