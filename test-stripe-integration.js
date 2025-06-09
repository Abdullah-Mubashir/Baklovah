/**
 * Test script for Stripe payment integration
 * This script tests the full payment flow including:
 * 1. Creating a payment intent
 * 2. Confirming a payment
 * 3. Capturing a payment
 * 4. Cancelling a payment
 */

require('dotenv').config();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Base URL for API calls
const API_BASE_URL = 'http://localhost:3001/api';

// Test card numbers for Stripe
const TEST_CARDS = {
  success: '4242424242424242',
  requiresAuth: '4000002500003155',
  declined: '4000000000000002'
};

// Sample order data
const sampleOrder = {
  customer_name: 'Test Customer',
  customer_email: 'test@example.com',
  customer_phone: '555-123-4567',
  delivery_method: 'pickup',
  payment_method: 'card',
  items: [
    {
      menu_item_id: 1,
      id: 1,
      quantity: 2,
      price: 1299 // in cents
    },
    {
      menu_item_id: 3,
      id: 3,
      quantity: 1,
      price: 899 // in cents
    }
  ],
  subtotal: 3497, // in cents
  tax: 297, // in cents
  total_amount: 3794, // in cents
  notes: 'Test order from integration script'
};

// Test functions
async function testCreatePaymentIntent() {
  console.log('\n🔍 Testing payment intent creation...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/payment/create-intent`, {
      amount: sampleOrder.total_amount,
      metadata: {
        customer_name: sampleOrder.customer_name,
        customer_email: sampleOrder.customer_email
      }
    });
    
    if (response.data.success) {
      console.log('✅ Payment intent created successfully!');
      console.log(`   Client Secret: ${response.data.clientSecret.substring(0, 10)}...`);
      console.log(`   Payment Intent ID: ${response.data.paymentIntentId}`);
      return response.data;
    } else {
      console.error('❌ Failed to create payment intent:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating payment intent:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testDirectOrderCreation() {
  console.log('\n🔍 Testing direct order creation...');
  
  try {
    // Create a simplified order for testing
    const orderData = {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '555-123-4567',
      deliveryMethod: 'pickup',
      paymentMethod: 'cash', // Use cash to avoid payment intent creation
      items: [
        {
          id: 1,
          quantity: 1,
          price: 9.99, // in dollars
          notes: ''
        }
      ],
      subtotal: 9.99, // in dollars
      tax: 0.85, // in dollars
      total: 10.84, // in dollars
      total_amount: 1084, // in cents
      notes: 'Test cash order from integration script'
    };
    
    console.log('Sending order data:', JSON.stringify(orderData));
    const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
    
    if (response.data.success) {
      console.log('✅ Order created successfully!');
      console.log(`   Order ID: ${response.data.orderId}`);
      console.log(`   Order Number: ${response.data.orderNumber}`);
      return response.data;
    } else {
      console.error('❌ Failed to create order:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating order:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testCapturePayment(paymentIntentId) {
  console.log('\n🔍 Testing payment capture...');
  
  try {
    // First confirm the payment intent with Stripe directly to simulate a successful payment
    console.log('   Confirming payment intent with test card...');
    await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa'
    });
    
    console.log('   Payment intent confirmed, now capturing...');
    const response = await axios.post(`${API_BASE_URL}/payment/${paymentIntentId}/capture`);
    
    if (response.data.success) {
      console.log('✅ Payment captured successfully!');
      return response.data;
    } else {
      console.error('❌ Failed to capture payment:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error capturing payment:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testCancelPayment(paymentIntentId) {
  console.log('\n🔍 Testing payment cancellation...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/payment/${paymentIntentId}/cancel`);
    
    if (response.data.success) {
      console.log('✅ Payment cancelled successfully!');
      return response.data;
    } else {
      console.error('❌ Failed to cancel payment:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error cancelling payment:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testDirectStripeAPI() {
  console.log('\n🔍 Testing direct Stripe API access...');
  
  try {
    // Create a payment intent directly with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1999,
      currency: 'usd',
      capture_method: 'manual',
      payment_method_types: ['card'],
      metadata: {
        test: 'Direct API test'
      }
    });
    
    console.log('✅ Direct Stripe API call successful!');
    console.log(`   Payment Intent ID: ${paymentIntent.id}`);
    console.log(`   Client Secret: ${paymentIntent.client_secret.substring(0, 10)}...`);
    
    // Cancel the test payment intent
    const cancelled = await stripe.paymentIntents.cancel(paymentIntent.id);
    console.log('✅ Test payment intent cancelled.');
    
    return true;
  } catch (error) {
    console.error('❌ Error with direct Stripe API:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Stripe integration tests...');
  console.log('=======================================');
  
  // Test direct Stripe API access first to verify credentials
  await testDirectStripeAPI();
  
  // Test payment intent creation
  const paymentIntentResult = await testCreatePaymentIntent();
  
  if (paymentIntentResult) {
    const paymentIntentId = paymentIntentResult.paymentIntentId;
    
    // Test payment capture
    await testCapturePayment(paymentIntentId);
    
    // Create a new payment intent for cancellation test
    console.log('\n🔍 Creating a new payment intent for cancellation test...');
    const cancelTestIntent = await testCreatePaymentIntent();
    
    if (cancelTestIntent) {
      // Test payment cancellation
      await testCancelPayment(cancelTestIntent.paymentIntentId);
    }
  }
  
  // Test direct order creation (without payment intent)
  await testDirectOrderCreation();
  
  console.log('\n✨ Stripe integration tests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Unhandled error during tests:', error);
});
