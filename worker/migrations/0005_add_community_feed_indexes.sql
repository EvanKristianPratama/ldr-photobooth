-- Migration: Add composite feed indexes for cursor pagination
CREATE INDEX IF NOT EXISTS idx_frames_feed_new ON frames(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_frames_feed_top ON frames(usage_count DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_posts_feed_new ON posts(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_feed_top ON posts(likes DESC, created_at DESC, id DESC);
