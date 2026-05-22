-- Orders table for LDR Print Checkout
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  photo_url TEXT NOT NULL DEFAULT '',
  frame_id TEXT NOT NULL DEFAULT '',
  total_price INTEGER NOT NULL DEFAULT 51000,
  shipping_cost_1 INTEGER NOT NULL DEFAULT 0,
  shipping_cost_2 INTEGER NOT NULL DEFAULT 0,
  admin_fee INTEGER NOT NULL DEFAULT 1000,
  status TEXT NOT NULL DEFAULT 'PENDING',
  shipping_address_1 TEXT NOT NULL DEFAULT '{}',
  shipping_address_2 TEXT NOT NULL DEFAULT '{}',
  session_mode TEXT NOT NULL DEFAULT 'duo',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
