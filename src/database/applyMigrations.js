/**
 * Database Migration Script
 * This script applies all migrations in the migrations folder
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function applyMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Get all SQL files in the migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order
    
    console.log(`Found ${migrationFiles.length} migration files to apply`);
    
    // Apply each migration
    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split the SQL file into individual statements by semicolons
      const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
      
      // Execute each statement
      for (const statement of statements) {
        await pool.query(statement);
      }
      
      console.log(`✅ Successfully applied migration: ${file}`);
    }
    
    console.log('All migrations applied successfully!');
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    pool.end();
  }
}

// Run the migrations
applyMigrations();
