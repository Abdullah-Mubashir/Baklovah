/**
 * Authentication Controller
 * Handles user login, registration, and token management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/adapter');

/**
 * User login function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function login(req, res) {
  const { username, password } = req.body;
  
  // Validate input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // Query the database for the user
    const rows = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    // Check if user exists
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const user = rows[0];
    
    // Compare password with hashed password in database
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Return user info and token
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Change password function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;
  
  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }
  
  try {
    // Get user from database
    const rows = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = rows[0];
    
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password in database
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function checkAuth(req, res) {
  // If middleware passed, user is authenticated
  return res.status(200).json({
    authenticated: true,
    user: {
      id: req.user.userId,
      username: req.user.username,
      role: req.user.role
    }
  });
}

module.exports = {
  login,
  changePassword,
  checkAuth
};
