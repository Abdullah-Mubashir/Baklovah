/**
 * Baklovah Restaurant - Payment Service
 * Handles Stripe payment processing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a payment intent with Stripe
 * @param {number} amount - Amount in dollars
 * @param {string} currency - Currency code (default: 'usd')
 * @param {Object} metadata - Additional metadata for the payment intent
 * @returns {Promise<Object>} Stripe payment intent object
 */
async function createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
        // Convert amount to cents (Stripe uses smallest currency unit)
        const amountInCents = Math.round(amount * 100);
        
        // Create a payment intent with manual capture option
        // This authorizes the payment but only captures it when we're ready
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency,
            capture_method: 'manual', // Authorize now, capture later when order is completed
            metadata: {
                ...metadata
            }
        });
        
        return paymentIntent;
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw new Error(`Payment intent creation failed: ${error.message}`);
    }
}

/**
 * Capture an existing payment intent (when order is completed)
 * @param {string} paymentIntentId - The ID of the payment intent to capture
 * @returns {Promise<Object>} Captured payment intent
 */
async function capturePaymentIntent(paymentIntentId) {
    try {
        const intent = await stripe.paymentIntents.capture(paymentIntentId);
        return intent;
    } catch (error) {
        console.error('Error capturing payment intent:', error);
        throw new Error(`Payment capture failed: ${error.message}`);
    }
}

/**
 * Cancel an existing payment intent (when order is canceled)
 * @param {string} paymentIntentId - The ID of the payment intent to cancel
 * @returns {Promise<Object>} Canceled payment intent
 */
async function cancelPaymentIntent(paymentIntentId) {
    try {
        const intent = await stripe.paymentIntents.cancel(paymentIntentId);
        return intent;
    } catch (error) {
        console.error('Error canceling payment intent:', error);
        throw new Error(`Payment cancellation failed: ${error.message}`);
    }
}

/**
 * Retrieve a payment intent by ID
 * @param {string} paymentIntentId - The ID of the payment intent to retrieve
 * @returns {Promise<Object>} Payment intent object
 */
async function retrievePaymentIntent(paymentIntentId) {
    try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return intent;
    } catch (error) {
        console.error('Error retrieving payment intent:', error);
        throw new Error(`Payment retrieval failed: ${error.message}`);
    }
}

module.exports = {
    createPaymentIntent,
    capturePaymentIntent,
    cancelPaymentIntent,
    retrievePaymentIntent
};
