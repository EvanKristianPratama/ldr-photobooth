-- Migration: Create frame_templates table for CMS Frame Editor
CREATE TABLE IF NOT EXISTS frame_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  photo_count INTEGER NOT NULL,
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  orientation TEXT DEFAULT 'portrait',
  background_color TEXT DEFAULT '#ffffff',
  frame_mode TEXT DEFAULT 'solo',
  overlay_url TEXT,
  slots_json TEXT NOT NULL,
  text_elements_json TEXT,
  decorations_json TEXT,
  thumbnail_url TEXT,
  is_published INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ft_photo_count ON frame_templates(photo_count);
CREATE INDEX IF NOT EXISTS idx_ft_published ON frame_templates(is_published);
CREATE INDEX IF NOT EXISTS idx_ft_created_at ON frame_templates(created_at);
