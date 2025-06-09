/**
 * Database Initialization Script
 * This script ensures all tables are correctly created with proper schema
 * It runs automatically when the server starts
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const logger = require('../utils/logger');

// Path to the SQLite database file
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'baklovah.sqlite');

/**
 * Initialize the database and ensure all tables exist with correct schema
 */
async function initDatabase() {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info(`Created data directory at ${dataDir}`);
  }

  return new Promise((resolve, reject) => {
    // Connect to the database
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        logger.error(`Error connecting to database: ${err.message}`);
        reject(err);
        return;
      }
      
      logger.info(`Connected to SQLite database at ${dbPath}`);
      
      try {
        // Check if orders table exists with correct schema
        ensureOrdersTable(db).then(() => {
          logger.info('Database initialization complete');
          db.close();
          resolve();
        }).catch(err => {
          logger.error(`Database initialization error: ${err.message}`);
          db.close();
          reject(err);
        });
      } catch (error) {
        logger.error(`Database initialization error: ${error.message}`);
        db.close();
        reject(error);
      }
    });
  });
}

/**
 * Ensure orders table exists with correct schema
 * @param {sqlite3.Database} db - SQLite database connection
 */
function ensureOrdersTable(db) {
  return new Promise((resolve, reject) => {
    // Check if orders table exists
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      // If table doesn't exist or schema is missing columns, recreate it
      if (!row || 
          !row.sql.includes('subtotal') || 
          !row.sql.includes('tax') || 
          !row.sql.includes('total') || 
          !row.sql.includes('order_number')) {
        
        logger.info('Orders table missing or has incorrect schema, recreating...');
        
        // Begin transaction
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Backup existing orders if any
          db.run(`CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders`, (err) => {
            // Drop existing orders table
            db.run(`DROP TABLE IF EXISTS orders`, (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              // Create new orders table with all required columns
              db.run(`
                CREATE TABLE orders (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  order_number TEXT UNIQUE,
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
              `, (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                // Create or ensure order_items table
                ensureOrderItemsTable(db).then(() => {
                  // Create indexes for performance
                  createIndexes(db).then(() => {
                    // Commit transaction
                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                      }
                      
                      logger.info('Orders table created successfully with complete schema');
                      resolve();
                    });
                  }).catch(err => {
                    db.run('ROLLBACK');
                    reject(err);
                  });
                }).catch(err => {
                  db.run('ROLLBACK');
                  reject(err);
                });
              });
            });
          });
        });
      } else {
        logger.info('Orders table already exists with correct schema');
        resolve();
      }
    });
  });
}

/**
 * Ensure order_items table exists with correct schema
 * @param {sqlite3.Database} db - SQLite database connection
 */
function ensureOrderItemsTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price REAL NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT (datetime('now')),
        updated_at TIMESTAMP DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      logger.info('Order_items table created or verified');
      resolve();
    });
  });
}

/**
 * Create indexes for performance
 * @param {sqlite3.Database} db - SQLite database connection
 */
function createIndexes(db) {
  return new Promise((resolve, reject) => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)`, (err) => {
      if (err) {
        logger.warn(`Warning creating index on order_number: ${err.message}`);
      }
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`, (err) => {
        if (err) {
          logger.warn(`Warning creating index on status: ${err.message}`);
        }
        
        db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`, (err) => {
          if (err) {
            logger.warn(`Warning creating index on order_items.order_id: ${err.message}`);
          }
          
          logger.info('Database indexes created or verified');
          resolve();
        });
      });
    });
  });
}

module.exports = {
  initDatabase
};
