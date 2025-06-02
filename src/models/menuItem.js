/**
 * Menu Item Model
 * Handles database operations for menu items
 */

const db = require('../database/adapter');
const Analytics = require('./analytics');

class MenuItem {
  /**
   * Get all menu items
   * @param {string} category - Optional category filter
   * @returns {Promise<Array>} Array of menu items
   */
  static async getAll(category = null) {
    let sql = 'SELECT * FROM menu_items';
    const params = [];
    
    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }
    
    sql += ' ORDER BY category, title';
    
    try {
      const rows = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  }
  
  /**
   * Get a single menu item by ID
   * @param {number} id - Menu item ID
   * @returns {Promise<Object>} Menu item object
   */
  static async getById(id) {
    try {
      const rows = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      // Increment view count in analytics
      await Analytics.incrementViewCount(id);
      
      return rows[0];
    } catch (error) {
      console.error(`Error fetching menu item with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new menu item
   * @param {Object} item - Menu item data
   * @returns {Promise<Object>} Created menu item with ID
   */
  static async create(item) {
    try {
      return await db.transaction(async (conn) => {
        // Insert menu item
        const [itemResult] = await conn.execute(
          'INSERT INTO menu_items (title, description, price, image_url, category, is_available) VALUES (?, ?, ?, ?, ?, ?)',
          [item.title, item.description, item.price, item.image_url, item.category, item.is_available ?? true]
        );
        
        const newItemId = itemResult.insertId;
        
        // Initialize analytics for this item
        await Analytics.initializeAnalytics(newItemId);
        
        // Return the newly created item
        const [items] = await conn.execute('SELECT * FROM menu_items WHERE id = ?', [newItemId]);
        return { id: newItemId, ...items[0] };
      });
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update an existing menu item
   * @param {number} id - Menu item ID to update
   * @param {Object} item - Updated menu item data
   * @returns {Promise<Object>} Updated menu item
   */
  static async update(id, item) {
    try {
      // Construct dynamic update query based on provided fields
      const fields = [];
      const values = [];
      
      if (item.title !== undefined) {
        fields.push('title = ?');
        values.push(item.title);
      }
      
      if (item.description !== undefined) {
        fields.push('description = ?');
        values.push(item.description);
      }
      
      if (item.price !== undefined) {
        fields.push('price = ?');
        values.push(item.price);
      }
      
      if (item.image_url !== undefined) {
        fields.push('image_url = ?');
        values.push(item.image_url);
      }
      
      if (item.category !== undefined) {
        fields.push('category = ?');
        values.push(item.category);
      }
      
      if (item.is_available !== undefined) {
        fields.push('is_available = ?');
        values.push(item.is_available);
      }
      
      if (fields.length === 0) {
        throw new Error('No fields provided for update');
      }
      
      // Add ID to values array
      values.push(id);
      
      const sql = `UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`;
      await db.query(sql, values);
      
      // Return the updated item
      const updatedMenuItem = await this.getById(id);
      return { ...updatedMenuItem };
    } catch (error) {
      console.error(`Error updating menu item with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a menu item
   * @param {number} id - Menu item ID to delete
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    try {
      // The item_analytics record will be deleted automatically due to ON DELETE CASCADE
      const result = await db.query('DELETE FROM menu_items WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting menu item with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all available categories
   * @returns {Promise<Array>} Array of category names
   */
  static async getCategories() {
    try {
      const results = await db.query('SELECT DISTINCT category FROM menu_items WHERE category IS NOT NULL ORDER BY category');
      return results.map(row => row.category);
    } catch (error) {
      console.error('Error fetching menu categories:', error);
      throw error;
    }
  }
  
  /**
   * Get featured menu items (most purchased or liked)
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} Array of featured menu items
   */
  static async getFeatured(limit = 6) {
    try {
      const sql = `
        SELECT m.*, a.views, a.purchases, a.likes 
        FROM menu_items m
        JOIN item_analytics a ON m.id = a.menu_item_id
        WHERE m.is_available = true
        ORDER BY (a.purchases * 2 + a.likes) DESC
        LIMIT ?
      `;
      
      return await db.query(sql, [limit]);
    } catch (error) {
      console.error('Error fetching featured menu items:', error);
      throw error;
    }
  }
}

module.exports = MenuItem;
