/**
 * Payment Controller
 * Handles all operations related to payment processing with Stripe
 */

const paymentService = require('../services/paymentService');

/**
 * Create a payment intent with Stripe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createPaymentIntent(req, res) {
    try {
        const { amount, metadata } = req.body;
        
        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }
        
        const paymentIntent = await paymentService.createPaymentIntent(
            amount,
            'usd',
            metadata || {}
        );
        
        return res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while creating payment intent'
        });
    }
}

/**
 * Capture an existing payment intent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function capturePayment(req, res) {
    try {
        const { paymentIntentId } = req.params;
        
        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment intent ID is required'
            });
        }
        
        const paymentIntent = await paymentService.capturePaymentIntent(paymentIntentId);
        
        return res.status(200).json({
            success: true,
            data: paymentIntent
        });
    } catch (error) {
        console.error('Error capturing payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while capturing payment'
        });
    }
}

/**
 * Cancel an existing payment intent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function cancelPayment(req, res) {
    try {
        const { paymentIntentId } = req.params;
        
        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment intent ID is required'
            });
        }
        
        const paymentIntent = await paymentService.cancelPaymentIntent(paymentIntentId);
        
        return res.status(200).json({
            success: true,
            data: paymentIntent
        });
    } catch (error) {
        console.error('Error canceling payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while canceling payment'
        });
    }
}

/**
 * Handle webhook events from Stripe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleWebhook(req, res) {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const db = require('../database/adapter');
    
    const sig = req.headers['stripe-signature'];
    
    let event;
    
    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }
    
    // Handle different webhook events
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
                
                // Find order with this payment intent ID
                const [orders] = await db.query(
                    'SELECT id, order_number FROM orders WHERE payment_intent_id = ?',
                    [paymentIntent.id]
                );
                
                if (orders && orders.length > 0) {
                    const orderId = orders[0].id;
                    const orderNumber = orders[0].order_number;
                    
                    // Update order payment status to 'paid'
                    await db.query(
                        'UPDATE orders SET payment_status = ? WHERE id = ?',
                        ['paid', orderId]
                    );
                    
                    // Add entry to order status history
                    await db.query(
                        'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
                        [orderId, 'pending', 'Payment completed successfully']
                    );
                    
                    console.log(`Order ${orderNumber} payment status updated to paid`);
                    
                    // TODO: Send email confirmation to customer
                } else {
                    console.error(`No order found for payment intent ${paymentIntent.id}`);
                }
                
                break;
                
            case 'payment_intent.payment_failed':
                const failedPaymentIntent = event.data.object;
                console.log(`Payment failed: ${failedPaymentIntent.id}`);
                
                // Find order with this payment intent ID
                const [failedOrders] = await db.query(
                    'SELECT id, order_number FROM orders WHERE payment_intent_id = ?',
                    [failedPaymentIntent.id]
                );
                
                if (failedOrders && failedOrders.length > 0) {
                    const orderId = failedOrders[0].id;
                    const orderNumber = failedOrders[0].order_number;
                    
                    // Update order payment status to 'failed'
                    await db.query(
                        'UPDATE orders SET payment_status = ? WHERE id = ?',
                        ['failed', orderId]
                    );
                    
                    // Add entry to order status history
                    await db.query(
                        'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
                        [orderId, 'cancelled', 'Payment failed']
                    );
                    
                    console.log(`Order ${orderNumber} payment status updated to failed`);
                    
                    // TODO: Notify customer about payment failure
                } else {
                    console.error(`No order found for failed payment intent ${failedPaymentIntent.id}`);
                }
                
                break;
                
            case 'payment_intent.canceled':
                const canceledPaymentIntent = event.data.object;
                console.log(`Payment canceled: ${canceledPaymentIntent.id}`);
                
                // Find order with this payment intent ID
                const [canceledOrders] = await db.query(
                    'SELECT id, order_number FROM orders WHERE payment_intent_id = ?',
                    [canceledPaymentIntent.id]
                );
                
                if (canceledOrders && canceledOrders.length > 0) {
                    const orderId = canceledOrders[0].id;
                    const orderNumber = canceledOrders[0].order_number;
                    
                    // Update order payment status to 'cancelled'
                    await db.query(
                        'UPDATE orders SET payment_status = ? WHERE id = ?',
                        ['cancelled', orderId]
                    );
                    
                    // Add entry to order status history
                    await db.query(
                        'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
                        [orderId, 'cancelled', 'Payment canceled']
                    );
                    
                    console.log(`Order ${orderNumber} payment status updated to cancelled`);
                } else {
                    console.error(`No order found for canceled payment intent ${canceledPaymentIntent.id}`);
                }
                
                break;
                
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(`Error processing webhook event ${event.type}:`, error);
    }
    
    // Send a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
}

module.exports = {
    createPaymentIntent,
    capturePayment,
    cancelPayment,
    handleWebhook
};
