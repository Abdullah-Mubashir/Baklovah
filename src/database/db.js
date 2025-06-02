/**
 * Database Connection Module
 * Provides a centralized pool of database connections for the application
 */

const mysql = require('mysql2/promise');
require('dotenv').config();
const winston = require('winston');

// Set up logger for database operations
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'db-error.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection pool
pool.getConnection()
  .then(connection => {
    logger.info('Database connection pool established successfully');
    connection.release();
    return true;
  })
  .catch(error => {
    logger.error('Error establishing database connection pool:', error);
    // Don't terminate the process, allow the application to continue trying
    return false;
  });

/**
 * Execute a SQL query with parameters
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise} - A promise that resolves with the query results
 */
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    logger.error(`Database query error: ${error.message}`, {
      sql,
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
  query,
  transaction,
  pool
};
