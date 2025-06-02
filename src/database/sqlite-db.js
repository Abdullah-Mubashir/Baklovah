/**
 * SQLite Database Connection Module
 * Provides a database interface compatible with our application but using SQLite
 * This serves as a development alternative when MySQL is not available
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
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

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite database file path
const dbPath = path.join(dataDir, 'baklovah.sqlite');

// Global database connection
let dbPromise = null;

/**
 * Initialize the database connection
 * @returns {Promise<sqlite.Database>} SQLite database instance
 */
async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  }
  return dbPromise;
}

/**
 * Execute a SQL query with parameters
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise<Array>} - A promise that resolves with the query results
 */
async function query(sql, params = []) {
  try {
    // Replace MySQL-specific syntax with SQLite compatible syntax
    let sqliteSql = sql
      .replace(/`/g, '"')  // Replace backticks with double quotes
      .replace(/CURRENT_TIMESTAMP/g, "datetime('now')") // Replace CURRENT_TIMESTAMP
      .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT') // Replace AUTO_INCREMENT
      .replace(/INT\(\d+\)/g, 'INTEGER') // Replace INT(x) with INTEGER
      .replace(/DECIMAL\(\d+,\s*\d+\)/g, 'REAL') // Replace DECIMAL with REAL
      .replace(/ENUM\([^)]+\)/g, 'TEXT') // Replace ENUM with TEXT
      .replace(/NOW\(\)/g, "datetime('now')") // Replace NOW()
      .replace(/GREATEST\(([^,]+),\s*([^)]+)\)/g, 'MAX($1, $2)'); // Replace GREATEST with MAX
    
    const db = await getDb();
    
    // Handle different query types
    if (sqliteSql.trim().toLowerCase().startsWith('select')) {
      return await db.all(sqliteSql, params);
    } else if (
      sqliteSql.trim().toLowerCase().startsWith('insert') ||
      sqliteSql.trim().toLowerCase().startsWith('update') ||
      sqliteSql.trim().toLowerCase().startsWith('delete')
    ) {
      const result = await db.run(sqliteSql, params);
      return { 
        insertId: result.lastID,
        affectedRows: result.changes
      };
    } else {
      return await db.exec(sqliteSql);
    }
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
  const db = await getDb();
  try {
    await db.exec('BEGIN TRANSACTION');
    const result = await callback(db);
    await db.exec('COMMIT');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK');
    logger.error(`Transaction error: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Initialize the SQLite database with schema
 */
async function initializeDatabase() {
  const db = await getDb();
  try {
    logger.info('Initializing SQLite database...');
    
    // Create users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
        created_at TIMESTAMP DEFAULT (datetime('now')),
        updated_at TIMESTAMP DEFAULT (datetime('now'))
      )
    `);
    
    // Create menu_items table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        category TEXT,
        is_available INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'featured')),
        is_vegetarian INTEGER DEFAULT 0,
        is_gluten_free INTEGER DEFAULT 0,
        is_spicy INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT (datetime('now')),
        updated_at TIMESTAMP DEFAULT (datetime('now'))
      )
    `);
    
    // Create orders table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        order_time TIMESTAMP DEFAULT (datetime('now')),
        status TEXT DEFAULT 'placed' CHECK (status IN ('placed', 'preparing', 'ready', 'completed', 'cancelled')),
        total_amount REAL NOT NULL,
        time_remaining INTEGER,
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
        notes TEXT,
        updated_at TIMESTAMP DEFAULT (datetime('now'))
      )
    `);
    
    // Create order_items table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        menu_item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        item_price REAL NOT NULL,
        notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
      )
    `);
    
    // Create item_analytics table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS item_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_item_id INTEGER NOT NULL,
        views INTEGER DEFAULT 0,
        purchases INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        last_viewed TIMESTAMP,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
      )
    `);
    
    // Check if admin user exists
    const adminCheck = await db.get('SELECT * FROM users WHERE role = "admin" LIMIT 1');
    
    if (!adminCheck) {
      // Insert default admin user
      // Password is 'admin123' (hashed with bcrypt)
      await db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', '$2b$10$CZvDLHM7Z3vLZUNRVTpVgOBUOgTr6Qm.OlVmGxOBCK5PbQB6KUZcy', 'admin']
      );
      
      // Insert default cashier user
      // Password is 'cashier123' (hashed with bcrypt)
      await db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['cashier', '$2b$10$qsI3RlTIRkQnQHWz3QF0zeXoRZO4spfzJgrAs/iYMmeFxe3FfKnkG', 'cashier']
      );
      
      logger.info('Default users created');
    }
    
    // Check if sample menu items exist
    const menuCheck = await db.get('SELECT * FROM menu_items LIMIT 1');
    
    if (!menuCheck) {
      // Insert sample menu items
      const menuItems = [
        { title: 'Baklava', description: 'Traditional sweet pastry made with layers of filo, filled with chopped nuts, and sweetened with syrup or honey', price: 5.99, category: 'Desserts' },
        { title: 'Turkish Coffee', description: 'Strong coffee prepared by boiling finely ground coffee beans with water and sugar', price: 3.99, category: 'Beverages' },
        { title: 'Kunafa', description: 'Traditional Middle Eastern dessert made with thin noodle-like pastry soaked in sweet, sugar-based syrup', price: 7.99, category: 'Desserts' },
        { title: 'Shawarma Wrap', description: 'Grilled meat wrapped in pita bread with vegetables and tahini sauce', price: 9.99, category: 'Main Course' },
        { title: 'Falafel Plate', description: 'Deep-fried patty made from ground chickpeas, served with salad and tahini sauce', price: 8.99, category: 'Main Course' }
      ];
      
      for (const item of menuItems) {
        const result = await db.run(
          'INSERT INTO menu_items (title, description, price, category) VALUES (?, ?, ?, ?)',
          [item.title, item.description, item.price, item.category]
        );
        
        // Initialize analytics for this item
        await db.run(
          'INSERT INTO item_analytics (menu_item_id, views, purchases, likes) VALUES (?, 0, 0, 0)',
          [result.lastID]
        );
      }
      
      logger.info('Sample menu items created');
    }
    
    logger.info('SQLite database initialized successfully');
  } catch (error) {
    logger.error('Error initializing SQLite database:', error);
  }
}

module.exports = {
  query,
  transaction,
  getDb,
  initializeDatabase
};
