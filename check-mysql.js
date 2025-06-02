/**
 * MySQL Connection Check Script
 * This script attempts to connect to MySQL with detailed error reporting
 */

require('dotenv').config();
const mysql = require('mysql2');

// Create a connection without specifying a database
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // No database specified to check if we can connect to MySQL server itself
});

console.log('Attempting to connect to MySQL server...');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`User: ${process.env.DB_USER}`);

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL server:');
    console.error(`Error code: ${err.code}`);
    console.error(`Error number: ${err.errno}`);
    console.error(`Error message: ${err.sqlMessage || err.message}`);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\nThe MySQL server is not running or is not accepting connections.');
      console.error('Possible solutions:');
      console.error('1. Make sure MySQL is installed and running');
      console.error('2. Check if the host and port are correct in your .env file');
      console.error('3. Verify that the MySQL user has permission to connect from this host');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nAccess denied. Username or password is incorrect.');
      console.error('Possible solutions:');
      console.error('1. Check the username and password in your .env file');
      console.error('2. Make sure the user exists in MySQL');
      console.error('3. Verify that the user has the necessary permissions');
    }
    
    process.exit(1);
  }
  
  console.log('Successfully connected to MySQL server!');
  
  // Try to create the database
  connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
    if (err) {
      console.error(`Error creating database ${process.env.DB_NAME}:`);
      console.error(err.message);
    } else {
      console.log(`Database ${process.env.DB_NAME} created or already exists.`);
    }
    
    // Close the connection
    connection.end();
  });
});
