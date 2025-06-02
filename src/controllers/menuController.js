/**
 * Menu Controller
 * Handles all operations related to menu items including CRUD operations
 * and image upload to Amazon S3
 */

const MenuItem = require('../models/menuItem');
const Analytics = require('../models/analytics');
const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// S3 bucket name for menu item images
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'restaurantarabic';

/**
 * Get all menu items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllMenuItems(req, res) {
  try {
    // Get category from query string if provided
    const category = req.query.category || null;
    
    const items = await MenuItem.getAll(category);
    
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching menu items'
    });
  }
}

/**
 * Get a single menu item by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getMenuItemById(req, res) {
  const { id } = req.params;
  
  try {
    // Get menu item (this also increments view count via the model)
    const menuItem = await MenuItem.getById(id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Get analytics data
    const analytics = await Analytics.getForItem(id);
    
    // Combine menu item with analytics
    const result = {
      ...menuItem,
      analytics: analytics || { views: 0, purchases: 0, likes: 0 }
    };
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching menu item'
    });
  }
}

/**
 * Create a new menu item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createMenuItem(req, res) {
  const { title, description, price, category } = req.body;
  
  // Validate required fields
  if (!title || !price) {
    return res.status(400).json({
      success: false,
      message: 'Please provide title and price'
    });
  }
  
  try {
    let imageUrl = null;
    
    // Handle image upload if file is present
    if (req.file) {
      try {
        // Use the original filename as the S3 key
        const fileName = req.file.originalname;
        
        // Upload file to S3
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: `food/${fileName}`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: 'public-read'
        };
        
        const uploadResult = await s3.upload(params).promise();
        imageUrl = uploadResult.Location;
        console.log(`Image uploaded successfully to S3: ${imageUrl}`);
      } catch (uploadError) {
        console.error('Error uploading image to S3:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to S3. Please try again.'
        });
      }
    }
    
    // Create menu item using model (this also initializes analytics)
    const newItem = await MenuItem.create({
      title,
      description,
      price,
      image_url: imageUrl,
      category,
      is_available: true
    });
    
    return res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: newItem
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating menu item'
    });
  }
}

/**
 * Update an existing menu item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateMenuItem(req, res) {
  const { id } = req.params;
  const { title, description, price, category, is_available } = req.body;
  
  try {
    // Check if menu item exists
    const menuItem = await MenuItem.getById(id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    let imageUrl = menuItem.image_url;
    
    // Handle image upload if file is present
    if (req.file) {
      try {
        // Delete old image from S3 if it exists
        if (imageUrl) {
          // Extract the key from the URL or filename from path
          let oldKey = '';
          
          if (imageUrl.includes('s3.amazonaws.com')) {
            // Parse S3 URL to get the key
            const urlParts = new URL(imageUrl);
            oldKey = urlParts.pathname.split('/').pop();
          } else {
            // Just get the filename
            oldKey = imageUrl.split('/').pop();
          }
          
          if (oldKey) {
            const deleteParams = {
              Bucket: S3_BUCKET_NAME,
              Key: `food/${oldKey}`
            };
            
            try {
              await s3.deleteObject(deleteParams).promise();
              console.log(`Previous image deleted from S3: ${oldKey}`);
            } catch (deleteError) {
              console.warn(`Warning: Failed to delete old image from S3: ${deleteError.message}`);
              // Continue with upload even if delete fails
            }
          }
        }
        
        // Use the original filename as the S3 key
        const fileName = req.file.originalname;
        
        // Upload new image to S3
        const params = {
          Bucket: S3_BUCKET_NAME,
          Key: `food/${fileName}`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: 'public-read'
        };
        
        const uploadResult = await s3.upload(params).promise();
        imageUrl = uploadResult.Location;
        console.log(`New image uploaded successfully to S3: ${imageUrl}`);
      } catch (uploadError) {
        console.error('Error handling image upload to S3:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to S3. Please try again.'
        });
      }
    }
    
    // Build update object with only the fields that are provided
    const updateData = {};
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = price;
    if (imageUrl) updateData.image_url = imageUrl;
    if (category) updateData.category = category;
    if (is_available !== undefined) updateData.is_available = is_available;
    
    // Update the menu item using the model
    const updatedItem = await MenuItem.update(id, updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating menu item'
    });
  }
}

/**
 * Delete a menu item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteMenuItem(req, res) {
  const { id } = req.params;
  
  try {
    // Check if menu item exists
    const menuItem = await MenuItem.getById(id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Delete image from S3 if it exists
    if (menuItem.image_url) {
      const key = menuItem.image_url.split('/').pop();
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `menu-items/${key}`
      };
      
      await s3.deleteObject(deleteParams).promise();
    }
    
    // Delete menu item from database using model
    await MenuItem.delete(id);
    
    // Analytics will be deleted automatically due to foreign key constraint
    
    return res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting menu item'
    });
  }
}

/**
 * Like a menu item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function likeMenuItem(req, res) {
  const { id } = req.params;
  
  try {
    // Check if menu item exists
    const menuItem = await MenuItem.getById(id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Increment likes count using Analytics model
    await Analytics.incrementLikes(id);
    
    // Get updated analytics data
    const analytics = await Analytics.getForItem(id);
    
    return res.status(200).json({
      success: true,
      message: 'Menu item liked successfully',
      likes: analytics ? analytics.likes : 0
    });
  } catch (error) {
    console.error('Error liking menu item:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while liking menu item'
    });
  }
}

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  likeMenuItem
};
