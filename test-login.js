/**
 * Test login functionality
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./src/database/adapter');

async function testLogin() {
  try {
    const username = 'admin';
    const password = 'admin123';
    
    console.log(`Testing login for user: ${username}`);
    
    // Get user from database
    const rows = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = rows[0];
    console.log('User found:', { id: user.id, username: user.username, role: user.role });
    
    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    console.log('Password match:', passwordMatch);
    
    if (passwordMatch) {
      console.log('Login would be successful!');
    } else {
      console.log('Login would fail.');
      console.log('Stored hashed password:', user.password);
    }
    
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

// Run the function
testLogin();
