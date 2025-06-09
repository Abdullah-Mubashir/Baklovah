# Stripe Payment Integration Documentation

## Overview

This document outlines the implementation of Stripe payment processing in the Baklovah restaurant website. The integration follows a deferred payment capture model, where payments are authorized at order time but only captured when the order is completed.

## Architecture

The payment flow consists of the following components:

1. **Client-side Integration** - Handles payment method collection and payment confirmation
2. **Server-side API** - Creates payment intents, captures payments, and handles webhooks
3. **Cashier Interface** - Manages orders and triggers payment capture
4. **Database** - Stores order and payment information

## Payment Flow

### Customer Order Flow

1. Customer adds items to cart
2. Customer enters delivery information and selects payment method (card or cash)
3. If card is selected:
   - Stripe Elements collects card information
   - Payment intent is created on the server with `capture_method: 'manual'`
   - Card is authorized but not charged
   - Payment status is set to `authorized`
4. If cash is selected:
   - Payment status is set to `unpaid`
5. Order is created in the database with payment information
6. Customer is redirected to order confirmation page

### Cashier Order Management Flow

1. Cashier views incoming orders in the cashier interface
2. Cashier processes the order (preparing, ready, etc.)
3. When the order is marked as "completed":
   - For card payments: The payment is automatically captured
   - Payment status is updated to `paid`
4. If the order is cancelled:
   - For card payments: The payment authorization is cancelled
   - Payment status is updated to `cancelled`

### Payment Status Lifecycle

- `unpaid` - Initial state for cash payments
- `authorized` - Card payment has been authorized but not captured
- `paid` - Payment has been successfully captured
- `failed` - Payment authorization or capture failed
- `cancelled` - Payment authorization was cancelled

## Implementation Details

### Client-side Integration

The client-side integration is implemented in `/public/js/customer/payment.js` and includes:

- Stripe Elements initialization
- Payment method selection handling
- Payment intent creation via API
- Card payment confirmation
- Order submission with payment information

Key functions:
- `initializeStripe()` - Sets up Stripe Elements
- `handlePaymentMethodChange()` - Shows/hides card form based on payment method
- `handlePlaceOrder()` - Processes payment and submits order
- `processPayment()` - Creates payment intent and confirms card payment

### Server-side API

The server-side API is implemented in:

- `/src/controllers/paymentController.js` - Handles payment operations
- `/src/controllers/orderController.js` - Handles order operations with payment integration
- `/src/services/paymentService.js` - Wraps Stripe SDK calls

Key endpoints:
- `POST /api/payment/create-intent` - Creates a new payment intent
- `POST /api/payment/:paymentIntentId/capture` - Captures an authorized payment
- `POST /api/payment/:paymentIntentId/cancel` - Cancels an authorized payment
- `POST /api/payment/webhook` - Handles Stripe webhook events
- `POST /api/orders` - Creates a new order with payment information
- `PATCH /api/orders/:id/status` - Updates order status and handles payment capture/cancellation

### Cashier Interface

The cashier interface is implemented in `/src/views/cashier/orders.ejs` and includes:

- Order listing with payment status
- Order details with payment information
- Payment action buttons for capturing payments
- Order status updates that trigger payment actions

Key functions:
- `displayOrderDetails()` - Shows order details with payment information
- `setupPaymentActionButton()` - Configures payment action button based on payment status
- `capturePayment()` - Manually captures a payment
- `updateOrderStatusFromModal()` - Updates order status and handles payment actions

### Webhook Handling

Stripe webhooks are used to handle asynchronous payment events:

- `payment_intent.succeeded` - Updates order payment status to `paid`
- `payment_intent.payment_failed` - Updates order payment status to `failed`
- `payment_intent.canceled` - Updates order payment status to `cancelled`

The webhook endpoint is configured in `server.js` with a special raw body parser for signature verification.

## Database Schema

The payment integration uses the following database fields:

**orders table:**
- `payment_method` - Payment method (card, cash)
- `payment_status` - Current payment status
- `payment_intent_id` - Stripe payment intent ID for card payments

**order_status_history table:**
- Records status changes including payment-related status updates

## Environment Variables

The following environment variables are required:

- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key for client-side
- `STRIPE_WEBHOOK_SECRET` - Secret for verifying webhook signatures

## Testing

A test script (`test-stripe-integration.js`) is provided to verify the payment integration. It tests:

1. Creating a payment intent
2. Creating an order with the payment intent
3. Capturing a payment
4. Cancelling a payment

To run the test:
```
node test-stripe-integration.js
```

## Stripe Test Cards

For testing purposes, use the following test card numbers:

- **Success**: 4242 4242 4242 4242
- **Authentication Required**: 4000 0025 0000 3155
- **Payment Declined**: 4000 0000 0000 0002

## Troubleshooting

Common issues and solutions:

1. **Payment intent creation fails**
   - Check Stripe API keys
   - Verify amount is a positive integer in cents

2. **Webhook events not being processed**
   - Verify webhook secret
   - Check that the webhook endpoint is accessible
   - Ensure raw body parsing is enabled for the webhook endpoint

3. **Payment capture fails**
   - Verify the payment intent is in an authorized state
   - Check that the payment intent ID is correct

4. **Real-time updates not working**
   - Verify Socket.io connections
   - Check event emission in controllers

## Security Considerations

1. **PCI Compliance**
   - Stripe Elements handles card data to maintain PCI compliance
   - Card details never touch our server

2. **Webhook Signatures**
   - All webhook events are verified using signatures
   - Prevents webhook event forgery

3. **API Keys**
   - Secret key is only used server-side
   - Publishable key is used client-side

4. **Authorization**
   - Payment capture endpoints require authentication
   - Only cashiers and admins can capture payments

## Future Enhancements

1. **Refunds** - Implement refund functionality
2. **Saved Payment Methods** - Allow customers to save payment methods
3. **Subscription Payments** - For recurring orders or loyalty programs
4. **Multiple Payment Methods** - Support for Apple Pay, Google Pay, etc.
5. **Payment Analytics** - Track payment conversion rates and failures
