/**
 * Analytics Model
 * Handles database operations for menu item analytics
 */

const db = require('../database/adapter');

class Analytics {
  /**
   * Get analytics for a specific menu item
   * @param {number} menuItemId - Menu item ID
   * @returns {Promise<Object>} Analytics data for the menu item
   */
  static async getForItem(menuItemId) {
    try {
      const results = await db.query(
        'SELECT * FROM item_analytics WHERE menu_item_id = ?',
        [menuItemId]
      );
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error fetching analytics for menu item ${menuItemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the most viewed menu items
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} Array of menu items with view counts
   */
  static async getMostViewed(limit = 10) {
    try {
      const sql = `
        SELECT m.*, a.views 
        FROM menu_items m
        JOIN item_analytics a ON m.id = a.menu_item_id
        ORDER BY a.views DESC
        LIMIT ?
      `;
      
      return await db.query(sql, [limit]);
    } catch (error) {
      console.error('Error fetching most viewed menu items:', error);
      throw error;
    }
  }
  
  /**
   * Get the most purchased menu items
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} Array of menu items with purchase counts
   */
  static async getMostPurchased(limit = 10) {
    try {
      const sql = `
        SELECT m.*, a.purchases 
        FROM menu_items m
        JOIN item_analytics a ON m.id = a.menu_item_id
        ORDER BY a.purchases DESC
        LIMIT ?
      `;
      
      return await db.query(sql, [limit]);
    } catch (error) {
      console.error('Error fetching most purchased menu items:', error);
      throw error;
    }
  }
  
  /**
   * Get the most liked menu items
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} Array of menu items with like counts
   */
  static async getMostLiked(limit = 10) {
    try {
      const sql = `
        SELECT m.*, a.likes 
        FROM menu_items m
        JOIN item_analytics a ON m.id = a.menu_item_id
        ORDER BY a.likes DESC
        LIMIT ?
      `;
      
      return await db.query(sql, [limit]);
    } catch (error) {
      console.error('Error fetching most liked menu items:', error);
      throw error;
    }
  }
  
  /**
   * Increment the view count for a menu item
   * @param {number} menuItemId - Menu item ID
   * @returns {Promise<boolean>} Success status
   */
  static async incrementViews(menuItemId) {
    try {
      const result = await db.query(
        'UPDATE item_analytics SET views = views + 1, last_viewed = CURRENT_TIMESTAMP WHERE menu_item_id = ?',
        [menuItemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error incrementing views for menu item ${menuItemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Increment the purchase count for a menu item
   * @param {number} menuItemId - Menu item ID
   * @param {number} quantity - Quantity purchased
   * @returns {Promise<boolean>} Success status
   */
  static async incrementPurchases(menuItemId, quantity = 1) {
    try {
      const result = await db.query(
        'UPDATE item_analytics SET purchases = purchases + ? WHERE menu_item_id = ?',
        [quantity, menuItemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error incrementing purchases for menu item ${menuItemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Increment the like count for a menu item
   * @param {number} menuItemId - Menu item ID
   * @returns {Promise<boolean>} Success status
   */
  static async incrementLikes(menuItemId) {
    try {
      const result = await db.query(
        'UPDATE item_analytics SET likes = likes + 1 WHERE menu_item_id = ?',
        [menuItemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error incrementing likes for menu item ${menuItemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Decrement the like count for a menu item (unlike)
   * @param {number} menuItemId - Menu item ID
   * @returns {Promise<boolean>} Success status
   */
  static async decrementLikes(menuItemId) {
    try {
      const result = await db.query(
        'UPDATE item_analytics SET likes = GREATEST(likes - 1, 0) WHERE menu_item_id = ?',
        [menuItemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error decrementing likes for menu item ${menuItemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Initialize analytics for a new menu item
   * @param {number} menuItemId - Menu item ID
   * @returns {Promise<boolean>} Success status
   */
  static async initializeAnalytics(menuItemId) {
    try {
      const result = await db.query(
        'INSERT INTO item_analytics (menu_item_id, views, purchases, likes) VALUES (?, 0, 0, 0)',
        [menuItemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error initializing analytics for menu item ${menuItemId}:`, error);
      throw error;
    }
  }
  
  /**
   * Increment view count for a menu item
   * @param {number} menuItemId - Menu item ID
   * @returns {Promise<boolean>} Success status
   */
  static async incrementViewCount(menuItemId) {
    return this.incrementViews(menuItemId);
  }
  
  /**
   * Get dashboard analytics summary
   * @returns {Promise<Object>} Analytics summary for dashboard
   */
  static async getDashboardSummary() {
    try {
      // Get top 5 for each category
      const [mostViewed, mostPurchased, mostLiked] = await Promise.all([
        this.getMostViewed(5),
        this.getMostPurchased(5),
        this.getMostLiked(5)
      ]);
      
      // Get total counts
      const [totalViewsResult, totalPurchasesResult, totalLikesResult] = await Promise.all([
        db.query('SELECT SUM(views) as total FROM item_analytics'),
        db.query('SELECT SUM(purchases) as total FROM item_analytics'),
        db.query('SELECT SUM(likes) as total FROM item_analytics')
      ]);
      
      const totalViews = totalViewsResult[0]?.total || 0;
      const totalPurchases = totalPurchasesResult[0]?.total || 0;
      const totalLikes = totalLikesResult[0]?.total || 0;
      
      return {
        mostViewed,
        mostPurchased,
        mostLiked,
        totals: {
          views: totalViews,
          purchases: totalPurchases,
          likes: totalLikes
        }
      };
    } catch (error) {
      console.error('Error getting dashboard analytics summary:', error);
      throw error;
    }
  }
}

module.exports = Analytics;
