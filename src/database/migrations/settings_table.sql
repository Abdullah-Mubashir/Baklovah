-- Settings table migration
-- This table stores all system settings in JSON format

CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(50) NOT NULL COMMENT 'Category of settings (system, order, stripe, etc.)',
  `settings_value` JSON NOT NULL COMMENT 'JSON object containing the settings',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings

-- System settings
INSERT INTO `settings` (`category`, `settings_value`) VALUES
('system', '{"siteName": "Baklovah Admin", "timeZone": "America/New_York", "dateFormat": "MM/DD/YYYY", "currencySymbol": "$", "maintenanceMode": false}');

-- Order settings
INSERT INTO `settings` (`category`, `settings_value`) VALUES
('order', '{"taxRate": 8.25, "minimumOrderAmount": 10.00, "deliveryFee": 5.00, "freeDeliveryThreshold": 30.00, "enableOnlineOrdering": true}');

-- Stripe settings
INSERT INTO `settings` (`category`, `settings_value`) VALUES
('stripe', '{"publishableKey": "", "secretKey": "", "testMode": true, "enabled": true}');

-- Payment methods
INSERT INTO `settings` (`category`, `settings_value`) VALUES
('paymentMethods', '{"creditCards": true, "cashOnDelivery": true, "applePay": false, "googlePay": false}');

-- Email settings
INSERT INTO `settings` (`category`, `settings_value`) VALUES
('email', '{"smtpHost": "", "smtpPort": "587", "smtpUsername": "", "smtpPassword": "", "fromEmail": "noreply@baklovah.com", "enabled": true}');

-- Notification settings
INSERT INTO `settings` (`category`, `settings_value`) VALUES
('notifications', '{"admin": {"newOrders": true, "lowStock": true, "newReviews": true}, "customer": {"orderConfirmation": true, "orderStatusUpdates": true, "promotionalEmails": false}}');
