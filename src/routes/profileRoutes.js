/**
 * Profile API Routes
 * Handles all API routes for user profile management
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * @route   PUT /api/admin/users/profile
 * @desc    Update user profile
 * @access  Private (Admin and Cashier)
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if email is already in use by another user
    const [existingUser] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND id != ? LIMIT 1',
      [email, userId]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email is already in use by another user' });
    }

    // Update user profile
    await pool.query(
      'UPDATE users SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [name, email, userId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/password
 * @desc    Change user password
 * @access  Private (Admin and Cashier)
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // Get user from database
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/preferences
 * @desc    Save user preferences
 * @access  Private (Admin and Cashier)
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { theme, language, emailNotifications, desktopNotifications } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (theme === undefined || language === undefined || 
        emailNotifications === undefined || desktopNotifications === undefined) {
      return res.status(400).json({ message: 'All preference fields are required' });
    }

    // Check if preferences already exist for this user
    const [existingPreferences] = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1',
      [userId]
    );

    const preferences = JSON.stringify({
      theme,
      language,
      emailNotifications,
      desktopNotifications
    });

    if (existingPreferences.length > 0) {
      // Update existing preferences
      await pool.query(
        'UPDATE user_preferences SET preferences = ?, updated_at = NOW() WHERE user_id = ?',
        [preferences, userId]
      );
    } else {
      // Insert new preferences
      await pool.query(
        'INSERT INTO user_preferences (user_id, preferences, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [userId, preferences]
      );
    }

    res.json({ message: 'Preferences saved successfully' });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/2fa/verify
 * @desc    Verify and enable two-factor authentication
 * @access  Private (Admin and Cashier)
 */
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    // In a real implementation, we would verify the code against a secret stored for the user
    // For this demo, we'll just accept any 6-digit code
    if (!/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({ message: 'Invalid verification code. Must be 6 digits.' });
    }

    // Update user to enable 2FA
    await pool.query(
      'UPDATE users SET two_factor_enabled = 1, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Two-factor authentication enabled successfully' });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/sessions/terminate-all
 * @desc    Terminate all sessions except current one
 * @access  Private (Admin and Cashier)
 */
router.post('/sessions/terminate-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentToken = req.headers.authorization.split(' ')[1];
    
    // In a real implementation, we would invalidate all tokens except the current one
    // For this demo, we'll just return success
    
    res.json({ message: 'All other sessions terminated successfully' });
  } catch (error) {
    console.error('Error terminating sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/sessions/:sessionId/terminate
 * @desc    Terminate a specific session
 * @access  Private (Admin and Cashier)
 */
router.post('/sessions/:sessionId/terminate', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // In a real implementation, we would invalidate the specified token
    // For this demo, we'll just return success
    
    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
