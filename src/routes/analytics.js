/**
 * Analytics Routes
 * Handles all routes related to menu item analytics for the admin dashboard
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes are protected for admin only
// GET most viewed items
router.get('/most-viewed', authenticate, isAdmin, analyticsController.getMostViewedItems);

// GET most purchased items
router.get('/most-purchased', authenticate, isAdmin, analyticsController.getMostPurchasedItems);

// GET most liked items
router.get('/most-liked', authenticate, isAdmin, analyticsController.getMostLikedItems);

// GET overall analytics summary
router.get('/summary', authenticate, isAdmin, analyticsController.getAnalyticsSummary);

module.exports = router;
