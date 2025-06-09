-- Item_Views Table Migration
-- This table stores information about which menu items have been viewed by customers

CREATE TABLE IF NOT EXISTS Item_Views (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  item_id INTEGER NOT NULL,
  view_time DATETIME NOT NULL,
  FOREIGN KEY (item_id) REFERENCES Menu_Items(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_item_views_item_id ON Item_Views (item_id);
