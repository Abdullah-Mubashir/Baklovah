/**
 * API Routes
 * Handles all REST API endpoints for the application
 */

const multer = require('multer');
// AWS SDK v3 imports
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Configure AWS S3 client with v3 SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

// S3 bucket name for menu item images
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'restaurantarabic';

// Setup multer for memory storage (for S3 uploads)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isCashier } = require('../middleware/auth');
const db = require('../database/adapter');

// ======= Menu API Routes =======

/**
 * Get all menu items
 * @route GET /api/menu
 * @access Public
 */
router.get('/menu', async (req, res) => {
  try {
    const menuItems = await db.query('SELECT * FROM Menu_Items ORDER BY category, title');
    return res.json({ success: true, data: menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch menu items' });
  }
});

/**
 * Get a specific menu item by ID
 * @route GET /api/menu/:id
 * @access Public
 */
router.get('/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const menuItems = await db.query('SELECT * FROM Menu_Items WHERE id = ?', [id]);
    
    // Update view count in the database
    await db.query('UPDATE Menu_Items SET view_count = view_count + 1 WHERE id = ?', [id]);
    
    if (menuItems.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    
    return res.json({ success: true, data: menuItems[0] });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch menu item' });
  }
});

/**
 * Add a new menu item
 * @route POST /api/menu
 * @access Admin only
 */
router.post('/menu', authenticate, isAdmin, upload.single('image'), async (req, res) => {
  try {
    // Get data from request body
    const { name, title, description, price, category_id, category, status = 'active',
           is_vegetarian, is_gluten_free, is_spicy } = req.body;
    
    // Handle field name mapping for consistency
    const itemName = name || title; // Use name if provided, otherwise use title
    const categoryValue = category_id || category; // Use category_id if provided, otherwise use category
    
    // Validate required fields
    if (!itemName || !price) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }
    
    // Handle image upload to S3 if file is provided
    let imageUrl = null;
    if (req.file) {
      try {
        // Generate a unique filename using original name and timestamp
        const fileExt = req.file.originalname.split('.').pop();
        const uniqueFilename = `${itemName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
        
        // Upload image to S3 using SDK v3
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: `food/${uniqueFilename}`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: 'public-read'
        };
        
        // Execute the PutObjectCommand to upload the file
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        
        // Construct the URL manually since SDK v3 doesn't return Location directly
        const region = process.env.AWS_REGION || 'us-east-1';
        imageUrl = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/food/${uniqueFilename}`;
        console.log(`Image uploaded successfully to S3: ${imageUrl}`);
      } catch (uploadError) {
        console.error('Error uploading image to S3:', uploadError);
        return res.status(500).json({
          success: false, 
          message: 'Failed to upload image to S3: ' + uploadError.message
        });
      }
    }
    
    // Convert boolean strings to integers for SQLite
    const is_vegetarian_value = req.body.is_vegetarian === 'true' || req.body.is_vegetarian === true ? 1 : 0;
    const is_gluten_free_value = req.body.is_gluten_free === 'true' || req.body.is_gluten_free === true ? 1 : 0;
    const is_spicy_value = req.body.is_spicy === 'true' || req.body.is_spicy === true ? 1 : 0;
    
    // Insert the new item
    const result = await db.query(
      'INSERT INTO menu_items (title, description, price, category, status, image_url, is_vegetarian, is_gluten_free, is_spicy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [itemName, description || '', price, categoryValue || 'Other', status, imageUrl, is_vegetarian_value, is_gluten_free_value, is_spicy_value]
    );
    
    // Get the inserted item ID
    const insertId = result.insertId;
    
    // Get the inserted item
    const items = await db.query('SELECT * FROM menu_items WHERE id = ?', [insertId]);
    
    return res.status(201).json({ success: true, data: items[0], message: 'Menu item created successfully' });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return res.status(500).json({ success: false, message: 'Failed to create menu item: ' + error.message });
  }
});

/**
 * Update a menu item
 * @route PUT /api/menu/:id
 * @access Admin only
 */
router.put('/menu/:id', authenticate, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Log the incoming request body for debugging
    console.log('Update menu item request body:', req.body);
    
    // Map frontend field names to database field names if needed
    const { 
      name, // If frontend sends 'name' directly
      title, // Or if frontend sends 'title' instead of 'name'
      category_id, // If frontend sends category_id directly
      category, // Or if frontend sends 'category' instead of category_id
      description, 
      price, 
      status,
      is_vegetarian,
      is_gluten_free,
      is_spicy,
      is_available = 1 // Default to available if not specified
    } = req.body;
    
    // Handle field name mapping
    const itemName = name || title; // Use name if provided, otherwise use title
    const categoryValue = category_id || category; // Use category_id if provided, otherwise use category
    
    // Validate required fields
    if (!itemName || !categoryValue || !price) {
      return res.status(400).json({ success: false, message: 'Name/title, category, and price are required' });
    }
    
    // Check if item exists
    const existingItems = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (existingItems.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    
    // Get the current image URL if it exists
    let imageUrl = existingItems[0].image_url;
    
    // Handle image upload if file is present
    if (req.file) {
      try {
        // Delete old image from S3 if it exists
        if (imageUrl && imageUrl.includes('amazonaws.com')) {
          // Extract the key from the URL
          try {
            const urlParts = new URL(imageUrl);
            const key = decodeURIComponent(urlParts.pathname.substring(1)); // Remove leading slash
            
            const deleteParams = {
              Bucket: S3_BUCKET_NAME,
              Key: key
            };
            
            // Use DeleteObjectCommand from SDK v3
            const deleteCommand = new DeleteObjectCommand(deleteParams);
            await s3Client.send(deleteCommand);
            console.log(`Previous image deleted from S3: ${key}`);
          } catch (deleteError) {
            console.warn(`Warning: Failed to delete old image from S3: ${deleteError.message}`);
            // Continue with upload even if delete fails
          }
        }
        
        // Generate a unique filename using original name and timestamp
        const fileExt = req.file.originalname.split('.').pop();
        const uniqueFilename = `${itemName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
        
        // Upload new image to S3 using SDK v3
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: `food/${uniqueFilename}`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: 'public-read'
        };
        
        // Execute the PutObjectCommand to upload the file
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        
        // Construct the URL manually since SDK v3 doesn't return Location directly
        const region = process.env.AWS_REGION || 'us-east-1';
        imageUrl = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/food/${uniqueFilename}`;
        console.log(`New image uploaded successfully to S3: ${imageUrl}`);
      } catch (uploadError) {
        console.error('Error handling image upload to S3:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to S3: ' + uploadError.message
        });
      }
    }
    
    // Convert boolean strings to integers for SQLite
    const is_vegetarian_value = req.body.is_vegetarian === 'true' || req.body.is_vegetarian === true ? 1 : 0;
    const is_gluten_free_value = req.body.is_gluten_free === 'true' || req.body.is_gluten_free === true ? 1 : 0;
    const is_spicy_value = req.body.is_spicy === 'true' || req.body.is_spicy === true ? 1 : 0;
    
    // Update the item - use the field names that match the database schema
    await db.query(
      'UPDATE menu_items SET title = ?, category = ?, description = ?, price = ?, is_available = ?, is_vegetarian = ?, is_gluten_free = ?, is_spicy = ?, image_url = ? WHERE id = ?',
      [itemName, categoryValue, description, price, is_available, is_vegetarian_value, is_gluten_free_value, is_spicy_value, imageUrl, id]
    );
    
    // Get the updated item
    const updatedItem = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    
    return res.json({ success: true, data: updatedItem[0], message: 'Menu item updated successfully' });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return res.status(500).json({ success: false, message: 'Failed to update menu item: ' + error.message });
  }
});

/**
 * Delete a menu item
 * @route DELETE /api/menu/:id
 * @access Admin only
 */
router.delete('/menu/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const existingItems = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (existingItems.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    
    // Delete the item
    await db.query('DELETE FROM Menu_Items WHERE id = ?', [id]);
    
    return res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete menu item' });
  }
});

/**
 * Publish a menu item (update status to active)
 * @route PATCH /api/menu/:id/publish
 * @access Admin only
 */
router.patch('/menu/:id/publish', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'active' } = req.body; // Default to 'active' if not specified
    
    // Check if item exists
    const existingItems = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (existingItems.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    
    // Update the status
    await db.query('UPDATE menu_items SET status = ? WHERE id = ?', [status, id]);
    
    // Get the updated item
    const updatedItem = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    
    return res.json({ 
      success: true, 
      data: updatedItem[0], 
      message: `Menu item ${status === 'active' ? 'published' : 'unpublished'} successfully` 
    });
  } catch (error) {
    console.error('Error publishing menu item:', error);
    return res.status(500).json({ success: false, message: 'Failed to publish menu item' });
  }
});

// ======= Analytics API Routes =======

/**
 * Get analytics summary data
 * @route GET /api/analytics/summary
 * @access Admin only
 */
router.get('/analytics/summary', authenticate, isAdmin, async (req, res) => {
  try {
    // Get total orders
    const ordersResult = await db.query('SELECT COUNT(*) as count FROM Orders');
    const totalOrders = ordersResult[0].count || 0;
    
    // Get total revenue
    const revenueResult = await db.query('SELECT SUM(total_amount) as total FROM Orders');
    const totalRevenue = revenueResult[0].total || 0;
    
    // Get total menu items
    const menuItemsResult = await db.query('SELECT COUNT(*) as count FROM Menu_Items WHERE status = "active"');
    const menuItems = menuItemsResult[0].count || 0;
    
    // Get total views
    const viewsResult = await db.query('SELECT SUM(view_count) as total FROM Menu_Items');
    const totalViews = viewsResult[0].total || 0;
    
    // Get orders by status
    const ordersByStatus = await db.query(
      'SELECT status, COUNT(*) as count FROM Orders GROUP BY status'
    );
    
    // Get orders and revenue by date (last 7 days)
    const ordersByDate = await db.query(
      'SELECT DATE(order_time) as date, COUNT(*) as orders, SUM(total_amount) as revenue ' +
      'FROM Orders ' +
      'WHERE order_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ' +
      'GROUP BY DATE(order_time) ' +
      'ORDER BY date'
    );
    
    return res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        menuItems,
        totalViews,
        ordersByStatus,
        ordersByDate
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics summary' });
  }
});

/**
 * Get most viewed menu items
 * @route GET /api/analytics/most-viewed
 * @access Admin only
 */
router.get('/analytics/most-viewed', authenticate, isAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const items = await db.query(
      'SELECT id, title, category, image_url, view_count FROM Menu_Items ' +
      'ORDER BY view_count DESC LIMIT ?',
      [limit]
    );
    
    return res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching most viewed items:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch most viewed items' });
  }
});

/**
 * Get most purchased menu items
 * @route GET /api/analytics/most-purchased
 * @access Admin only
 */
router.get('/analytics/most-purchased', authenticate, isAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const items = await db.query(
      'SELECT m.id, m.title, m.category, m.image_url, COUNT(oi.id) as purchase_count ' +
      'FROM Menu_Items m ' +
      'JOIN Order_Items oi ON m.id = oi.menu_item_id ' +
      'GROUP BY m.id ' +
      'ORDER BY purchase_count DESC LIMIT ?',
      [limit]
    );
    
    return res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching most purchased items:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch most purchased items' });
  }
});

/**
 * Get most liked menu items
 * @route GET /api/analytics/most-liked
 * @access Admin only
 */
router.get('/analytics/most-liked', authenticate, isAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const items = await db.query(
      'SELECT id, title, category, image_url, like_count FROM Menu_Items ' +
      'ORDER BY like_count DESC LIMIT ?',
      [limit]
    );
    
    return res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching most liked items:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch most liked items' });
  }
});

// ======= Site Customization API Routes =======

/**
 * Get site settings
 * @route GET /api/site-settings
 * @access Admin only
 */
router.get('/site-settings', authenticate, isAdmin, async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM Site_Settings');
    
    // Convert the array of settings to an object for easier access
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    
    return res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch site settings' });
  }
});

/**
 * Update site settings
 * @route PUT /api/site-settings
 * @access Admin only
 */
router.put('/site-settings', authenticate, isAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    // Begin a transaction
    await db.query('START TRANSACTION');
    
    // Update each setting in the database
    for (const [key, value] of Object.entries(settings)) {
      // Check if the setting exists
      const existingSetting = await db.query('SELECT * FROM Site_Settings WHERE setting_key = ?', [key]);
      
      if (existingSetting.length > 0) {
        // Update existing setting
        await db.query('UPDATE Site_Settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
      } else {
        // Insert new setting
        await db.query('INSERT INTO Site_Settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Get the updated settings
    const updatedSettings = await db.query('SELECT * FROM Site_Settings');
    
    // Convert to object format
    const settingsObj = {};
    updatedSettings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    
    return res.json({ success: true, data: settingsObj, message: 'Site settings updated successfully' });
  } catch (error) {
    console.error('Error updating site settings:', error);
    
    // Rollback if there's an error
    await db.query('ROLLBACK');
    
    return res.status(500).json({ success: false, message: 'Failed to update site settings' });
  }
});

module.exports = router;
