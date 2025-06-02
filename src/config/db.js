// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../../.env' }); // Ensure .env is loaded from project root

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections in pool
  queueLimit: 0, // Max number of connection requests queue (0 for no limit)
  charset: 'utf8mb4' // Recommended for full Unicode support
});

// Optional: Test function to verify connection (can be called from your main server file)
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`Successfully connected to database: ${process.env.DB_NAME} as ${process.env.DB_USER}`);
    connection.release(); // Release the connection back to the pool
    return true;
  } catch (error) {
    console.error('Error connecting to the database:');
    console.error(`  Host: ${process.env.DB_HOST}`);
    console.error(`  User: ${process.env.DB_USER}`);
    console.error(`  Database: ${process.env.DB_NAME}`);
    console.error('Error details:', error.message);
    // Depending on your application's needs, you might want to throw the error
    // or exit the process if the database connection is critical at startup.
    // throw error; 
    return false;
  }
}

module.exports = {
  pool,
  testDbConnection
};
