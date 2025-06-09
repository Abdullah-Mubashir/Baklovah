# Baklovah Payment and Order Management Implementation Plan

## Overview

This document outlines the implementation plan for integrating Stripe payments and building a comprehensive order management system for the Baklovah restaurant website. The system will enable customers to place orders online, make payments, and track order status in real-time, while providing cashiers with tools to manage orders efficiently.

## System Components

### 1. Order Management System
- Order creation and storage
- Order tracking with unique IDs
- Order status management (both customer and cashier)(special ui for user and status for cashier)
- Real-time updates for customers (tracking order status complete button on cashier side)
- Cashier interface for managing orders (if need to add items on to a order)

### 2. Payment Processing
- Stripe integration for secure payments
- Deferred payment capture (authorize at order time, capture when ready)
- Receipt generation and email delivery ( we will capture and store the email along with id order in database)

### 3. Real-time Order Status Updates
- Socket.io integration for live updates
- Customer-facing order tracking interface (order status and estimated time)
- Cashier interface for updating order status under order management (order complete button and add items button)

## Database Schema Updates

### Orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NULL,  -- NULL for guest orders 
  order_number VARCHAR(20) NOT NULL, -- Unique, customer-facing order ID (e.g., "BAK12345")
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, ready, completed, cancelled
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_time TIMESTAMP NULL,
  estimated_time_minutes INTEGER DEFAULT 15,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, authorized, paid
  payment_intent_id VARCHAR(255) NULL,  -- Stripe payment intent ID
  customer_name VARCHAR(100) NULL,
  customer_email VARCHAR(100) NULL,
  customer_phone VARCHAR(20) NULL,
  customer_notes TEXT NULL,
  FOREIGN KEY(customer_id) REFERENCES users(id)
);

```
used for customer orders and cashier.

### Order Items Table
```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  item_notes TEXT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
);
```

### Order Status History Table
```sql
CREATE TABLE order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER NULL,  -- User ID of cashier/system
  notes TEXT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(updated_by) REFERENCES users(id)
);
```

## Implementation Phases

### Phase 1: Database and Core API Setup
1. Create database tables for orders, order items, and order status history
2. Develop RESTful API endpoints:
   - Create order
   - Get order details
   - Update order status
   - Get orders for customer
   - Get all orders for cashier
   - Cancel order

### Phase 2: Stripe Integration
1. Install and configure Stripe SDK 
   ```bash
   npm install stripe
   ```
2. Create environment variables for Stripe API keys
   ```
   STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Implement payment intent creation upon order placement
4. Set up client-side payment form using Stripe Elements
5. Configure payment confirmation and error handling
6. Implement payment capture when order is completed

### Phase 3: Cashier Order Management Interface
1. Create order list view with filters:
   - All orders
   - Pending orders
   - Processing orders
   - Ready for pickup
   - Completed orders
2. Implement order detail view:
   - Order information
   - Customer details
   - Order items
   - Payment status
   - Status update controls
3. Add functionality for:
   - Updating order status
   - Adjusting estimated preparation time
   - Adding notes to orders
   - Printing receipts

### Phase 4: Customer Order Tracking Interface
1. Create order confirmation page
2. Develop order tracking page with:
   - Order details
   - Real-time status updates
   - Estimated completion time
   - Receipt download option
3. Implement email notifications for:
   - Order confirmation
   - Payment confirmation
   - Status updates
   - Order ready notification

### Phase 5: Real-time Updates with Socket.io
1. Set up Socket.io server
   ```bash
   npm install socket.io
   ```
2. Create events for:
   - Order status changes
   - Estimated time updates
   - New order notifications for cashiers
3. Implement Socket.io client for customer order tracking
4. Implement Socket.io client for cashier interface

## Detailed Implementation

### Order Flow
1. **Customer places order**:
   - Items are added to cart
   - Customer enters contact information
   - System generates unique order number (e.g., "BAK12345")
   - Order is created with "pending" status
   - Payment intent is created with Stripe (status: authorized)
   - Order confirmation is sent to customer

2. **Cashier receives order**:
   - New order notification appears in cashier interface
   - Cashier reviews order details
   - Cashier accepts order (status: "processing")
   - Cashier sets/updates estimated preparation time

3. **Order preparation**:
   - Kitchen prepares the order
   - Cashier updates status when ready (status: "ready")
   - Customer receives notification that order is ready

4. **Order completion**:
   - Customer collects order
   - Cashier marks order as completed (status: "completed")
   - Payment is captured through Stripe
   - Receipt is generated and sent to customer

### Stripe Payment Implementation
1. **Authorization at order time**:
   ```javascript
   // Server-side code
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   
   async function createPaymentIntent(amount, customerId) {
     const paymentIntent = await stripe.paymentIntents.create({
       amount: amount * 100, // Amount in cents
       currency: 'usd',
       customer: customerId,
       capture_method: 'manual', // This defers the payment capture
     });
     return paymentIntent;
   }
   ```

2. **Client-side payment form**:
   ```javascript
   // Initialize Stripe
   const stripe = Stripe(process.env.STRIPE_PUBLIC_KEY);
   const elements = stripe.elements();
   
   // Create card element
   const card = elements.create('card');
   card.mount('#card-element');
   
   // Handle form submission
   const form = document.getElementById('payment-form');
   form.addEventListener('submit', async (event) => {
     event.preventDefault();
     
     // Confirm the payment intent
     const { error, paymentIntent } = await stripe.confirmCardPayment(
       clientSecret,
       {
         payment_method: {
           card: card,
           billing_details: {
             name: document.getElementById('customer-name').value,
           },
         },
       }
     );
     
     if (error) {
       // Show error message
     } else {
       // Show success message and redirect to order tracking page
     }
   });
   ```

3. **Capture payment when order is completed**:
   ```javascript
   // Server-side code
   async function capturePayment(paymentIntentId) {
     try {
       const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
       return { success: true, paymentIntent };
     } catch (error) {
       return { success: false, error };
     }
   }
   ```

### Socket.io Integration for Real-time Updates

1. **Server setup**:
   ```javascript
   // In server.js
   const http = require('http').createServer(app);
   const io = require('socket.io')(http);
   
   io.on('connection', (socket) => {
     console.log('New client connected');
     
     // Join order-specific room for updates
     socket.on('join-order-room', (orderNumber) => {
       socket.join(`order-${orderNumber}`);
     });
     
     // Join cashier room for all cashiers
     socket.on('join-cashier-room', (userId) => {
       socket.join('cashier-room');
     });
     
     socket.on('disconnect', () => {
       console.log('Client disconnected');
     });
   });
   
   // Export io to be used in other files
   module.exports = { io };
   ```

2. **Emitting order updates**:
   ```javascript
   // In orderController.js
   const { io } = require('../server');
   
   async function updateOrderStatus(orderId, status, estimatedTime) {
     // Update database
     await db.query('UPDATE orders SET status = ?, estimated_time_minutes = ? WHERE id = ?', 
       [status, estimatedTime, orderId]);
     
     // Get order details
     const order = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
     
     // Emit to specific order room
     io.to(`order-${order.order_number}`).emit('order-status-update', {
       status,
       estimatedTime,
       updatedAt: new Date()
     });
     
     // Also emit to cashier room for all cashiers to see updates
     io.to('cashier-room').emit('order-updated', {
       orderNumber: order.order_number,
       status,
       estimatedTime
     });
     
     return order;
   }
   ```

3. **Client-side listener (Customer)**:
   ```javascript
   // In order-tracking.js
   const socket = io();
   
   // Join the specific room for this order
   const orderNumber = document.getElementById('order-number').textContent;
   socket.emit('join-order-room', orderNumber);
   
   // Listen for status updates
   socket.on('order-status-update', (data) => {
     // Update status display
     document.getElementById('order-status').textContent = data.status;
     document.getElementById('estimated-time').textContent = data.estimatedTime;
     
     // Update progress bar
     updateProgressBar(data.status);
     
     // Show notification
     showNotification(`Your order is now ${data.status}`);
   });
   ```

4. **Client-side listener (Cashier)**:
   ```javascript
   // In cashier-dashboard.js
   const socket = io();
   
   // Join the cashier room
   socket.emit('join-cashier-room', currentUserId);
   
   // Listen for new orders
   socket.on('new-order', (order) => {
     // Add new order to the list
     addOrderToList(order);
     
     // Show notification
     showNotification('New order received', `Order #${order.orderNumber}`);
     
     // Play sound alert
     playNewOrderSound();
   });
   ```

## API Endpoints

### Customer-facing Endpoints
- `POST /api/orders` - Create a new order
- `GET /api/orders/:orderNumber` - Get order details
- `POST /api/orders/:orderNumber/pay` - Process payment for an order
- `GET /api/orders/:orderNumber/track` - Get real-time order tracking

### Cashier Endpoints
- `GET /api/cashier/orders` - Get all orders with filtering options
- `GET /api/cashier/orders/:orderNumber` - Get detailed order information
- `PATCH /api/cashier/orders/:orderNumber/status` - Update order status
- `PATCH /api/cashier/orders/:orderNumber/time` - Update estimated time
- `POST /api/cashier/orders/:orderNumber/complete` - Mark order as completed and capture payment

## Frontend Views

### Customer Views
1. **Order Checkout Page**:
   - Review cart items
   - Enter customer information
   - Payment form with Stripe Elements
   - Order submission button

2. **Order Confirmation Page**:
   - Order summary
   - Order number
   - Estimated preparation time
   - Link to tracking page

3. **Order Tracking Page**:
   - Real-time status updates
   - Progress bar visualization
   - Estimated completion time countdown
   - Notifications for status changes

### Cashier Views
1. **Order List View**:
   - Filterable list of orders
   - Quick status indicators
   - Order number, time, and total
   - Sort by time/status

2. **Order Detail View**:
   - Complete order information
   - Customer details
   - Item list with quantities and notes
   - Payment status
   - Controls for updating status and time

3. **Dashboard Overview**:
   - Count of orders by status
   - Recent order history
   - Performance metrics (average preparation time)

## Security Considerations

1. **Payment Security**:
   - Use Stripe.js to prevent card data from touching your server
   - Implement proper error handling for failed payments
   - Use webhooks to ensure payment state consistency
   - Store only payment references, never actual card details

2. **API Security**:
   - Implement proper authentication for all cashier endpoints
   - Validate order ownership for customer endpoints
   - Rate-limit API calls to prevent abuse
   - Validate all input data

3. **Socket Security**:
   - Authenticate socket connections
   - Validate room joins to prevent unauthorized access
   - Use private channels for sensitive information

## Testing Strategy

1. **Unit Testing**:
   - Test order creation logic
   - Test payment processing functions
   - Test status update functions

2. **Integration Testing**:
   - Test order flow from creation to completion
   - Test payment flow from authorization to capture
   - Test Socket.io event propagation

3. **End-to-End Testing**:
   - Test complete customer journey
   - Test cashier order management workflow
   - Test real-time updates between interfaces

## Deployment Considerations

1. **Environment Setup**:
   - Configure production environment variables
   - Set up Stripe webhook endpoints
   - Configure production database with proper indexing

2. **Scaling**:
   - Implement proper connection pooling for database
   - Consider Redis for Socket.io in multi-server setups
   - Set up monitoring for order processing

3. **Backup and Recovery**:
   - Implement regular database backups
   - Create procedure for payment reconciliation
   - Document recovery steps for system failure

## Next Steps and Timeline

### Week 1: Database and Core Backend
- Set up database schema
- Implement order creation API
- Create order management functions

### Week 2: Stripe Integration
- Set up Stripe account and API keys
- Implement payment intent creation
- Create client-side payment form

### Week 3: Cashier Interface
- Build order list view
- Implement order detail view
- Create order status update functions

### Week 4: Customer Interface
- Design and implement checkout flow
- Create order tracking page
- Set up email notifications

### Week 5: Real-time Updates
- Implement Socket.io integration
- Set up real-time status updates
- Test end-to-end functionality

### Week 6: Testing and Deployment
- Conduct comprehensive testing
- Fix bugs and issues
- Deploy to production environment
