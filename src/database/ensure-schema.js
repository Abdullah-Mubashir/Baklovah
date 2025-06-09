/**
 * Ensure Database Schema Script
 * This script verifies and updates the database schema if needed
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database file
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'baklovah.sqlite');

// Check if database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at ${dbPath}`);
  process.exit(1);
}

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Function to check if a column exists in a table
function columnExists(table, column) {
  return new Promise((resolve, reject) => {
    db.get(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Parse the PRAGMA result to check if the column exists
      const columns = Array.isArray(rows) ? rows : [rows];
      const columnExists = columns.some(row => row && row.name === column);
      resolve(columnExists);
    });
  });
}

// Function to add a column to a table if it doesn't exist
function addColumnIfNotExists(table, column, type) {
  return new Promise(async (resolve, reject) => {
    try {
      const exists = await columnExists(table, column);
      if (!exists) {
        console.log(`Adding column ${column} to table ${table}`);
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(true);
        });
      } else {
        console.log(`Column ${column} already exists in table ${table}`);
        resolve(false);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Run the database schema checks
async function checkSchema() {
  try {
    console.log('Checking database schema...');
    
    // Check if orders table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'", async (err, row) => {
      if (err) {
        console.error('Error checking orders table:', err.message);
        db.close();
        process.exit(1);
      }
      
      if (!row) {
        console.log('Orders table does not exist, creating it...');
        // Create orders table if it doesn't exist
        db.run(`
          CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            customer_email TEXT,
            customer_phone TEXT,
            delivery_method TEXT CHECK (delivery_method IN ('delivery', 'pickup')),
            delivery_address TEXT,
            order_time TIMESTAMP DEFAULT (datetime('now')),
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            total REAL NOT NULL,
            delivery_fee REAL DEFAULT 0,
            time_remaining INTEGER,
            estimated_time_minutes INTEGER DEFAULT 30,
            payment_status TEXT DEFAULT 'unpaid',
            payment_intent_id TEXT,
            customer_notes TEXT,
            created_at TIMESTAMP DEFAULT (datetime('now')),
            updated_at TIMESTAMP DEFAULT (datetime('now'))
          )
        `, async function(err) {
          if (err) {
            console.error('Error creating orders table:', err.message);
            db.close();
            process.exit(1);
          }
          
          // Add order_number column after table creation
          await addRequiredColumns();
          db.close();
        });
      } else {
        console.log('Orders table exists, checking required columns...');
        await addRequiredColumns();
        db.close();
      }
    });
  } catch (error) {
    console.error('Error checking schema:', error);
    db.close();
    process.exit(1);
  }
}

// Add all required columns
async function addRequiredColumns() {
  try {
    // Add order_number column if it doesn't exist
    await addColumnIfNotExists('orders', 'order_number', 'TEXT UNIQUE');
    console.log('Schema check complete.');
  } catch (error) {
    console.error('Error adding required columns:', error);
    db.close();
    process.exit(1);
  }
}

// Start the schema check
checkSchema();
