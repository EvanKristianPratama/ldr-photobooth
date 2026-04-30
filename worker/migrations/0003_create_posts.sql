-- Migration: Create posts table for photo results
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT,
  author TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'solo', -- 'solo' or 'duo'
  created_at TEXT NOT NULL,
  likes INTEGER DEFAULT 0
);

-- Index for discovery
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
