/**
 * Analytics Controller
 * Handles all operations related to menu item analytics
 * Provides data for admin dashboard to view most viewed, purchased, and liked items
 */

const Analytics = require('../models/analytics');

/**
 * Get most viewed items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getMostViewedItems(req, res) {
  try {
    // Get limit from query params or default to 5
    const limit = parseInt(req.query.limit) || 5;
    
    const items = await Analytics.getMostViewed(limit);
    
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching most viewed items:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching most viewed items'
    });
  }
}

/**
 * Get most purchased items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getMostPurchasedItems(req, res) {
  try {
    // Get limit from query params or default to 5
    const limit = parseInt(req.query.limit) || 5;
    
    const items = await Analytics.getMostPurchased(limit);
    
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching most purchased items:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching most purchased items'
    });
  }
}

/**
 * Get most liked items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getMostLikedItems(req, res) {
  try {
    // Get limit from query params or default to 5
    const limit = parseInt(req.query.limit) || 5;
    
    const items = await Analytics.getMostLiked(limit);
    
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching most liked items:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching most liked items'
    });
  }
}

/**
 * Get overall analytics summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAnalyticsSummary(req, res) {
  try {
    // Get dashboard summary data from Analytics model
    const summary = await Analytics.getDashboardSummary();
    
    // Add database type to the summary
    const db = require('../database/adapter');
    summary.databaseType = db.getDatabaseType();
    
    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics summary'
    });
  }
}

module.exports = {
  getMostViewedItems,
  getMostPurchasedItems,
  getMostLikedItems,
  getAnalyticsSummary
};
