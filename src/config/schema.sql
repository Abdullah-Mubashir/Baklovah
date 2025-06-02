-- Baklovah Restaurant Database Schema
-- This script creates all the necessary tables for the restaurant website

-- Drop tables if they exist to avoid errors
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS item_analytics;
DROP TABLE IF EXISTS users;

-- Users table for admin and cashier access
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,  -- Will store bcrypt hashed passwords
  role ENUM('admin', 'cashier') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  category VARCHAR(50),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  customer_phone VARCHAR(20),
  order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('placed', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'placed',
  total_amount DECIMAL(10, 2) NOT NULL,
  time_remaining INT,  -- Minutes until ready, nullable
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Order items table (links orders to menu items)
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL,
  item_price DECIMAL(10, 2) NOT NULL,  -- Price at time of order
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Item analytics table for tracking views, purchases, likes
CREATE TABLE item_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_item_id INT NOT NULL,
  views INT DEFAULT 0,
  purchases INT DEFAULT 0,
  likes INT DEFAULT 0,
  last_viewed TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Insert default admin user (username: admin, password: admin123)
-- Note: In production, change this password immediately
INSERT INTO users (username, password, role) VALUES 
('admin', '$2b$10$CZvDLHM7Z3vLZUNRVTpVgOBUOgTr6Qm.OlVmGxOBCK5PbQB6KUZcy', 'admin'),
('cashier', '$2b$10$qsI3RlTIRkQnQHWz3QF0zeXoRZO4spfzJgrAs/iYMmeFxe3FfKnkG', 'cashier');

-- Insert some sample menu items
INSERT INTO menu_items (title, description, price, category) VALUES
('Baklava', 'Traditional sweet pastry made with layers of filo, filled with chopped nuts, and sweetened with syrup or honey', 5.99, 'Desserts'),
('Turkish Coffee', 'Strong coffee prepared by boiling finely ground coffee beans with water and sugar', 3.99, 'Beverages'),
('Kunafa', 'Traditional Middle Eastern dessert made with thin noodle-like pastry soaked in sweet, sugar-based syrup', 7.99, 'Desserts'),
('Shawarma Wrap', 'Grilled meat wrapped in pita bread with vegetables and tahini sauce', 9.99, 'Main Course'),
('Falafel Plate', 'Deep-fried patty made from ground chickpeas, served with salad and tahini sauce', 8.99, 'Main Course');

-- Initialize analytics for menu items
INSERT INTO item_analytics (menu_item_id, views, purchases, likes)
SELECT id, 0, 0, 0 FROM menu_items;
