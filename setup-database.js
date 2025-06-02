/**
 * Database Setup Script for Baklovah Restaurant
 * 
 * This script will:
 * 1. Create the database if it doesn't exist
 * 2. Apply the base schema
 * 3. Apply all migrations
 * 4. Create an admin user if none exists
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Database configuration without database name for initial connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
};

// Database configuration with database name for subsequent operations
const fullDbConfig = {
  ...dbConfig,
  database: process.env.DB_NAME
};

// Function to create database if it doesn't exist
async function createDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log(`Creating database ${process.env.DB_NAME} if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} created or already exists.`);
    
    return true;
  } catch (error) {
    console.error('Error creating database:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Function to apply base schema
async function applyBaseSchema() {
  let connection;
  
  try {
    console.log('Connecting to database to apply base schema...');
    connection = await mysql.createConnection(fullDbConfig);
    
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'src', 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying base schema...');
    await connection.query(schema);
    console.log('Base schema applied successfully.');
    
    return true;
  } catch (error) {
    console.error('Error applying base schema:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Function to apply migrations
async function applyMigrations() {
  let connection;
  
  try {
    console.log('Connecting to database to apply migrations...');
    connection = await mysql.createConnection(fullDbConfig);
    
    console.log('Reading migration files...');
    const migrationsDir = path.join(__dirname, 'src', 'database', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply migrations in alphabetical order
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return true;
    }
    
    console.log(`Found ${migrationFiles.length} migration files.`);
    
    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}...`);
      const migrationPath = path.join(migrationsDir, file);
      const migration = fs.readFileSync(migrationPath, 'utf8');
      
      await connection.query(migration);
      console.log(`Migration ${file} applied successfully.`);
    }
    
    console.log('All migrations applied successfully.');
    return true;
  } catch (error) {
    console.error('Error applying migrations:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Function to create admin user if none exists
async function createAdminUser() {
  let connection;
  
  try {
    console.log('Connecting to database to check/create admin user...');
    connection = await mysql.createConnection(fullDbConfig);
    
    // Check if admin user exists
    const [admins] = await connection.query(
      'SELECT * FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (admins.length > 0) {
      console.log('Admin user already exists.');
      return true;
    }
    
    // Create admin user
    console.log('No admin user found. Creating admin user...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin', 10);
    
    // Insert admin user
    await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', hashedPassword, 'admin']
    );
    
    console.log('Admin user created successfully.');
    return true;
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main function to run all setup steps
async function setupDatabase() {
  console.log('Starting database setup...');
  
  // Step 1: Create database
  const dbCreated = await createDatabase();
  if (!dbCreated) {
    console.error('Failed to create database. Exiting setup.');
    return;
  }
  
  // Step 2: Apply base schema
  const schemaApplied = await applyBaseSchema();
  if (!schemaApplied) {
    console.error('Failed to apply base schema. Exiting setup.');
    return;
  }
  
  // Step 3: Apply migrations
  const migrationsApplied = await applyMigrations();
  if (!migrationsApplied) {
    console.error('Failed to apply migrations. Exiting setup.');
    return;
  }
  
  // Step 4: Create admin user
  const adminCreated = await createAdminUser();
  if (!adminCreated) {
    console.error('Failed to create admin user. Exiting setup.');
    return;
  }
  
  console.log('Database setup completed successfully!');
  console.log('You can now log in with:');
  console.log('Username: admin');
  console.log('Password: admin');
}

// Run the setup
setupDatabase().catch(error => {
  console.error('Unhandled error during database setup:', error);
});
