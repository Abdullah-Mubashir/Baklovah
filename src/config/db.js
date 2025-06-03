// src/config/db.js
const mysql = require('mysql2/promise');
const winston = require('winston');
const path = require('path');

// Setup environment variables with proper path resolution
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Create a logger for database operations
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/db-error.log', level: 'error' }),
    new winston.transports.Console({ 
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ) 
    })
  ],
});

// Configure pool options based on environment
const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'production' ? 25 : 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : undefined
};

// Add SSL if specified in environment
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  };
  logger.info('SSL enabled for database connection');
}

// Create the connection pool
const pool = mysql.createPool(poolConfig);

// Enhanced test function with more diagnostics
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT NOW() as now');
    
    logger.info(`Successfully connected to database: ${process.env.DB_NAME} as ${process.env.DB_USER}`);
    logger.info(`Server time: ${rows[0].now}`);
    
    connection.release();
    return true;
  } catch (error) {
    logger.error('Error connecting to the database:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      error: error.message
    });
    
    return false;
  }
}

/**
 * Execute a SQL query with parameters
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise} - A promise that resolves with the query results
 */
async function query(sql, params) {
  const start = Date.now();
  try {
    const [results] = await pool.execute(sql, params);
    
    // Log query performance in debug mode
    const duration = Date.now() - start;
    if (duration > 200) {
      logger.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Query (${duration}ms): ${sql.substring(0, 100)}...`);
    }
    
    return results;
  } catch (error) {
    logger.error(`Database query error: ${error.message}`, {
      sql: sql.substring(0, 200),
      params,
      error
    });
    throw error;
  }
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - A function that takes a connection and executes queries
 * @returns {Promise} - A promise that resolves with the transaction results
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error(`Transaction error: ${error.message}`, { error });
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testDbConnection,
  query,
  transaction
};
