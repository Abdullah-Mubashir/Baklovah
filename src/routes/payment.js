/**
 * Payment Routes
 * Handles all routes related to payment processing
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, isCashier } = require('../middleware/auth');

// Public routes
// Create payment intent
router.post('/create-intent', paymentController.createPaymentIntent);

// Payment webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Protected routes (cashier/admin only)
// Capture payment
router.post('/:paymentIntentId/capture', authenticate, isCashier, paymentController.capturePayment);

// Cancel payment
router.post('/:paymentIntentId/cancel', authenticate, isCashier, paymentController.cancelPayment);

module.exports = router;
