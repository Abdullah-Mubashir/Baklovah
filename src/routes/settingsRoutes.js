/**
 * Settings API Routes
 * Handles all API routes for settings management
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');

/**
 * @route   GET /api/admin/settings/all
 * @desc    Get all settings
 * @access  Private (Admin only)
 */
router.get('/all', authenticate, isAdmin, async (req, res) => {
  try {
    // Get all settings from database
    const [systemSettings] = await pool.query('SELECT * FROM settings WHERE category = "system" LIMIT 1');
    const [orderSettings] = await pool.query('SELECT * FROM settings WHERE category = "order" LIMIT 1');
    const [stripeSettings] = await pool.query('SELECT * FROM settings WHERE category = "stripe" LIMIT 1');
    const [paymentMethodSettings] = await pool.query('SELECT * FROM settings WHERE category = "paymentMethods" LIMIT 1');
    const [emailSettings] = await pool.query('SELECT * FROM settings WHERE category = "email" LIMIT 1');
    const [notificationSettings] = await pool.query('SELECT * FROM settings WHERE category = "notifications" LIMIT 1');

    // Parse JSON values
    const settings = {
      system: systemSettings.length > 0 ? JSON.parse(systemSettings[0].settings_value) : {},
      order: orderSettings.length > 0 ? JSON.parse(orderSettings[0].settings_value) : {},
      stripe: stripeSettings.length > 0 ? JSON.parse(stripeSettings[0].settings_value) : {},
      paymentMethods: paymentMethodSettings.length > 0 ? JSON.parse(paymentMethodSettings[0].settings_value) : {},
      email: emailSettings.length > 0 ? JSON.parse(emailSettings[0].settings_value) : {},
      notifications: notificationSettings.length > 0 ? JSON.parse(notificationSettings[0].settings_value) : {}
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/settings/:category
 * @desc    Save settings for a specific category
 * @access  Private (Admin only)
 */
router.post('/:category', authenticate, isAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const settingsValue = JSON.stringify(req.body);
    
    // Validate category
    const validCategories = ['system', 'order', 'stripe', 'paymentMethods', 'email', 'notifications'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid settings category' });
    }

    // Check if settings already exist for this category
    const [existingSettings] = await pool.query(
      'SELECT * FROM settings WHERE category = ? LIMIT 1',
      [category]
    );

    if (existingSettings.length > 0) {
      // Update existing settings
      await pool.query(
        'UPDATE settings SET settings_value = ?, updated_at = NOW() WHERE category = ?',
        [settingsValue, category]
      );
    } else {
      // Insert new settings
      await pool.query(
        'INSERT INTO settings (category, settings_value, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [category, settingsValue]
      );
    }

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/settings/:category
 * @desc    Get settings for a specific category
 * @access  Private (Admin only)
 */
router.get('/:category', authenticate, isAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['system', 'order', 'stripe', 'paymentMethods', 'email', 'notifications'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid settings category' });
    }

    // Get settings from database
    const [settings] = await pool.query(
      'SELECT settings_value FROM settings WHERE category = ? LIMIT 1',
      [category]
    );

    if (settings.length === 0) {
      return res.json({});
    }

    // Parse JSON value
    const settingsValue = JSON.parse(settings[0].settings_value);

    res.json(settingsValue);
  } catch (error) {
    console.error(`Error fetching ${req.params.category} settings:`, error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
