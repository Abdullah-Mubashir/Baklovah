-- Fix for Item_Views Table
-- Drop the existing table if it exists
DROP TABLE IF EXISTS Item_Views;

-- Recreate the Item_Views table with proper SQLite syntax
CREATE TABLE IF NOT EXISTS Item_Views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  view_time DATETIME NOT NULL,
  FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_item_views_item_id ON Item_Views (item_id);
