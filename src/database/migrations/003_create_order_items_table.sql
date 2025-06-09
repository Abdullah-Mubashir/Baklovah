CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL, -- Price at the time of order for this item (quantity * unit price)
  unit_price DECIMAL(10,2) NOT NULL, -- Unit price of the item at the time of order
  item_name TEXT NOT NULL, -- Name of the item at the time of order
  item_notes TEXT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT -- Prevent deleting menu items if they are part of an order
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
