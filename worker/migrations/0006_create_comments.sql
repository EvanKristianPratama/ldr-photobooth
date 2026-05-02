-- Migration: Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'frames' or 'posts'
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Index for fetching comments for a specific item
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_id, target_type);
