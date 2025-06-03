/**
 * Production Database Migration Tool
 * 
 * This script facilitates migration from development database to production MySQL:
 * 1. Connects to both source and target databases
 * 2. Creates necessary schema in the target database
 * 3. Transfers all data while maintaining relationships
 * 4. Validates the migration was successful
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Set up CLI interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const question = promisify(rl.question).bind(rl);

// Define connection objects for both databases
let sourceConn = null;
let targetConn = null;

// Tables to migrate in order (respect foreign key dependencies)
const TABLES_TO_MIGRATE = [
  'users', 
  'menu_items', 
  'item_analytics', 
  'orders', 
  'order_items'
];

/**
 * Initialize connections to source and target databases
 */
async function initializeConnections() {
  try {
    // Source connection (development database)
    sourceConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('✅ Connected to source database');

    // Get target database configuration from user input or environment variables
    const targetConfig = {
      host: process.env.PROD_DB_HOST || await question('Target database host: '),
      user: process.env.PROD_DB_USER || await question('Target database username: '),
      password: process.env.PROD_DB_PASSWORD || await question('Target database password: '),
      database: process.env.PROD_DB_NAME || await question('Target database name: '),
      port: process.env.PROD_DB_PORT || 3306,
      ssl: process.env.PROD_DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
    };

    // Target connection (production database)
    // First connect without database to create it if needed
    const tempTargetConn = await mysql.createConnection({
      host: targetConfig.host,
      user: targetConfig.user,
      password: targetConfig.password,
      port: targetConfig.port,
      ssl: targetConfig.ssl
    });

    // Create database if it doesn't exist
    await tempTargetConn.execute(`CREATE DATABASE IF NOT EXISTS \`${targetConfig.database}\``);
    await tempTargetConn.end();

    // Now connect with the database
    targetConn = await mysql.createConnection({
      host: targetConfig.host,
      user: targetConfig.user,
      password: targetConfig.password,
      database: targetConfig.database,
      port: targetConfig.port,
      ssl: targetConfig.ssl
    });
    console.log('✅ Connected to target database');

    return true;
  } catch (error) {
    console.error('❌ Error initializing connections:', error.message);
    return false;
  }
}

/**
 * Create the schema in the target database
 */
async function createTargetSchema() {
  try {
    console.log('Creating schema in target database...');
    
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, '..', 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .filter(stmt => stmt.trim() !== '')
      .map(stmt => stmt.trim() + ';');
    
    // Execute each statement, skipping insertions (we'll do this separately)
    for (const stmt of statements) {
      // Skip insertion statements (we'll migrate data separately)
      if (!stmt.toLowerCase().trim().startsWith('insert')) {
        await targetConn.execute(stmt);
      }
    }
    
    console.log('✅ Target schema created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating target schema:', error.message);
    return false;
  }
}

/**
 * Migrate data from source to target for a single table
 */
async function migrateTableData(tableName) {
  try {
    console.log(`Migrating data for table: ${tableName}`);
    
    // Get all data from the source table
    const [rows] = await sourceConn.execute(`SELECT * FROM ${tableName}`);
    console.log(`  - Found ${rows.length} rows to migrate`);
    
    if (rows.length === 0) {
      console.log(`  - No data to migrate for ${tableName}`);
      return true;
    }
    
    // Get column names from the first row
    const columns = Object.keys(rows[0]);
    
    // Prepare a multi-row insert statement
    const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
    
    // Flatten the values for the prepared statement
    const values = rows.flatMap(row => columns.map(col => row[col]));
    
    // Execute the insert
    await targetConn.execute(sql, values);
    
    console.log(`✅ Successfully migrated ${rows.length} rows for ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrating data for ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Validate that the migration was successful by comparing row counts
 */
async function validateMigration() {
  try {
    console.log('\nValidating migration...');
    let allValid = true;
    
    for (const table of TABLES_TO_MIGRATE) {
      // Get counts from both databases
      const [sourceRows] = await sourceConn.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const [targetRows] = await targetConn.execute(`SELECT COUNT(*) as count FROM ${table}`);
      
      const sourceCount = sourceRows[0].count;
      const targetCount = targetRows[0].count;
      
      if (sourceCount === targetCount) {
        console.log(`✅ Table ${table}: ${sourceCount} rows successfully migrated`);
      } else {
        console.log(`❌ Table ${table}: Count mismatch! Source: ${sourceCount}, Target: ${targetCount}`);
        allValid = false;
      }
    }
    
    return allValid;
  } catch (error) {
    console.error('❌ Error validating migration:', error.message);
    return false;
  }
}

/**
 * Clean up connections and close resources
 */
async function cleanup() {
  try {
    if (sourceConn) await sourceConn.end();
    if (targetConn) await targetConn.end();
    rl.close();
    console.log('Connections closed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

/**
 * Main migration function
 */
async function migrateToProduction() {
  console.log('========================================');
  console.log('PRODUCTION DATABASE MIGRATION TOOL');
  console.log('========================================');
  
  try {
    // Initialize connections
    const connectionsReady = await initializeConnections();
    if (!connectionsReady) {
      throw new Error('Failed to initialize database connections');
    }
    
    // Confirm before proceeding
    const confirm = await question('\n⚠️ This will migrate all data to the production database. Continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Migration cancelled by user');
      return;
    }
    
    // Create target schema
    const schemaCreated = await createTargetSchema();
    if (!schemaCreated) {
      throw new Error('Failed to create target schema');
    }
    
    // Migrate data for each table
    console.log('\nMigrating data...');
    for (const table of TABLES_TO_MIGRATE) {
      const migrated = await migrateTableData(table);
      if (!migrated) {
        throw new Error(`Failed to migrate data for table ${table}`);
      }
    }
    
    // Validate migration
    const isValid = await validateMigration();
    if (!isValid) {
      throw new Error('Migration validation failed');
    }
    
    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('\nNext steps:');
    console.log('1. Update your .env file with production database credentials');
    console.log('2. Set NODE_ENV=production in your environment');
    console.log('3. Restart your application to use the production database');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.log('\nPlease fix the issues and try again.');
  } finally {
    await cleanup();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateToProduction();
}

module.exports = { migrateToProduction };
