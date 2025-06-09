/**
 * Baklovah Restaurant Website - Main Server File
 * This file initializes the Express server and sets up all middleware and routes
 */

// Import required dependencies
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config(); // Load environment variables
const winston = require('winston'); // For logging

// Import database adapter
const dbAdapter = require('./src/database/adapter');

// Import services
const orderService = require('./src/services/orderService');

// Import route handlers
const menuRoutes = require('./src/routes/menu');
const orderRoutes = require('./src/routes/orders');
const paymentRoutes = require('./src/routes/payment');
const authRoutes = require('./src/routes/auth');
const analyticsRoutes = require('./src/routes/analytics');
const adminRoutes = require('./src/routes/adminRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const userRoutes = require('./src/routes/userRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const apiRoutes = require('./src/routes/apiRoutes'); // New comprehensive API routes
const resetAdminPasswordRoutes = require('./src/routes/resetAdminPassword'); // Temporary admin password reset
const cashierRoutes = require('./src/routes/cashierRoutes'); // Cashier interface routes

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

// Middleware setup
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON request bodies
// Special raw body parser for Stripe webhook
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(cookieParser()); // Parse cookies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Set up view engine for admin panel
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs'); // Using EJS as the template engine

// Socket.io setup for real-time communication
io.on('connection', (socket) => {
  logger.info('New client connected');
  
  // Handle events for real-time updates
  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
    logger.info(`Client joined room for order ${orderId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// Add socket.io to request object so routes can access it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Set up API routes
app.use('/api', apiRoutes); // New comprehensive API routes

// Legacy API routes (can be removed later)
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/users', profileRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// Cashier routes
app.use('/cashier', express.static(path.join(__dirname, 'src/views/cashier')));
app.use('/cashier', cashierRoutes);

// Temporary admin password reset route - REMOVE AFTER USE
app.use('/admin-reset', resetAdminPasswordRoutes);

// Test routes for debugging
app.use('/test', require('./src/routes/test-routes'));

// Default admin route is handled by adminRoutes

// Serve customer-facing EJS views
app.get('/', (req, res) => {
  res.render('customer/home', { title: 'Home', currentPath: '/' });
});

app.get('/menu', (req, res) => {
  res.render('customer/menu', { title: 'Menu', currentPath: '/menu' });
});

app.get('/order', (req, res) => {
  res.render('customer/order', { 
    title: 'Order Online', 
    currentPath: '/order',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key'
  });
});

app.get('/about', (req, res) => {
  res.render('customer/about', { title: 'About Us', currentPath: '/about' });
});

app.get('/contact', (req, res) => {
  res.render('customer/contact', { title: 'Contact Us', currentPath: '/contact' });
});

app.get('/track-order', (req, res) => {
  res.render('customer/track-order', { title: 'Track Order', currentPath: '/track-order' });
});

app.get('/track-order/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderData = await orderService.getOrder(orderId);
    
    if (!orderData) {
      return res.render('customer/track-order', { 
        title: 'Track Order', 
        currentPath: '/track-order',
        error: 'Order not found'
      });
    }
    
    res.render('customer/track-order', {
      title: 'Track Order', 
      currentPath: '/track-order',
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      orderStatus: orderData.status,
      customerName: orderData.customer_name,
      customerEmail: orderData.customer_email,
      customerPhone: orderData.customer_phone,
      orderTime: orderData.order_time,
      deliveryMethod: orderData.delivery_method,
      estimatedTime: orderData.time_remaining ? `${orderData.time_remaining} minutes` : 'Calculating...',
      orderItems: orderData.items,
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      deliveryFee: orderData.delivery_fee || 0,
      discount: orderData.discount || 0,
      totalAmount: orderData.total_amount || 0
    });
  } catch (error) {
    console.error('Error fetching order for tracking:', error);
    res.render('customer/track-order', { 
      title: 'Track Order', 
      currentPath: '/track-order',
      error: 'Failed to fetch order details'
    });
  }
});

app.get('/careers', (req, res) => {
  res.render('customer/careers', { title: 'Careers', currentPath: '/careers' });
});

app.get('/privacy', (req, res) => {
  res.render('customer/privacy', { title: 'Privacy Policy', currentPath: '/privacy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Initialize database and start the server
const PORT = process.env.PORT || 3000;

// Initialize database and start server
dbAdapter.initializeDatabase()
  .then(async () => {
    try {
      // Create Item_Views table if it doesn't exist
      logger.info('Checking for Item_Views table...');
      await dbAdapter.query(`
        CREATE TABLE IF NOT EXISTS Item_Views (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          item_id INTEGER NOT NULL,
          view_time DATETIME NOT NULL,
          FOREIGN KEY (item_id) REFERENCES Menu_Items(id) ON DELETE CASCADE
        )
      `);
      
      // Create index for performance
      await dbAdapter.query(`
        CREATE INDEX IF NOT EXISTS idx_item_views_item_id ON Item_Views (item_id)
      `);
      
      logger.info('Item_Views table is ready');
      
      // Start server
      server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Database type: ${dbAdapter.getDatabaseType()}`);
        console.log(`Server running on port ${PORT}`);
      });
    } catch (error) {
      logger.error('Error creating Item_Views table:', error);
      server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} (with database setup errors)`);
        logger.info(`Database type: ${dbAdapter.getDatabaseType()}`);
        console.log(`Server running on port ${PORT}`);
      });
    }
  })
  .catch(error => {
    logger.error('Failed to initialize database:', error);
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });

module.exports = { app, server, io }; // Export for testing
