/**
 * Fix Dashboard Access
 * This script directly troubleshoots and fixes issues with dashboard access
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Path to the SQLite database file
const dbPath = path.join(__dirname, 'database.sqlite');

const fixDashboardAccess = async () => {
  try {
    console.log('Starting dashboard access fix process...');
    
    // Check if the database file exists
    if (!fs.existsSync(dbPath)) {
      console.log('Database file does not exist. Creating it...');
      // We'll create the database and tables
    }
    
    // Connect to the database
    const db = new sqlite3.Database(dbPath);
    
    // Convert db.all to Promise
    const queryAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    };
    
    // Convert db.run to Promise
    const runAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    };
    
    // Check if users table exists
    const tables = await queryAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='users';");
    
    if (tables.length === 0) {
      console.log('Users table does not exist. Creating it...');
      
      // Create users table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL
        )
      `);
      
      console.log('Users table created successfully');
    }
    
    // Check if admin user exists
    const adminUsers = await queryAsync('SELECT * FROM users WHERE role = ?', ['admin']);
    
    if (adminUsers.length === 0) {
      console.log('Admin user does not exist. Creating default admin user...');
      
      // Create default admin user
      const saltRounds = 10;
      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      await runAsync(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user exists:', adminUsers[0].username);
      
      // Reset admin password for testing
      const saltRounds = 10;
      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      await runAsync(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      
      console.log('Admin password reset to "admin123"');
    }
    
    // Test token generation
    const user = { userId: 1, username: 'admin', role: 'admin' };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('Test JWT token generated successfully');
    console.log('JWT_SECRET used:', process.env.JWT_SECRET);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    // Verify the token works
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verification successful:', decoded);
    } catch (error) {
      console.error('Token verification failed:', error.message);
    }
    
    // Generate complete HTML diagnostic page
    console.log('\nDIAGNOSTICS COMPLETE\n');
    console.log('To fix admin login:');
    console.log('1. Make sure cookie-parser is installed and configured in server.js');
    console.log('2. Ensure JWT_SECRET is set correctly in .env file:', process.env.JWT_SECRET);
    console.log('3. Try accessing the dashboard directly at: http://localhost:3002/admin/dashboard?token=' + token);
    console.log('4. Or try setting a cookie manually at: http://localhost:3002/test/set-token');
    console.log('5. Login credentials: username="admin", password="admin123"');
    
    // Close the database connection
    db.close();
    
  } catch (error) {
    console.error('Error fixing dashboard access:', error);
  }
};

// Run the function
fixDashboardAccess();
