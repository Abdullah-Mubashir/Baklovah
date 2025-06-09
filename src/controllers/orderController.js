/**
 * Order Controller
 * Handles all operations related to customer orders
 */

const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const { pool } = require('../config/database');

/**
 * Get all orders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllOrders(req, res) {
  try {
    // Get query parameters for filtering
    const { status } = req.query;
    
    // Base query
    let query = 'SELECT * FROM orders';
    const queryParams = [];
    
    // Add filters if provided
    if (status) {
      query += ' WHERE status = ?';
      queryParams.push(status);
    }
    
    // Add sorting
    query += ' ORDER BY order_time DESC';
    
    // Execute query
    const [rows] = await pool.execute(query, queryParams);
    
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
}

/**
 * Get a single order by ID with its items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getOrderById(req, res) {
  const { id } = req.params;
  
  try {
    // Get order details
    const [orderRows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Get order items
    const [itemRows] = await pool.execute(
      `SELECT oi.*, mi.title, mi.description, mi.image_url, mi.category 
       FROM order_items oi 
       JOIN menu_items mi ON oi.menu_item_id = mi.id 
       WHERE oi.order_id = ?`,
      [id]
    );
    
    // Combine order with its items
    const order = {
      ...orderRows[0],
      items: itemRows
    };
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
}

/**
 * Create a new order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createOrder(req, res) {
  try {
    console.log('Order controller received order:', JSON.stringify(req.body));
    
    const { 
      customer_name, 
      customer_email, 
      customer_phone, 
      delivery_method, 
      delivery_address, 
      payment_method, 
      items, 
      total_amount, 
      subtotal, 
      tax, 
      delivery_fee, 
      discount, 
      notes,
      paymentIntentId  // This might be provided if card payment was processed already
    } = req.body;
    
    // Validate required fields with detailed error reporting
    if (!items) {
      console.error('Missing items in order data');
      return res.status(400).json({
        success: false,
        message: 'Please provide order items'
      });
    }
    
    if (!Array.isArray(items)) {
      console.error('Items is not an array:', typeof items);
      return res.status(400).json({
        success: false,
        message: 'Order items must be an array'
      });
    }
    
    if (items.length === 0) {
      console.error('Items array is empty');
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }
    
    // Validate or calculate total amount
    let calculatedTotalAmount = total_amount;
    if (total_amount === undefined || total_amount === null) {
      console.log('Total amount not provided, attempting to calculate from subtotal and tax');
      if (subtotal !== undefined && tax !== undefined) {
        const subTotal = parseFloat(subtotal) || 0;
        const taxAmount = parseFloat(tax) || 0;
        const deliveryAmount = parseFloat(delivery_fee) || 0;
        calculatedTotalAmount = subTotal + taxAmount + deliveryAmount;
        console.log('Calculated total amount:', calculatedTotalAmount);
      } else {
        // Calculate from items if possible
        if (items && Array.isArray(items) && items.length > 0) {
          let itemsTotal = 0;
          items.forEach(item => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            itemsTotal += price * quantity;
          });
          console.log('Calculated total from items:', itemsTotal);
          calculatedTotalAmount = itemsTotal;
        } else {
          console.error('Cannot calculate total amount - no items or subtotal/tax provided');
          return res.status(400).json({
            success: false,
            message: 'Please provide total amount or items with prices for the order'
          });
        }
      }
    }
    
    // Ensure all monetary values are numbers and convert from cents to dollars
    const validatedTotalAmount = parseFloat(calculatedTotalAmount) || 0;
    const validatedSubtotal = parseFloat(subtotal) || 0;
    const validatedTax = parseFloat(tax) || 0;
    const validatedDeliveryFee = parseFloat(delivery_fee) || 0;
    
    console.log('Monetary values (in cents):', {
      total_amount: validatedTotalAmount,
      subtotal: validatedSubtotal,
      tax: validatedTax,
      delivery_fee: validatedDeliveryFee
    });
    
    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Invalid items array:', items);
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one item for the order'
      });
    }

    // Create order data object with proper type conversion and defaults
    const orderData = {
      customerName: customer_name || 'Guest',
      customerEmail: customer_email || '',
      customerPhone: customer_phone || '',
      deliveryMethod: delivery_method || 'pickup',
      deliveryAddress: delivery_address || {},
      paymentMethod: payment_method || 'cash',
      items: items.map(item => {
        console.log('Processing order item:', item);
        if (!item) return null; // Skip null items
        return {
          id: item.menu_item_id || item.id,  // Support both formats
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0.00,  // Default to 0 if not provided
          notes: item.notes || item.item_notes || ''
        };
      }).filter(item => item !== null), // Remove any null items
      subtotal: validatedSubtotal / 100,  // Convert from cents to dollars
      tax: validatedTax / 100,
      total: validatedTotalAmount / 100, // Convert from cents to dollars
      deliveryFee: validatedDeliveryFee / 100,
      notes: notes || '',
      paymentIntentId: paymentIntentId || null // If card payment was processed
    };
    
    console.log('Processed order data for service:', orderData);
    
    // Use order service to create the order
    const result = await orderService.createOrder(orderData);
    
    // Notify connected clients about new order
    if (req.io) {
      req.io.emit('newOrder', { orderId: result.orderId });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId: result.orderId,
      orderNumber: result.orderNumber
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating order'
    });
  }
}

/**
 * Update order status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status, time_remaining } = req.body;
  
  // Validate status
  const validStatuses = ['pending', 'processing', 'ready', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status value'
    });
  }
  
  try {
    // Check if order exists
    const [checkRows] = await pool.execute(
      'SELECT id, order_number, status, payment_method, payment_status, payment_intent_id FROM orders WHERE id = ?',
      [id]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = checkRows[0];
    
    // Handle payment capture for completed orders with card payment
    if (status === 'completed' && order.payment_method === 'card' && 
        order.payment_status === 'authorized' && order.payment_intent_id) {
      try {
        // Capture the payment
        const capturedPayment = await paymentService.capturePaymentIntent(order.payment_intent_id);
        
        if (capturedPayment && capturedPayment.status === 'succeeded') {
          // Update payment status to paid
          await pool.execute(
            'UPDATE orders SET payment_status = ? WHERE id = ?',
            ['paid', id]
          );
          
          console.log(`Payment captured for order #${order.order_number}`);
        } else {
          console.error(`Failed to capture payment for order #${order.order_number}`);
        }
      } catch (paymentError) {
        console.error(`Error capturing payment for order #${order.order_number}:`, paymentError);
        // Continue with order status update even if payment capture fails
        // We'll handle payment issues separately
      }
    }
    
    // Handle payment cancellation for cancelled orders with card payment
    if (status === 'cancelled' && order.payment_method === 'card' && 
        order.payment_status === 'authorized' && order.payment_intent_id) {
      try {
        // Cancel the payment intent
        const cancelledPayment = await paymentService.cancelPaymentIntent(order.payment_intent_id);
        
        if (cancelledPayment && cancelledPayment.status === 'canceled') {
          // Update payment status to cancelled
          await pool.execute(
            'UPDATE orders SET payment_status = ? WHERE id = ?',
            ['cancelled', id]
          );
          
          console.log(`Payment cancelled for order #${order.order_number}`);
        } else {
          console.error(`Failed to cancel payment for order #${order.order_number}`);
        }
      } catch (paymentError) {
        console.error(`Error cancelling payment for order #${order.order_number}:`, paymentError);
        // Continue with order status update even if payment cancellation fails
      }
    }
    
    // Update order status
    await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    // Add entry to order status history
    await pool.execute(
      'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
      [id, status, `Order status updated to ${status}`]
    );
    
    // If time_remaining is provided, update it
    if (time_remaining !== undefined) {
      await pool.execute(
        'UPDATE orders SET time_remaining = ? WHERE id = ?',
        [time_remaining, id]
      );
    }
    
    // Get updated order
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    // Emit order update event
    if (req.io) {
      req.io.to(`order_${id}`).emit('orderUpdate', rows[0]);
      
      // Also emit to cashier room for all cashiers to see updates
      req.io.to('cashier_room').emit('orderStatusUpdate', {
        orderId: id,
        orderNumber: order.order_number,
        status: status
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating order'
    });
  }
}

/**
 * Update payment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updatePaymentStatus(req, res) {
  const { id } = req.params;
  const { payment_status } = req.body;
  
  // Validate status
  const validStatuses = ['pending', 'paid', 'failed'];
  if (!payment_status || !validStatuses.includes(payment_status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment status value'
    });
  }
  
  try {
    // Check if order exists
    const [checkRows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update payment status
    await pool.execute(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [payment_status, id]
    );
    
    // Get updated order
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating payment status'
    });
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus
};
