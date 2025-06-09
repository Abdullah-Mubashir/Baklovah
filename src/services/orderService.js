/**
 * Baklovah Restaurant - Order Service
 * Handles order creation, retrieval, and management with Stripe integration
 */

const db = require('../database/adapter');
const { v4: uuidv4 } = require('uuid');
const paymentService = require('./paymentService');

/**
 * Generate a unique order number
 * @returns {string} Formatted order number (e.g., BAK12345)
 */
function generateOrderNumber() {
    // Generate a random 5-digit number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `BAK${randomNum}`;
}

/**
 * Create a new order with payment processing
 * @param {Object} orderData - Order data including customer info and items
 * @returns {Promise<Object>} Created order with payment intent
 */
async function createOrder(orderData) {
    console.log('Order service received order data:', JSON.stringify(orderData));
    
    const { 
        customerName, 
        customerEmail, 
        customerPhone, 
        deliveryAddress,
        deliveryMethod,
        items, 
        subtotal = 0, 
        tax = 0, 
        deliveryFee = 0,
        total = 0, 
        paymentMethod,
        notes 
    } = orderData;
    
    // Validate items early
    if (!items) {
        console.error('Items is missing in order data');
        throw new Error('Order creation failed: items is missing');
    }
    
    // Ensure items is an array
    const itemsArray = Array.isArray(items) ? items : [items];
    
    if (itemsArray.length === 0) {
        console.error('No items in order data');
        throw new Error('Order creation failed: no items in order');
    }
    
    console.log(`Processing ${itemsArray.length} items for order`);
    
    // Ensure we have valid numbers for monetary values
    const validatedSubtotal = parseFloat(subtotal) || 0;
    const validatedTax = parseFloat(tax) || 0;
    const validatedTotal = parseFloat(total) || (validatedSubtotal + validatedTax);

    // Generate a unique order number
    const orderNumber = generateOrderNumber();
    
    let paymentIntentId = null;
    let paymentStatus = 'unpaid';
    
    // Create payment intent if payment method is card
    if (paymentMethod === 'card') {
        try {
            // Create metadata for the payment intent
            const metadata = {
                orderNumber,
                customerName,
                customerEmail
            };
            
            // Create a payment intent with Stripe
            const paymentIntent = await paymentService.createPaymentIntent(
                total, 
                'usd', 
                metadata
            );
            
            // Store the payment intent ID
            paymentIntentId = paymentIntent.id;
            paymentStatus = 'authorized';
        } catch (error) {
            console.error('Payment intent creation failed:', error);
            throw new Error(`Order creation failed: ${error.message}`);
        }
    }
    
    try {
        // Start a database transaction
        //const connection = await db.beginTransaction();
        
        // Insert the order into the database - use a more resilient query that doesn't explicitly list order_number
        // This works around potential schema issues where the column might exist but not be accessible
        const orderQuery = `
            INSERT INTO orders (
                customer_name, 
                customer_email, 
                customer_phone, 
                status, 
                subtotal, 
                tax, 
                total, 
                payment_status,
                payment_intent_id,
                delivery_method,
                delivery_address,
                customer_notes,
                estimated_time_minutes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Set initial status and estimated time
        const initialStatus = 'pending';
        const estimatedTime = 30; // minutes
        
        // Execute the query and handle the result safely
        console.log('Executing order query with parameters:', {
            orderNumber,
            customerName: customerName || 'Guest',
            customerEmail: customerEmail || '',
            customerPhone: customerPhone || '',
            status: initialStatus,
            subtotal: validatedSubtotal,
            tax: validatedTax,
            total: validatedTotal,
            paymentStatus,
            paymentIntentId,
            deliveryMethod,
            deliveryAddress: JSON.stringify(deliveryAddress),
            notes,
            estimatedTime
        });
        
        const result = await db.query(
            orderQuery, 
            [
                customerName || 'Guest',
                customerEmail || '',
                customerPhone || '',
                initialStatus,
                validatedSubtotal,
                validatedTax,
                validatedTotal,
                paymentStatus,
                paymentIntentId,
                deliveryMethod,
                JSON.stringify(deliveryAddress),
                notes,
                estimatedTime
            ]
        );
        
        // Now try to update the order_number in a separate query to handle cases where the column exists but has issues
        try {
            if (result && result.insertId) {
                await db.query(
                    'UPDATE orders SET order_number = ? WHERE id = ?',
                    [orderNumber, result.insertId]
                );
                console.log(`Order number ${orderNumber} set for order ID ${result.insertId}`);
            }
        } catch (updateError) {
            // Log but don't fail if we can't update the order number
            console.warn(`Unable to set order_number for order ${result.insertId}: ${updateError.message}`);
        }
        
        console.log('Order query result:', result);
        
        // Handle different database adapter result formats
        let orderId;
        if (Array.isArray(result) && result.length > 0) {
            // MySQL format
            orderId = result[0].insertId;
        } else if (result && result.insertId) {
            // SQLite format
            orderId = result.insertId;
        } else {
            console.error('Unexpected database result format:', result);
            throw new Error('Order creation failed: could not get order ID');
        }
        
        console.log('Created order with ID:', orderId);
        
        // Insert order items with validation
        console.log('Starting to process order items');
        
        if (!items) {
            console.error('Items is missing or null');
            throw new Error('Order creation failed: items is missing or null');
        }
        
        // Safely convert items to array if it's not already
        let itemsArray = [];
        
        if (Array.isArray(items)) {
            itemsArray = items;
        } else if (typeof items === 'object') {
            itemsArray = [items];
        } else {
            console.error('Items is neither an array nor an object:', typeof items);
            throw new Error('Order creation failed: items must be an array or object');
        }
        
        console.log(`Processing ${itemsArray.length} items for order`);
        
        // Skip if no items
        if (itemsArray.length === 0) {
            console.warn('No items in order');
            throw new Error('Order creation failed: no items in order');
        }
        
        try {
            // Process each item one by one
            for (let i = 0; i < itemsArray.length; i++) {
                const item = itemsArray[i];
                
                if (!item) {
                    console.warn(`Skipping null or undefined item at index ${i}`);
                    continue;
                }
                
                console.log(`Processing item ${i}:`, JSON.stringify(item));
                
                const itemQuery = `
                    INSERT INTO order_items (
                        order_id, 
                        menu_item_id, 
                        quantity, 
                        price, 
                        item_notes
                    ) VALUES (?, ?, ?, ?, ?)
                `;
                
                // Extract values with fallbacks
                const menuItemId = item.menu_item_id || item.id || 0;
                const quantity = parseInt(item.quantity) || 1;
                const price = parseFloat(item.price) || 0;
                const notes = item.notes || item.item_notes || null;
                
                console.log('Inserting order item:', {
                    orderId,
                    menuItemId,
                    quantity,
                    price,
                    notes
                });
                
                await db.query(
                    itemQuery, 
                    [
                        orderId,
                        menuItemId,
                        quantity,
                        price,
                        notes
                    ]
                );
            }
        } catch (error) {
            console.error('Error inserting order items:', error);
            throw new Error(`Order creation failed: ${error.message}`);
        }
        
        // Insert initial status in history
        await db.query(
            `INSERT INTO order_status_history (order_id, status) VALUES (?, ?)`,
            [orderId, initialStatus]
        );
        
        // Commit the transaction
        //await connection.commit();
        
        // Return the created order with payment information if applicable
        const createdOrder = {
            id: orderId,
            orderNumber,
            status: initialStatus,
            paymentStatus,
            estimatedTime,
            total
        };
        
        if (paymentMethod === 'card') {
            createdOrder.paymentIntent = {
                id: paymentIntentId,
                clientSecret: null // You would get this from the Stripe response
            };
        }
        
        return createdOrder;
    } catch (error) {
        //await connection.rollback();
        
        // If payment intent was created but order creation failed, cancel the payment intent
        if (paymentIntentId) {
            try {
                await paymentService.cancelPaymentIntent(paymentIntentId);
            } catch (paymentError) {
                console.error('Failed to cancel payment intent:', paymentError);
            }
        }
        
        console.error('Error creating order:', error);
        throw new Error(`Order creation failed: ${error.message}`);
    }
}

/**
 * Get an order by its ID or order number
 * @param {number|string} identifier - Order ID or order number
 * @param {boolean} isOrderNumber - Whether the identifier is an order number
 * @returns {Promise<Object>} Order details
 */
async function getOrder(identifier, isOrderNumber = false) {
    try {
        const query = `
            SELECT o.*, GROUP_CONCAT(osh.status) as status_history
            FROM orders o
            LEFT JOIN order_status_history osh ON o.id = osh.order_id
            WHERE o.${isOrderNumber ? 'order_number' : 'id'} = ?
            GROUP BY o.id
        `;
        
        const [orders] = await db.query(query, [identifier]);
        
        if (orders.length === 0) {
            throw new Error('Order not found');
        }
        
        const order = orders[0];
        
        // Get order items
        const [items] = await db.query(
            `SELECT oi.*, mi.title, mi.description, mi.image_url 
             FROM order_items oi
             JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE oi.order_id = ?`,
            [order.id]
        );
        
        // Get status history
        const [statusHistory] = await db.query(
            `SELECT * FROM order_status_history 
             WHERE order_id = ? 
             ORDER BY updated_at ASC`,
            [order.id]
        );
        
        // Parse delivery address if it exists
        if (order.delivery_address) {
            try {
                order.delivery_address = JSON.parse(order.delivery_address);
            } catch (e) {
                console.error('Error parsing delivery address:', e);
            }
        }
        
        return {
            ...order,
            items,
            statusHistory
        };
    } catch (error) {
        console.error('Error fetching order:', error);
        throw new Error(`Failed to get order: ${error.message}`);
    }
}

/**
 * Update order status
 * @param {number} orderId - ID of the order to update
 * @param {string} status - New status
 * @param {number} userId - ID of the user making the update (optional)
 * @param {string} notes - Additional notes (optional)
 * @returns {Promise<Object>} Updated order
 */
async function updateOrderStatus(orderId, status, userId = null, notes = null) {
    try {
        // Update the order status
        await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );
        
        // Record in status history
        await db.query(
            `INSERT INTO order_status_history (order_id, status, updated_by, notes) 
             VALUES (?, ?, ?, ?)`,
            [orderId, status, userId, notes]
        );
        
        // If status is 'completed', capture the payment if any
        if (status === 'completed') {
            const [orders] = await db.query(
                'SELECT payment_intent_id, payment_status FROM orders WHERE id = ?',
                [orderId]
            );
            
            if (orders.length > 0) {
                const { payment_intent_id, payment_status } = orders[0];
                
                if (payment_intent_id && payment_status === 'authorized') {
                    try {
                        // Capture the payment
                        await paymentService.capturePaymentIntent(payment_intent_id);
                        
                        // Update payment status
                        await db.query(
                            'UPDATE orders SET payment_status = ? WHERE id = ?',
                            ['paid', orderId]
                        );
                    } catch (error) {
                        console.error('Failed to capture payment:', error);
                        // Continue with the order update even if payment capture fails
                    }
                }
            }
        } else if (status === 'cancelled') {
            // If order is cancelled, cancel any payment intent
            const [orders] = await db.query(
                'SELECT payment_intent_id, payment_status FROM orders WHERE id = ?',
                [orderId]
            );
            
            if (orders.length > 0) {
                const { payment_intent_id, payment_status } = orders[0];
                
                if (payment_intent_id && payment_status === 'authorized') {
                    try {
                        // Cancel the payment
                        await paymentService.cancelPaymentIntent(payment_intent_id);
                        
                        // Update payment status
                        await db.query(
                            'UPDATE orders SET payment_status = ? WHERE id = ?',
                            ['cancelled', orderId]
                        );
                    } catch (error) {
                        console.error('Failed to cancel payment:', error);
                    }
                }
            }
        }
        
        // Get updated order
        return await getOrder(orderId);
    } catch (error) {
        console.error('Error updating order status:', error);
        throw new Error(`Failed to update order status: ${error.message}`);
    }
}

/**
 * Get all orders with optional filtering
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of items per page
 * @returns {Promise<Object>} Paginated orders with count
 */
async function getOrders(filters = {}, page = 1, limit = 20) {
    try {
        // Build the WHERE clause based on filters
        let whereClause = '1=1'; // Always true as a starting point
        const queryParams = [];
        
        if (filters.status) {
            whereClause += ' AND o.status = ?';
            queryParams.push(filters.status);
        }
        
        if (filters.customerEmail) {
            whereClause += ' AND o.customer_email = ?';
            queryParams.push(filters.customerEmail);
        }
        
        if (filters.fromDate) {
            whereClause += ' AND o.order_date >= ?';
            queryParams.push(filters.fromDate);
        }
        
        if (filters.toDate) {
            whereClause += ' AND o.order_date <= ?';
            queryParams.push(filters.toDate);
        }
        
        // Calculate offset for pagination
        const offset = (page - 1) * limit;
        
        // Get total count
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`,
            queryParams
        );
        const totalCount = countResult[0].total;
        
        // Get paginated orders
        const orderQuery = `
            SELECT o.* 
            FROM orders o
            WHERE ${whereClause}
            ORDER BY o.order_date DESC
            LIMIT ? OFFSET ?
        `;
        
        const [orders] = await db.query(
            orderQuery,
            [...queryParams, limit, offset]
        );
        
        // Get items for all orders efficiently
        const orderIds = orders.map(order => order.id);
        
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            
            const [allItems] = await db.query(
                `SELECT oi.*, oi.order_id, mi.title 
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                WHERE oi.order_id IN (${placeholders})`,
                orderIds
            );
            
            // Group items by order_id
            const itemsByOrderId = allItems.reduce((acc, item) => {
                if (!acc[item.order_id]) {
                    acc[item.order_id] = [];
                }
                acc[item.order_id].push(item);
                return acc;
            }, {});
            
            // Attach items to their respective orders
            orders.forEach(order => {
                order.items = itemsByOrderId[order.id] || [];
                
                // Parse delivery address if it exists
                if (order.delivery_address) {
                    try {
                        order.delivery_address = JSON.parse(order.delivery_address);
                    } catch (e) {
                        console.error('Error parsing delivery address:', e);
                    }
                }
            });
        }
        
        return {
            orders,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        };
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw new Error(`Failed to get orders: ${error.message}`);
    }
}

module.exports = {
    createOrder,
    getOrder,
    updateOrderStatus,
    getOrders
};