/**
 * SQLite Database Setup Script
 * This script initializes the SQLite database for development use when MySQL is unavailable
 */

require('dotenv').config();
const { initializeDatabase } = require('./src/database/sqlite-db');
const winston = require('winston');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'db-setup-error.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

// Initialize the database
async function setupSqliteDatabase() {
  try {
    logger.info('Starting SQLite database setup...');
    
    // Initialize the SQLite database with schema and sample data
    await initializeDatabase();
    
    logger.info('SQLite database setup completed successfully!');
    logger.info('You can now run the server with: node server.js');
    
    // Successfully exit
    process.exit(0);
  } catch (error) {
    logger.error('Error setting up SQLite database:', error);
    process.exit(1);
  }
}

// Run the setup function
setupSqliteDatabase();
