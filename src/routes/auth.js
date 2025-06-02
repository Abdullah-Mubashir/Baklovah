/**
 * Authentication Routes
 * Handles user login, registration, and token management routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Login route
router.post('/login', authController.login);

// Change password route (protected)
router.post('/change-password', authenticate, authController.changePassword);

// Check authentication status
router.get('/check', authenticate, authController.checkAuth);

module.exports = router;
