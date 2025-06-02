/**
 * Reset admin password in the SQLite database
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./src/database/adapter');

async function resetAdminPassword() {
  try {
    const username = 'admin';
    const newPassword = 'admin123'; // You can change this if needed
    
    console.log(`Resetting password for user: ${username}`);
    
    // First, check if the user exists
    const rows = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      console.log('Admin user not found. Creating new admin user...');
      
      // Generate hash for new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Insert new admin user
      await db.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, 'admin']
      );
      
      console.log('New admin user created successfully!');
      return;
    }
    
    // Generate hash for new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Print the hashed password for reference
    console.log('New hashed password:', hashedPassword);
    
    // Update the password in the database
    const result = await db.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );
    
    if (result.affectedRows > 0) {
      console.log('Admin password updated successfully!');
      console.log(`Username: ${username}`);
      console.log(`Password: ${newPassword}`);
    } else {
      console.log('Failed to update admin password.');
    }
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  }
}

// Run the function
resetAdminPassword();
