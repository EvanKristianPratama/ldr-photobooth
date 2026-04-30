-- Migration: Add frame_id to posts
ALTER TABLE posts ADD COLUMN frame_id TEXT;
