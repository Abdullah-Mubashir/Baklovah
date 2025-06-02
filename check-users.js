/**
 * Script to check users in the SQLite database
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function checkUsers() {
  try {
    // Open database connection
    const dbPath = path.join(__dirname, 'data', 'baklovah.sqlite');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Connected to SQLite database');
    
    // Query users table
    const users = await db.all('SELECT id, username, role FROM users');
    
    console.log('\nUsers in database:');
    console.table(users);
    
    // Close the connection
    await db.close();
    
  } catch (error) {
    console.error('Error checking users:', error);
  }
}

// Run the function
checkUsers();
