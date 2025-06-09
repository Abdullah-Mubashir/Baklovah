/**
 * Complete Orders Table Recreation Script
 * This script creates a fresh orders table with all required columns
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database file
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'baklovah.sqlite');

// Check if data directory exists
if (!fs.existsSync(dataDir)) {
  console.log(`Creating data directory at ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to the SQLite database at ${dbPath}`);
});

// Run everything in a transaction
db.serialize(() => {
  // Begin transaction
  db.run('BEGIN TRANSACTION');
  
  try {
    // First, backup any existing orders
    console.log('Creating backup of existing orders if any...');
    db.run(`CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders`, (err) => {
      if (err) {
        console.log('No existing orders to back up or error creating backup:', err?.message || 'No error');
      } else {
        console.log('Orders backed up to orders_backup table');
      }
      
      // Drop existing orders table
      console.log('Dropping existing orders table if it exists...');
      db.run(`DROP TABLE IF EXISTS orders`, (err) => {
        if (err) {
          console.error('Error dropping orders table:', err.message);
          db.run('ROLLBACK');
          db.close();
          process.exit(1);
        }
        
        // Create new orders table with all required columns
        console.log('Creating new orders table with complete schema...');
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
            console.error('Error creating orders table:', err.message);
            db.run('ROLLBACK');
            db.close();
            process.exit(1);
          }
          
          // Create order_items table if it doesn't exist
          console.log('Creating order_items table if it does not exist...');
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
              console.error('Error creating order_items table:', err.message);
              db.run('ROLLBACK');
              db.close();
              process.exit(1);
            }
            
            // Create indexes for performance
            console.log('Creating indexes...');
            db.run(`CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)`, (err) => {
              if (err) console.warn('Warning creating index on order_number:', err.message);
              
              db.run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`, (err) => {
                if (err) console.warn('Warning creating index on status:', err.message);
                
                db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`, (err) => {
                  if (err) console.warn('Warning creating index on order_items.order_id:', err.message);
                  
                  // Commit transaction
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error('Error committing transaction:', err.message);
                      db.run('ROLLBACK');
                      db.close();
                      process.exit(1);
                    }
                    
                    console.log('Database schema updated successfully!');
                    console.log('Orders table and order_items table are ready to use.');
                    db.close();
                  });
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    db.run('ROLLBACK');
    db.close();
    process.exit(1);
  }
});
