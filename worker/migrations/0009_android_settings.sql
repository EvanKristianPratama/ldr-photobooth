-- Migration: Create system_settings table for Android Configs & CMS Customization
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO system_settings (key, value) VALUES ('android_photo_choices', '1,3,4');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('receipt_title', 'LDR THERMAL BOOTH');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('receipt_subtitle', 'STORE #9821 // ZURICH CO-OP STUDIO');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('receipt_slogan', 'THANK YOU FOR YOUR VISIT!');
