/**
 * Menu Routes
 * Handles all routes related to menu items
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const menuController = require('../controllers/menuController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Set up multer for memory storage (for S3 uploads)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Public routes
// GET all menu items
router.get('/', menuController.getAllMenuItems);

// GET single menu item
router.get('/:id', menuController.getMenuItemById);

// Like a menu item
router.post('/:id/like', menuController.likeMenuItem);

// Protected routes (admin only)
// POST create new menu item
router.post('/', authenticate, isAdmin, upload.single('image'), menuController.createMenuItem);

// PUT update menu item
router.put('/:id', authenticate, isAdmin, upload.single('image'), menuController.updateMenuItem);

// DELETE menu item
router.delete('/:id', authenticate, isAdmin, menuController.deleteMenuItem);

module.exports = router;
