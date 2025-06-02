/**
 * Order Controller
 * Handles all operations related to customer orders
 */

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
  const { customer_name, customer_email, customer_phone, items, total_amount, notes } = req.body;
  
  // Validate required fields
  if (!items || !Array.isArray(items) || items.length === 0 || !total_amount) {
    return res.status(400).json({
      success: false,
      message: 'Please provide items and total amount'
    });
  }
  
  // Start a transaction
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Insert order
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (customer_name, customer_email, customer_phone, total_amount, notes) VALUES (?, ?, ?, ?, ?)',
      [customer_name, customer_email, customer_phone, total_amount, notes]
    );
    
    const orderId = orderResult.insertId;
    
    // Insert order items and update analytics
    for (const item of items) {
      // Validate item data
      if (!item.menu_item_id || !item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Each item must have menu_item_id and quantity'
        });
      }
      
      // Get current price of menu item
      const [menuItemRows] = await connection.execute(
        'SELECT price FROM menu_items WHERE id = ?',
        [item.menu_item_id]
      );
      
      if (menuItemRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Menu item with ID ${item.menu_item_id} not found`
        });
      }
      
      const itemPrice = menuItemRows[0].price;
      
      // Insert order item
      await connection.execute(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, item_price, notes) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.menu_item_id, item.quantity, itemPrice, item.notes || null]
      );
      
      // Update analytics (increment purchases)
      await connection.execute(
        'UPDATE item_analytics SET purchases = purchases + ? WHERE menu_item_id = ?',
        [item.quantity, item.menu_item_id]
      );
    }
    
    // Commit transaction
    await connection.commit();
    
    // Notify connected clients about new order
    if (req.io) {
      req.io.emit('newOrder', { orderId });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) await connection.rollback();
    
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  } finally {
    if (connection) connection.release();
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
  const validStatuses = ['placed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status value'
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
    
    // Update order
    let query = 'UPDATE orders SET ';
    const queryParams = [];
    
    if (status) {
      query += 'status = ?, ';
      queryParams.push(status);
    }
    
    if (time_remaining !== undefined) {
      query += 'time_remaining = ?, ';
      queryParams.push(time_remaining);
    }
    
    // Remove trailing comma and space
    query = query.slice(0, -2);
    
    query += ' WHERE id = ?';
    queryParams.push(id);
    
    await pool.execute(query, queryParams);
    
    // Get updated order
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    // Emit order update event
    if (req.io) {
      req.io.to(`order_${id}`).emit('orderUpdate', rows[0]);
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
