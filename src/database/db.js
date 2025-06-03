/**
 * Enhanced Database Connection Module
 * Provides a centralized pool of database connections for the application
 * with support for production and development environments, connection retries,
 * and comprehensive error handling
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const winston = require('winston');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Determine environment
const isProd = process.env.NODE_ENV === 'production';

// Set up enhanced logger for database operations
const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database-service' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'db-error.log'), 
      level: 'error' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Configure connection pool options based on environment
const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: isProd ? 
    (parseInt(process.env.DB_CONNECTION_LIMIT) || 25) : 
    (parseInt(process.env.DB_CONNECTION_LIMIT) || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: parseInt(process.env.DB_TIMEOUT) || 10000
};

// Add SSL configuration if enabled
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  };
  logger.info('SSL enabled for database connection');
}

// Create a connection pool with retry logic
let pool;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

async function initializeConnectionPool() {
  try {
    if (pool) {
      await pool.end();
      logger.info('Closed previous connection pool');
    }
    
    pool = mysql.createPool(poolConfig);
    logger.info(`Database pool configured with ${poolConfig.connectionLimit} connections`);
    
    // Test the connection
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1 as connection_test');
    
    if (rows[0].connection_test === 1) {
      logger.info(`Successfully connected to ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} database: ${process.env.DB_NAME}`);
      connection.release();
      connectionAttempts = 0;
      return pool;
    } else {
      throw new Error('Connection test failed');
    }
  } catch (error) {
    connectionAttempts++;
    logger.error(`Database connection attempt ${connectionAttempts} failed:`, {
      error: error.message,
      config: {
        host: poolConfig.host,
        user: poolConfig.user,
        database: poolConfig.database
      }
    });
    
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      const retryDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
      logger.info(`Retrying database connection in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return initializeConnectionPool();
    } else {
      throw new Error(`Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts`);
    }
  }
}

// Initialize the connection pool immediately
initializeConnectionPool().catch(err => {
  logger.error('Fatal database connection error:', err);
  // In production, you might want to terminate the process if the database is critical
  if (isProd) {
    logger.error('Exiting application due to database connection failure');
    process.exit(1);
  }
});

/**
 * Execute a SQL query with parameters and retry logic
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters to use in the query
 * @param {Object} options - Additional options like retry count
 * @returns {Promise} - A promise that resolves with the query results
 */
async function query(sql, params, options = {}) {
  const maxRetries = options.maxRetries || 2;
  const start = Date.now();
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      if (!pool) await initializeConnectionPool();
      
      const [results] = await pool.execute(sql, params);
      
      // Log query performance in debug mode
      const duration = Date.now() - start;
      if (duration > 200) {
        logger.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
      } else if (!isProd) {
        logger.debug(`Query (${duration}ms): ${sql.substring(0, 100)}...`);
      }
      
      return results;
    } catch (error) {
      attempts++;
      
      // Check for connection errors that might be resolved by reinitializing the pool
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
          error.code === 'ECONNRESET' || 
          error.code === 'ECONNREFUSED') {
        logger.warn(`Database connection lost, attempting to reconnect (attempt ${attempts}/${maxRetries + 1})`);
        try {
          await initializeConnectionPool();
        } catch (poolError) {
          logger.error('Failed to reinitialize connection pool:', poolError);
        }
      }
      
      if (attempts > maxRetries) {
        logger.error(`Database query failed after ${attempts} attempts:`, {
          sql: sql.substring(0, 200),
          error: error.message
        });
        throw error;
      }
      
      // Exponential backoff for retries
      const delay = Math.min(100 * Math.pow(2, attempts), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Execute a transaction with multiple queries and retry logic
 * @param {Function} callback - A function that takes a connection and executes queries
 * @param {Object} options - Additional options
 * @returns {Promise} - A promise that resolves with the transaction results
 */
async function transaction(callback, options = {}) {
  const maxRetries = options.maxRetries || 1;
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    let connection;
    try {
      if (!pool) await initializeConnectionPool();
      
      connection = await pool.getConnection();
      await connection.beginTransaction();
      
      const result = await callback(connection);
      await connection.commit();
      
      return result;
    } catch (error) {
      attempts++;
      
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          logger.error('Error rolling back transaction:', rollbackError);
        }
      }
      
      // Check for connection errors that might be resolved by reinitializing the pool
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
          error.code === 'ECONNRESET') {
        logger.warn(`Database connection lost during transaction, attempting to reconnect (attempt ${attempts}/${maxRetries + 1})`);
        try {
          await initializeConnectionPool();
        } catch (poolError) {
          logger.error('Failed to reinitialize connection pool:', poolError);
        }
      }
      
      if (attempts > maxRetries) {
        logger.error(`Transaction failed after ${attempts} attempts:`, { error: error.message });
        throw error;
      }
      
      // Exponential backoff for retries
      const delay = Math.min(100 * Math.pow(2, attempts), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      if (connection) connection.release();
    }
  }
}

/**
 * Check if the database connection is healthy
 * @returns {Promise<boolean>} - A promise that resolves with the connection status
 */
async function healthCheck() {
  try {
    if (!pool) await initializeConnectionPool();
    
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1 as health_check');
    connection.release();
    
    return rows[0].health_check === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics for monitoring
 * @returns {Promise<Object>} - A promise that resolves with database stats
 */
async function getStats() {
  if (!pool) return { connected: false };
  
  try {
    const stats = {
      connected: await healthCheck(),
      connectionLimit: poolConfig.connectionLimit,
      environment: isProd ? 'production' : 'development'
    };
    
    if (stats.connected) {
      const conn = await pool.getConnection();
      try {
        // Get server info
        const [versionResult] = await conn.execute('SELECT VERSION() as version');
        stats.version = versionResult[0].version;
        
        // Get table counts for main tables
        const tables = ['users', 'menu_items', 'orders', 'order_items'];
        stats.tables = {};
        
        for (const table of tables) {
          const [countResult] = await conn.execute(`SELECT COUNT(*) as count FROM ${table}`);
          stats.tables[table] = countResult[0].count;
        }
      } finally {
        conn.release();
      }
    }
    
    return stats;
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return {
      connected: false,
      error: error.message
    };
  }
}

module.exports = {
  query,
  transaction,
  healthCheck,
  getStats,
  initializeConnectionPool
};
