/**
 * Baklovah Restaurant Website - Cashier Routes
 * Handles routes for the cashier interface
 */

const express = require('express');
const router = express.Router();
const dbAdapter = require('../database/adapter');
const jwt = require('jsonwebtoken');
const { verifyToken, isCashier } = require('../middleware/authMiddleware');

// Middleware to verify cashier is logged in
const cashierAuth = [verifyToken, isCashier];

// Root route - redirect to menu tab
router.get('/', (req, res) => {
  // For development, redirect to menu tab
  res.redirect('/cashier/menu');
});

// Menu Items tab
router.get('/menu', async (req, res) => {
  console.log('DEVELOPMENT MODE: Direct access to menu items');
  
  // For development, always render the dashboard
  // Create a mock user if one doesn't exist
  if (!req.user) {
    req.user = {
      userId: 999,
      username: 'cashier',
      role: 'cashier'
    };
  }
  
  try {
    // Import the MenuItem model to fetch menu items
    const MenuItem = require('../models/menuItem');
    
    // Fetch all menu items from the database
    const menuItems = await MenuItem.getAll();
    
    // Get unique categories for filter buttons
    const categories = [...new Set(menuItems.map(item => item.category))];
    
    res.render('cashier/index', { 
      title: 'Cashier Dashboard',
      user: req.user,
      activeTab: 'menu',
      menuItems: menuItems,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.render('cashier/index', { 
      title: 'Cashier Dashboard',
      user: req.user,
      activeTab: 'menu',
      menuItems: [],
      categories: [],
      error: 'Failed to load menu items'
    });
  }
});

// Login page
router.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.user && req.user.role === 'cashier') {
    return res.redirect('/cashier');
  }
  
  res.render('cashier/login', { 
    title: 'Cashier Login'
  });
});

// Handle login form submission
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    console.log('AUTHENTICATION BYPASS ENABLED - Auto-logging in as cashier for development');
    
    // DEVELOPMENT ONLY: Create a mock cashier user
    const user = {
      userId: 999,
      username: username || 'cashier',
      role: 'cashier'
    };
    
    // Create JWT token
    const token = jwt.sign(
      user,
      process.env.JWT_SECRET || 'baklovah-secret-key',
      { expiresIn: '1d' }
    );
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    console.log('Auto-authenticated as cashier user');
    console.log('User data:', JSON.stringify(user));
    
    // Redirect to dashboard
    res.redirect('/cashier');
  } catch (error) {
    console.error('Login error:', error);
    res.render('cashier/login', { 
      title: 'Cashier Login',
      error: 'An error occurred during login'
    });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/cashier/login');
});

// Main cashier dashboard (POS system) - showing menu tab
router.get('/menu', (req, res) => {
  // Check if user is authenticated and has cashier role
  if (!req.user || req.user.role !== 'cashier') {
    return res.redirect('/cashier/login');
  }
  
  res.render('cashier/index', { 
    title: 'Cashier Dashboard',
    user: req.user,
    activeTab: 'menu'
  });
});

// Order Management
router.get('/orders', (req, res) => {
  console.log('DEVELOPMENT MODE: Direct access to order management');
  
  // For development, always render the dashboard
  // Create a mock user if one doesn't exist
  if (!req.user) {
    req.user = {
      userId: 999,
      username: 'cashier',
      role: 'cashier'
    };
  }
  
  res.render('cashier/index', { 
    title: 'Order Management',
    user: req.user,
    activeTab: 'orders'
  });
});

// Checkout
router.get('/checkout', (req, res) => {
  console.log('DEVELOPMENT MODE: Direct access to checkout');
  
  // For development, always render the dashboard
  // Create a mock user if one doesn't exist
  if (!req.user) {
    req.user = {
      userId: 999,
      username: 'cashier',
      role: 'cashier'
    };
  }
  
  res.render('cashier/index', { 
    title: 'Checkout',
    user: req.user,
    activeTab: 'checkout'
  });
});

// API endpoints for cashier operations
// Get all active orders
router.get('/api/orders', cashierAuth, async (req, res) => {
  try {
    const orders = await dbAdapter.query(`
      SELECT o.*, u.username, u.email
      FROM Orders o
      LEFT JOIN Users u ON o.user_id = u.id
      WHERE o.status NOT IN ('completed', 'cancelled')
      ORDER BY o.order_time DESC
    `);
    
    // For each order, get its items
    for (const order of orders) {
      const orderItems = await dbAdapter.query(`
        SELECT oi.*, mi.name, mi.price, mi.image_url
        FROM Order_Items oi
        JOIN Menu_Items mi ON oi.item_id = mi.id
        WHERE oi.order_id = ?
      `, [order.id]);
      
      order.items = orderItems;
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order item status
router.put('/api/orders/:orderId/items/:itemId', async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    
    await dbAdapter.query(`
      UPDATE Order_Items
      SET status = ?
      WHERE order_id = ? AND id = ?
    `, [status, orderId, itemId]);
    
    // Check if all items are completed to update order status
    const orderItems = await dbAdapter.query(`
      SELECT status FROM Order_Items
      WHERE order_id = ?
    `, [orderId]);
    
    const allCompleted = orderItems.every(item => item.status === 'completed');
    
    if (allCompleted) {
      await dbAdapter.query(`
        UPDATE Orders
        SET status = 'completed'
        WHERE id = ?
      `, [orderId]);
    }
    
    // Notify clients via Socket.io if available
    if (req.io) {
      req.io.to(`order_${orderId}`).emit('order_updated', {
        orderId,
        itemId,
        status
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order item:', error);
    res.status(500).json({ error: 'Failed to update order item' });
  }
});

// Mark all items in an order as complete
router.put('/api/orders/:orderId/items/all', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    // Update all items in the order
    await dbAdapter.query(`
      UPDATE Order_Items
      SET status = ?
      WHERE order_id = ?
    `, [status || 'completed', orderId]);
    
    // Update the order status
    await dbAdapter.query(`
      UPDATE Orders
      SET status = ?
      WHERE id = ?
    `, [status || 'completed', orderId]);
    
    // Notify clients via Socket.io if available
    if (req.io) {
      req.io.to(`order_${orderId}`).emit('order_updated', {
        orderId,
        status: status || 'completed'
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order items:', error);
    res.status(500).json({ error: 'Failed to update order items' });
  }
});

// Create new order from cashier
router.post('/api/orders', async (req, res) => {
  try {
    const { items, customer_name, customer_phone, total } = req.body;
    
    // Create order
    const result = await dbAdapter.query(`
      INSERT INTO Orders (user_id, status, order_time, total, customer_name, customer_phone, order_type)
      VALUES (?, 'pending', NOW(), ?, ?, ?, 'in-store')
    `, [req.user?.id || null, total, customer_name, customer_phone]);
    
    const orderId = result.insertId;
    
    // Add order items
    for (const item of items) {
      await dbAdapter.query(`
        INSERT INTO Order_Items (order_id, item_id, quantity, price, special_instructions, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `, [orderId, item.id, item.quantity, item.price, item.special_instructions || '']);
    }
    
    // Notify via Socket.io if available
    if (req.io) {
      req.io.emit('new_order', { orderId });
    }
    
    res.json({ 
      success: true,
      orderId
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = router;
