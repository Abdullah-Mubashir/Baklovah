-- User Preferences table migration
-- This table stores user preferences in JSON format

CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `preferences` JSON NOT NULL COMMENT 'JSON object containing user preferences',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add two_factor_enabled column to users table if it doesn't exist
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `two_factor_enabled` TINYINT(1) DEFAULT 0 AFTER `active`;

-- Add two_factor_secret column to users table if it doesn't exist
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `two_factor_secret` VARCHAR(255) DEFAULT NULL AFTER `two_factor_enabled`;
