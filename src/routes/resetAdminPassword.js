/**
 * Temporary Admin Password Reset Route
 * WARNING: Delete this file after resetting your password!
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/adapter');

// Secure reset token - change this to something unique
const RESET_TOKEN = 'baklovah-secure-reset-2025';

// Route: GET /admin-reset?token=YOUR_TOKEN&newPassword=NEW_PASSWORD
router.get('/', async (req, res) => {
  const { token, newPassword } = req.query;
  
  // Log request (without showing password)
  console.log('Password reset attempt with token:', token);
  
  // Validate input
  if (!token || !newPassword || token !== RESET_TOKEN) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or missing token/password' 
    });
  }
  
  try {
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update admin user password
    const result = await db.query(
      'UPDATE users SET password = ? WHERE role = ?',
      [hashedPassword, 'admin']
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No admin users found to update'
      });
    }
    
    console.log('Admin password reset successfully');
    return res.json({
      success: true,
      message: 'Admin password has been reset successfully! You can now log in with the new password.'
    });
  } catch (error) {
    console.error('Error resetting admin password:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while resetting password',
      error: error.message
    });
  }
});

module.exports = router;
