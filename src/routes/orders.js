/**
 * Order Routes
 * Handles all routes related to customer orders
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, isCashier } = require('../middleware/auth');

// Public routes
// POST create new order
router.post('/', orderController.createOrder);

// GET single order by id (for customers to check their order)
router.get('/track/:id', orderController.getOrderById);

// Protected routes (cashier/admin only)
// GET all orders (cashier interface)
router.get('/', authenticate, isCashier, orderController.getAllOrders);

// GET single order details (cashier interface)
router.get('/:id', authenticate, isCashier, orderController.getOrderById);

// PATCH update order status (cashier interface)
router.patch('/:id/status', authenticate, isCashier, orderController.updateOrderStatus);

// PATCH update payment status
router.patch('/:id/payment', authenticate, isCashier, orderController.updatePaymentStatus);

module.exports = router;
