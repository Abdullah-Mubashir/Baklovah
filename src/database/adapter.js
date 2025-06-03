/**
 * Database Adapter Module
 * Provides a unified interface to work with either MySQL or SQLite
 * Will try to use MySQL first, and if not available, will fall back to SQLite
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const winston = require('winston');
const sqliteDb = require('./sqlite-db');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'db-adapter.log', level: 'info' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

// Database state
let dbType = null; // 'mysql' or 'sqlite'
let mysqlPool = null;

/**
 * Get MySQL configuration based on environment
 * @returns {Object} MySQL configuration object
 */
function getMySQLConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Check if DATABASE_URL is provided (common in cloud environments like render.com)
  if (process.env.DATABASE_URL) {
    logger.info('Using database connection string from DATABASE_URL');
    return {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: isProd ? 25 : 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
      connectTimeout: parseInt(process.env.DB_TIMEOUT) || 10000,
      // SSL is typically required for cloud database connections
      ssl: {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
      }
    };
  }
  
  // Traditional configuration with individual parameters
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: isProd ? 25 : 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
    connectTimeout: parseInt(process.env.DB_TIMEOUT) || 30000 // Increased timeout for cloud connections
  };

  // Add SSL configuration for production
  if (isProd && process.env.DB_SSL === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    };
    logger.info('SSL enabled for database connection');
  }

  // Add port if specified
  if (process.env.DB_PORT) {
    config.port = parseInt(process.env.DB_PORT);
  }

  return config;
}

/**
 * Test if MySQL is available
 * @returns {Promise<boolean>} Whether MySQL is available
 */
async function testMysqlConnection() {
  const config = getMySQLConfig();
  let retryCount = 0;
  const isProd = process.env.NODE_ENV === 'production';
  
  // More retries in production and longer delays
  const maxRetries = isProd ? 8 : 1;
  const baseRetryDelay = isProd ? 2000 : 1000;
  
  // Log database connection attempt (without revealing sensitive credentials)
  if (isProd) {
    logger.info(`Attempting to connect to production database at ${config.host || config.uri?.split('@')[1]?.split('/')[0] || 'cloud host'}`);
  }

  while (retryCount < maxRetries) {
    try {
      // Create connection pool based on config
      let pool;
      if (config.uri) {
        // Using connection string (DATABASE_URL)
        pool = mysql.createPool(config.uri);
      } else {
        // Using individual connection parameters
        pool = mysql.createPool(config);
      }

      // Test the connection
      const [rows] = await pool.query('SELECT 1 as connection_test');
      if (rows[0].connection_test === 1) {
        mysqlPool = pool;
        logger.info(`Successfully connected to ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} MySQL database`);
        
        // In production, log additional connection details
        if (isProd) {
          // Get server version
          const [versionResult] = await pool.query('SELECT version() as version');
          logger.info(`Connected to MySQL server version: ${versionResult[0].version}`);
          
          // Check max_connections
          const [maxConnsResult] = await pool.query('SHOW VARIABLES LIKE \'max_connections\'');
          logger.info(`MySQL max_connections: ${maxConnsResult[0]?.Value || 'unknown'}`);
        }
        
        return true;
      }
      throw new Error('Connection test failed');
    } catch (error) {
      retryCount++;
      logger.warn(`MySQL connection attempt ${retryCount}/${maxRetries} failed: ${error.message}`);
      
      if (retryCount < maxRetries) {
        // Exponential backoff with jitter for more reliable retries
        const maxDelay = 20000; // 20 seconds max
        const delay = Math.min(baseRetryDelay * Math.pow(1.5, retryCount) * (0.9 + Math.random() * 0.2), maxDelay);
        logger.info(`Retrying in ${Math.round(delay/100)/10} seconds... (attempt ${retryCount+1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (isProd) {
        logger.error('Failed to connect to production MySQL database after maximum retries');
        logger.error(`Last connection error: ${error.message}`);
        throw new Error(`Unable to connect to the production database. Please verify database credentials and ensure the database server is accessible. Original error: ${error.message}`);
      } else {
        logger.warn('MySQL connection failed in development mode, will use SQLite as fallback');
        return false;
      }
    }
  }
  return false;
}

/**
 * Initialize the database connection
 * Will try MySQL first, and fall back to SQLite if MySQL is not available in development
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
  const isProd = process.env.NODE_ENV === 'production';

  try {
    // Log startup message with environment details
    logger.info(`Initializing database adapter in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    logger.info(`Connection method: ${process.env.DATABASE_URL ? 'DATABASE_URL connection string' : 'Individual connection parameters'}`);
    
    // Try MySQL first
    const mysqlAvailable = await testMysqlConnection();

    if (mysqlAvailable) {
      dbType = 'mysql';
      logger.info(`Using MySQL database in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

      // In production, perform comprehensive health checks
      if (isProd) {
        try {
          // Create a health check table to verify write permissions
          await query('CREATE TABLE IF NOT EXISTS _health_check (id INT PRIMARY KEY, check_time TIMESTAMP)');
          await query('INSERT INTO _health_check (id, check_time) VALUES (1, NOW()) ON DUPLICATE KEY UPDATE check_time = NOW()');
          
          // Get the result to verify read permissions
          const [healthRows] = await query('SELECT * FROM _health_check');
          logger.info(`Database health check successful, timestamp: ${healthRows[0]?.check_time}`);
          
          // Test transaction support
          await query('START TRANSACTION');
          await query('UPDATE _health_check SET check_time = NOW() WHERE id = 1');
          await query('COMMIT');
          logger.info('Database transaction support verified');
          
          // Optional: Don't drop the health check table to maintain a record of successful connections
          // await query('DROP TABLE IF EXISTS _health_check');
          logger.info('Database permissions and features verified successfully');
        } catch (error) {
          logger.error('Failed to verify database permissions or features:', error);
          throw new Error(`Database health check failed: ${error.message}. Please verify database permissions and configuration.`);
        }
      }
    } else {
      if (isProd) {
        throw new Error('MySQL connection failed in production mode and cannot fall back to SQLite. ' +
                      'Please check your DATABASE_URL or database connection parameters.');
      }
      dbType = 'sqlite';
      logger.info('Using SQLite database (development only)');
      await sqliteDb.initializeDatabase();
    }

    // Additional production checks
    if (isProd) {
      // Verify connection pool
      const poolStatus = await checkConnectionPool();
      logger.info('Connection pool status:', poolStatus);

      // Schedule periodic health checks
      setInterval(async () => {
        try {
          await query('SELECT 1');
          logger.debug('Database health check passed');
        } catch (error) {
          logger.error('Database health check failed:', error);
        }
      }, 30000); // Every 30 seconds
    }
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Check the status of the connection pool
 * @returns {Promise<Object>} Pool status information
 */
async function checkConnectionPool() {
  if (dbType !== 'mysql' || !mysqlPool) {
    return { active: 0, total: 0, idle: 0, waiting: 0 };
  }

  return {
    active: mysqlPool.pool.activeConnections(),
    total: mysqlPool.pool.totalConnections(),
    idle: mysqlPool.pool.idleConnections(),
    waiting: mysqlPool.pool.taskQueueSize()
  };
}

/**
 * Maximum number of query retries on transient connection issues
 */
const MAX_QUERY_RETRIES = process.env.NODE_ENV === 'production' ? 3 : 0;

/**
 * Checks if an error is a transient connection error that can be retried
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error is transient
 */
function isTransientConnectionError(error) {
  // Common MySQL transient errors
  const transientErrorCodes = [
    'PROTOCOL_CONNECTION_LOST',
    'ER_CON_COUNT_ERROR',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ER_LOCK_WAIT_TIMEOUT'
  ];
  
  return transientErrorCodes.includes(error.code) ||
         error.message.includes('Connection lost') ||
         error.message.includes('Too many connections');
}

/**
 * Execute a database query with automatic retries for transient errors
 * @param {string} sql - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @param {number} [retryCount=0] - Current retry attempt (internal use)
 * @returns {Promise<Array>} - Query results
 */
async function query(sql, params = [], retryCount = 0) {
  if (dbType === 'mysql') {
    try {
      // For write operations in production, use a transaction for safety
      const isProd = process.env.NODE_ENV === 'production';
      const isWriteOperation = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql);
      
      if (isProd && isWriteOperation && !sql.includes('START TRANSACTION') && !sql.includes('COMMIT') && !sql.includes('ROLLBACK')) {
        // Use an explicit transaction for write operations if not already in one
        await mysqlPool.query('START TRANSACTION');
        try {
          const result = await mysqlPool.query(sql, params);
          await mysqlPool.query('COMMIT');
          return result;
        } catch (innerError) {
          // Rollback transaction on error
          try { await mysqlPool.query('ROLLBACK'); } catch (rollbackError) {
            logger.error(`Rollback failed: ${rollbackError.message}`);
          }
          throw innerError;
        }
      } else {
        // For read operations or non-production, execute normally
        return await mysqlPool.query(sql, params);
      }
    } catch (error) {
      // Check if this is a transient error and if we should retry
      if (isTransientConnectionError(error) && retryCount < MAX_QUERY_RETRIES) {
        const delay = Math.min(500 * Math.pow(2, retryCount), 5000);
        logger.warn(`Transient database error: ${error.message}. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_QUERY_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return query(sql, params, retryCount + 1);
      }
      
      // Log detailed error information
      logger.error(`MySQL query error: ${error.message}`);
      logger.error(`Failed query: ${sql}`);
      logger.error(`Query params: ${JSON.stringify(params)}`);
      
      // Add more context to the error
      const enhancedError = new Error(`Database query failed: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.query = sql;
      enhancedError.params = params;
      throw enhancedError;
    }
  } else {
    return await sqliteDb.query(sql, params);
  }
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - A function that takes a connection and executes queries
 * @returns {Promise} - A promise that resolves with the transaction results
 */
async function transaction(callback) {
  if (dbType === 'mysql') {
    let connection;
    try {
      connection = await mysqlPool.getConnection();
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error(`MySQL transaction error: ${error.message}`, { error });
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } else {
    return sqliteDb.transaction(callback);
  }
}

/**
 * Get the type of database currently in use
 * @returns {string} 'mysql' or 'sqlite'
 */
function getDatabaseType() {
  return dbType;
}

module.exports = {
  initializeDatabase,
  query,
  transaction,
  getDatabaseType
};
