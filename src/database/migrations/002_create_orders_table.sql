CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NULL,  -- NULL for guest orders 
  order_number VARCHAR(20) NOT NULL UNIQUE, -- Unique, customer-facing order ID (e.g., "BAK12345")
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, ready, completed, cancelled
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_time TIMESTAMP NULL,
  estimated_time_minutes INTEGER DEFAULT 15,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, authorized, paid
  payment_intent_id VARCHAR(255) NULL,  -- Stripe payment intent ID
  customer_name VARCHAR(100) NULL,
  customer_email VARCHAR(100) NULL,
  customer_phone VARCHAR(20) NULL,
  customer_notes TEXT NULL,
  FOREIGN KEY(customer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
