/**
 * Database Setup Script
 * This script initializes the database with the necessary tables and sample data
 */

const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function setupDatabase() {
  let connection;
  
  try {
    console.log('Starting database setup...');
    
    // Create connection without database selection first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    // Create database if it doesn't exist
    console.log(`Creating database ${process.env.DB_NAME} if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    
    // Switch to the database
    await connection.query(`USE ${process.env.DB_NAME}`);
    
    // Apply schema from schema.sql
    console.log('Applying base schema...');
    const schemaPath = path.join(__dirname, '..', 'config', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the SQL file into individual statements by semicolons
    const schemaStatements = schemaSql.split(';').filter(stmt => stmt.trim() !== '');
    
    // Execute each statement
    for (const statement of schemaStatements) {
      await connection.query(statement);
    }
    
    // Apply migrations
    console.log('Applying migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order
    
    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split the SQL file into individual statements by semicolons
      const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
      
      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement);
        }
      }
      
      console.log(`✅ Successfully applied migration: ${file}`);
    }
    
    // Insert admin user if not exists
    console.log('Creating admin user if not exists...');
    const [users] = await connection.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
    
    if (users.length === 0) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Insert admin user
      await connection.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      
      console.log('Created admin user with username: admin and password: admin123');
    } else {
      console.log('Admin user already exists');
    }
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupDatabase();
