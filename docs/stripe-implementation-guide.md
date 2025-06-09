# Stripe Payment Integration Implementation Guide

## Overview

This guide provides detailed instructions for implementing, testing, and maintaining the Stripe payment integration in the Baklovah restaurant website. The integration follows a deferred payment capture model, where payments are authorized at order time but only captured when the order is completed.

## Implementation Status

The Stripe payment integration has been successfully implemented with the following components:

1. **Payment Controller**: Enhanced to handle payment intents, capture, cancellation, and webhook events
2. **Order Controller**: Updated to automatically handle payment capture/cancellation based on order status changes
3. **Cashier Interface**: Enhanced with payment information display and action buttons
4. **Database Schema**: Updated to store payment-related information

## Testing the Integration

### Prerequisites

- Node.js and npm installed
- Stripe account with API keys configured in `.env` file
- Running Baklovah restaurant website server

### Test Script

A test script (`test-stripe-integration.js`) is provided to verify the payment integration. It tests:

1. Creating a payment intent
2. Confirming a payment
3. Capturing a payment
4. Cancelling a payment
5. Creating an order with payment information

To run the test:
```
node test-stripe-integration.js
```

### Manual Testing

For manual testing, follow these steps:

1. **Customer Flow**:
   - Add items to cart on the customer interface
   - Proceed to checkout
   - Select "Card" as payment method
   - Enter test card details (4242 4242 4242 4242)
   - Complete order

2. **Cashier Flow**:
   - Log in to cashier interface
   - View the new order with "Authorized" payment status
   - Process the order through its lifecycle
   - Mark as "Completed" to capture the payment
   - Verify payment status changes to "Paid"

3. **Cancellation Flow**:
   - Create a new order with card payment
   - In cashier interface, mark the order as "Cancelled"
   - Verify payment status changes to "Cancelled"

## Troubleshooting

### Common Issues

1. **Payment Intent Creation Fails**
   - Check Stripe API keys in `.env` file
   - Verify amount is a positive integer in cents
   - Check Stripe dashboard for error messages

2. **Payment Capture Fails**
   - Ensure the payment intent is in an authorized state
   - Verify the payment intent ID is correct
   - Check if the payment intent has already been captured or cancelled

3. **Webhook Events Not Processing**
   - Verify webhook secret in `.env` file
   - Ensure raw body parsing is enabled for webhook endpoint
   - Use Stripe CLI to test webhook locally: `stripe listen --forward-to localhost:3001/api/payment/webhook`

4. **Order Creation Issues**
   - Check order data format matches expected format in orderController
   - Ensure monetary values are in the correct format (cents vs dollars)
   - Verify items array is properly formatted

### Debugging Tools

1. **Stripe Dashboard**:
   - View payment intents, events, and logs
   - Test webhook deliveries
   - Monitor payment status

2. **Server Logs**:
   - Check for error messages in console
   - Review webhook event handling logs
   - Monitor payment intent creation/capture/cancellation logs

3. **Browser Developer Tools**:
   - Check network requests for API calls
   - Monitor JavaScript console for errors
   - Inspect payment form elements

## Production Considerations

### Security

1. **API Keys**:
   - Use test keys in development
   - Securely store production keys in environment variables
   - Never expose secret key in client-side code

2. **Webhook Signatures**:
   - Always verify webhook signatures
   - Rotate webhook secrets periodically
   - Monitor for suspicious webhook events

3. **PCI Compliance**:
   - Use Stripe Elements to collect card data
   - Never store card details on your server
   - Follow Stripe's security recommendations

### Performance

1. **Webhook Processing**:
   - Return 200 response quickly, even if processing takes time
   - Use background jobs for heavy processing
   - Implement idempotency to handle duplicate webhook events

2. **Error Handling**:
   - Gracefully handle payment failures
   - Provide clear error messages to customers
   - Log detailed error information for debugging

### Maintenance

1. **Stripe API Updates**:
   - Monitor Stripe API changelog
   - Test integration after Stripe SDK updates
   - Plan for API version migrations

2. **Testing**:
   - Regularly test payment flows with test cards
   - Verify webhook handling with Stripe CLI
   - Test error scenarios (declined cards, network issues)

## Next Steps

1. **Email Notifications**:
   - Implement email notifications for payment success/failure
   - Send receipts after successful payment capture

2. **Refund Functionality**:
   - Add API endpoint for refunding payments
   - Update cashier interface with refund button
   - Implement refund confirmation dialog

3. **Payment Analytics**:
   - Track payment conversion rates
   - Monitor payment failures
   - Analyze payment method usage

4. **Additional Payment Methods**:
   - Implement Apple Pay and Google Pay
   - Add support for other payment methods
   - Test with international payment methods

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)
