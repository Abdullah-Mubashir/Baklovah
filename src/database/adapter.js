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
    connectTimeout: parseInt(process.env.DB_TIMEOUT) || 10000
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
  const maxRetries = process.env.NODE_ENV === 'production' ? 5 : 1;

  while (retryCount < maxRetries) {
    try {
      const pool = mysql.createPool(config);

      // Test the connection
      const [rows] = await pool.query('SELECT 1 as connection_test');
      if (rows[0].connection_test === 1) {
        mysqlPool = pool;
        logger.info(`Successfully connected to ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'} MySQL database`);
        return true;
      }
      throw new Error('Connection test failed');
    } catch (error) {
      retryCount++;
      logger.warn(`MySQL connection attempt ${retryCount} failed: ${error.message}`);
      
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        logger.info(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (process.env.NODE_ENV === 'production') {
        logger.error('Failed to connect to production MySQL database after maximum retries');
        throw error; // In production, we don't want to fall back to SQLite
      } else {
        logger.warn('MySQL connection failed, will use SQLite as fallback');
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
    // Try MySQL first
    const mysqlAvailable = await testMysqlConnection();

    if (mysqlAvailable) {
      dbType = 'mysql';
      logger.info(`Using MySQL database in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

      // In production, verify we can create tables
      if (isProd) {
        try {
          await query('CREATE TABLE IF NOT EXISTS _health_check (id INT PRIMARY KEY)');
          await query('DROP TABLE IF EXISTS _health_check');
          logger.info('Database write permissions verified');
        } catch (error) {
          logger.error('Failed to verify database write permissions:', error);
          throw error;
        }
      }
    } else {
      if (isProd) {
        throw new Error('MySQL connection failed in production mode - cannot fall back to SQLite');
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
 * Execute a SQL query with parameters
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise<Array>} - A promise that resolves with the query results
 */
async function query(sql, params = []) {
  if (dbType === 'mysql') {
    try {
      const [rows] = await mysqlPool.query(sql, params);
      return rows;
    } catch (error) {
      logger.error(`MySQL query error: ${error.message}`, {
        sql,
        params,
        error
      });
      throw error;
    }
  } else {
    return sqliteDb.query(sql, params);
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
