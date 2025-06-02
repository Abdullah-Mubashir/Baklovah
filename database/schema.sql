-- database/schema.sql

-- Table for Menu Item Categories
CREATE TABLE IF NOT EXISTS `Categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Name of the category (e.g., Appetizers, Main Courses)',
  `description` TEXT COMMENT 'Optional description for the category',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Menu Items
CREATE TABLE IF NOT EXISTS `Menu_Items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT COMMENT 'Foreign key referencing Categories table',
  `name` VARCHAR(255) NOT NULL COMMENT 'Name of the menu item',
  `description` TEXT COMMENT 'Detailed description of the menu item',
  `price` DECIMAL(10, 2) NOT NULL COMMENT 'Price of the menu item',
  `image_url` VARCHAR(2048) COMMENT 'URL of the image for the menu item (e.g., S3 link)',
  `is_available` BOOLEAN DEFAULT TRUE COMMENT 'Indicates if the item is currently available for ordering',
  `view_count` INT DEFAULT 0 COMMENT 'Analytics: Number of times this item has been viewed',
  `purchase_count` INT DEFAULT 0 COMMENT 'Analytics: Number of times this item has been purchased',
  `like_count` INT DEFAULT 0 COMMENT 'Analytics: Number of times this item has been liked (if feature implemented)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `Categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Users (Admin, Cashier)
CREATE TABLE IF NOT EXISTS `Users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Login username',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hashed password',
  `role` ENUM('admin', 'cashier') NOT NULL COMMENT 'Role of the user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Orders
CREATE TABLE IF NOT EXISTS `Orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_name` VARCHAR(255) COMMENT 'Name of the customer placing the order',
  `customer_phone` VARCHAR(20) COMMENT 'Phone number of the customer',
  `customer_email` VARCHAR(255) COMMENT 'Email address of the customer',
  `delivery_address` TEXT COMMENT 'Delivery address (if applicable)',
  `order_type` ENUM('delivery', 'pickup') NOT NULL COMMENT 'Type of order',
  `total_amount` DECIMAL(10, 2) NOT NULL COMMENT 'Total amount for the order',
  `status` ENUM('pending_payment', 'pending_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled') DEFAULT 'pending_payment' COMMENT 'Current status of the order',
  `payment_intent_id` VARCHAR(255) UNIQUE COMMENT 'Stripe PaymentIntent ID for tracking payment',
  `notes` TEXT COMMENT 'Any special notes or requests from the customer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Order Items (Line items for each order)
CREATE TABLE IF NOT EXISTS `Order_Items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL COMMENT 'Foreign key referencing Orders table',
  `menu_item_id` INT COMMENT 'Foreign key referencing Menu_Items table. Can be NULL if item was deleted, but name/price are preserved.',
  `quantity` INT NOT NULL COMMENT 'Quantity of this item ordered',
  `price_at_purchase` DECIMAL(10, 2) NOT NULL COMMENT 'Price of the item at the time of order, for historical accuracy',
  `item_name_at_purchase` VARCHAR(255) NOT NULL COMMENT 'Name of the item at the time of order, for historical accuracy',
  FOREIGN KEY (`order_id`) REFERENCES `Orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`menu_item_id`) REFERENCES `Menu_Items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE -- Allows menu item deletion without breaking old orders
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Site Settings (e.g., for admin to customize parts of the website)
CREATE TABLE IF NOT EXISTS `Site_Settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique key for the setting (e.g., "homepage_banner_text")',
  `setting_value` TEXT COMMENT 'Value of the setting',
  `description` TEXT COMMENT 'Description of what this setting controls',
  `data_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT 'Optional: data type hint for the setting value',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example initial site settings (optional, can be inserted via admin panel later)
-- INSERT INTO `Site_Settings` (`setting_key`, `setting_value`, `description`, `data_type`) VALUES
-- ('restaurant_name', 'Baklovah Delights', 'The official name of the restaurant displayed on the site', 'string'),
-- ('contact_phone', '555-123-4567', 'Main contact phone number for the restaurant', 'string'),
-- ('contact_email', 'info@baklovah.com', 'Main contact email for the restaurant', 'string');
