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
 * Test if MySQL is available
 * @returns {Promise<boolean>} Whether MySQL is available
 */
async function testMysqlConnection() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test the connection
    await pool.query('SELECT 1');
    mysqlPool = pool;
    return true;
  } catch (error) {
    logger.warn(`MySQL connection failed: ${error.message}. Will use SQLite instead.`);
    return false;
  }
}

/**
 * Initialize the database connection
 * Will try MySQL first, and fall back to SQLite if MySQL is not available
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
  // Try MySQL first
  const mysqlAvailable = await testMysqlConnection();

  if (mysqlAvailable) {
    dbType = 'mysql';
    logger.info('Using MySQL database');
  } else {
    dbType = 'sqlite';
    logger.info('Using SQLite database');
    await sqliteDb.initializeDatabase();
  }
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
