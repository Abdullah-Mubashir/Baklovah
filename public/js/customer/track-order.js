/**
 * Baklovah Restaurant - Order Tracking JavaScript
 * Handles order tracking functionality for the customer-facing website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize order lookup form
    initOrderLookup();
    
    // If order ID is present in URL or session storage, fetch and display order details
    const orderId = getOrderIdFromUrlOrStorage();
    if (orderId) {
        fetchOrderDetails(orderId);
    }
    
    // Set up socket connection for real-time order updates if an order is being tracked
    initOrderTracking();
});

/**
 * Initialize order lookup form
 */
function initOrderLookup() {
    const orderLookupForm = document.getElementById('order-lookup-form');
    if (orderLookupForm) {
        orderLookupForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const orderNumber = document.getElementById('order-number').value.trim();
            const email = document.getElementById('customer-email').value.trim();
            
            if (!orderNumber || !email) {
                window.showToast('Please enter both order number and email', 'warning');
                return;
            }
            
            try {
                // Show loading state
                const submitBtn = orderLookupForm.querySelector('button[type="submit"]');
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
                submitBtn.disabled = true;
                
                // Fetch order details by order number and email
                const response = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
                const data = await response.json();
                
                // Reset button state
                submitBtn.innerHTML = 'Track Order';
                submitBtn.disabled = false;
                
                if (!data.success) {
                    window.showToast(data.message || 'Order not found', 'error');
                    return;
                }
                
                // Save order ID to session storage for easy tracking later
                sessionStorage.setItem('trackedOrderId', data.data.id);
                
                // Update URL with order ID for sharing
                history.pushState(null, null, `/track-order/${data.data.id}`);
                
                // Display order details
                displayOrderDetails(data.data);
                
                // Hide lookup form, show order details
                document.getElementById('order-lookup-section').classList.add('d-none');
                document.getElementById('order-details-section').classList.remove('d-none');
                
                // Initialize socket connection for real-time updates
                initOrderTracking();
            } catch (error) {
                console.error('Error looking up order:', error);
                window.showToast('Failed to look up order. Please try again.', 'error');
                
                // Reset button state
                const submitBtn = orderLookupForm.querySelector('button[type="submit"]');
                submitBtn.innerHTML = 'Track Order';
                submitBtn.disabled = false;
            }
        });
    }
}

/**
 * Get order ID from URL or session storage
 * @returns {string|null} Order ID if available
 */
function getOrderIdFromUrlOrStorage() {
    // Check URL for order ID
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'track-order') {
        return pathParts[2];
    }
    
    // Check session storage
    return sessionStorage.getItem('trackedOrderId');
}

/**
 * Fetch order details from the server
 * @param {string} orderId Order ID to fetch
 */
async function fetchOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/orders/track/${orderId}`);
        const data = await response.json();
        
        if (!data.success) {
            window.showToast(data.message || 'Order not found', 'error');
            return;
        }
        
        // Save order ID to session storage for easy tracking later
        sessionStorage.setItem('trackedOrderId', data.data.id);
        
        // Display order details
        displayOrderDetails(data.data);
        
        // Hide lookup form, show order details
        document.getElementById('order-lookup-section').classList.add('d-none');
        document.getElementById('order-details-section').classList.remove('d-none');
    } catch (error) {
        console.error('Error fetching order details:', error);
        window.showToast('Failed to fetch order details. Please try again.', 'error');
    }
}

/**
 * Display order details on the page
 * @param {Object} order Order data
 */
function displayOrderDetails(order) {
    // Set order number
    document.getElementById('display-order-number').textContent = order.order_number;
    
    // Set order status
    const orderStatusEl = document.getElementById('order-status');
    orderStatusEl.textContent = formatOrderStatus(order.status);
    orderStatusEl.className = `badge ${getStatusBadgeClass(order.status)}`;
    
    // Update progress steps based on status
    updateProgressSteps(order.status, order.status_history);
    
    // Set customer information
    document.getElementById('customer-name').textContent = order.customer_name;
    document.getElementById('customer-email-display').textContent = order.customer_email;
    document.getElementById('customer-phone').textContent = order.customer_phone;
    
    // Set order information
    document.getElementById('order-time').textContent = new Date(order.order_time).toLocaleString();
    document.getElementById('delivery-method').textContent = order.delivery_method === 'delivery' ? 'Delivery' : 'Pickup';
    document.getElementById('estimated-time').textContent = order.time_remaining ? 
        `${order.time_remaining} minutes` : 'Calculating...';
    
    // Clear existing order items
    const orderItemsEl = document.getElementById('order-items');
    orderItemsEl.innerHTML = '';
    
    // Calculate subtotal
    let subtotal = 0;
    
    // Add order items
    order.items.forEach(item => {
        const itemTotal = item.item_price * item.quantity;
        subtotal += itemTotal;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.title}${item.notes ? `<br><small class="text-muted">${item.notes}</small>` : ''}</td>
            <td>${item.quantity}</td>
            <td class="text-end">$${itemTotal.toFixed(2)}</td>
        `;
        orderItemsEl.appendChild(row);
    });
    
    // Set order totals
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    
    // Delivery fee
    const deliveryFeeRow = document.querySelector('.delivery-fee-row');
    if (order.delivery_fee && order.delivery_fee > 0) {
        document.getElementById('delivery-fee').textContent = order.delivery_fee.toFixed(2);
        deliveryFeeRow.classList.remove('d-none');
    } else {
        deliveryFeeRow.classList.add('d-none');
    }
    
    // Tax
    document.getElementById('tax').textContent = (order.tax || (subtotal * 0.0875)).toFixed(2);
    
    // Discount
    const discountRow = document.querySelector('.discount-row');
    if (order.discount && order.discount > 0) {
        document.getElementById('discount').textContent = order.discount.toFixed(2);
        discountRow.classList.remove('d-none');
    } else {
        discountRow.classList.add('d-none');
    }
    
    // Total
    document.getElementById('total').textContent = order.total_amount.toFixed(2);
}

/**
 * Format order status for display
 * @param {string} status Order status
 * @returns {string} Formatted status
 */
function formatOrderStatus(status) {
    switch (status) {
        case 'placed':
            return 'Order Placed';
        case 'preparing':
            return 'Preparing';
        case 'ready':
            return 'Ready for Pickup/Delivery';
        case 'completed':
            return 'Completed';
        case 'cancelled':
            return 'Cancelled';
        default:
            return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

/**
 * Get badge class for order status
 * @param {string} status Order status
 * @returns {string} Bootstrap badge class
 */
function getStatusBadgeClass(status) {
    switch (status) {
        case 'placed':
            return 'bg-info';
        case 'preparing':
            return 'bg-warning text-dark';
        case 'ready':
            return 'bg-success';
        case 'completed':
            return 'bg-primary';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

/**
 * Update progress steps based on order status
 * @param {string} currentStatus Current order status
 * @param {Array} statusHistory Order status history
 */
function updateProgressSteps(currentStatus, statusHistory) {
    // Define status sequence
    const statusSequence = ['placed', 'preparing', 'ready', 'completed'];
    
    // Current status index
    const currentStatusIndex = statusSequence.indexOf(currentStatus);
    
    // Get all step elements
    const steps = ['placed', 'preparing', 'ready', 'completed'].map(status => 
        document.getElementById(`step-${status}`)
    );
    
    // Create status history map
    const statusHistoryMap = {};
    if (statusHistory && statusHistory.length > 0) {
        statusHistory.forEach(history => {
            statusHistoryMap[history.status] = new Date(history.timestamp).toLocaleTimeString();
        });
    }
    
    // Update each step
    steps.forEach((step, index) => {
        const status = statusSequence[index];
        
        // Check if this step is completed (less than or equal to current status index)
        if (index <= currentStatusIndex) {
            step.classList.add('active');
            
            // Update time if available in history
            const timeEl = document.getElementById(`time-${status}`);
            if (timeEl && statusHistoryMap[status]) {
                timeEl.textContent = statusHistoryMap[status];
            }
        } else {
            step.classList.remove('active');
        }
        
        // Add completed class if already passed this step
        if (index < currentStatusIndex) {
            step.classList.add('completed');
        } else {
            step.classList.remove('completed');
        }
    });
}

/**
 * Initialize Socket.io connection for real-time order tracking
 */
function initOrderTracking() {
    const orderId = getOrderIdFromUrlOrStorage();
    if (!orderId) return;
    
    // Check if socket.io is loaded
    if (typeof io === 'undefined') {
        console.warn('Socket.io not loaded. Real-time tracking unavailable.');
        return;
    }
    
    try {
        // Connect to socket.io server
        const socket = io();
        
        // Join the order's room for updates
        socket.emit('join_order_room', orderId);
        
        // Listen for order updates
        socket.on('orderUpdate', function(data) {
            if (data.orderId === orderId) {
                // Update order status
                const orderStatusEl = document.getElementById('order-status');
                orderStatusEl.textContent = formatOrderStatus(data.status);
                orderStatusEl.className = `badge ${getStatusBadgeClass(data.status)}`;
                
                // Update progress steps
                updateProgressSteps(data.status, data.statusHistory);
                
                // Update time remaining
                if (data.timeRemaining !== undefined) {
                    document.getElementById('estimated-time').textContent = 
                        `${data.timeRemaining} minutes`;
                }
                
                // Show toast notification
                window.showToast(`Order status updated to: ${formatOrderStatus(data.status)}`, 'info');
            }
        });
        
        console.log('Real-time order tracking initialized');
    } catch (error) {
        console.error('Error initializing real-time tracking:', error);
    }
}

/**
 * Show a toast notification
 * @param {string} message Message to display
 * @param {string} type Type of toast (success, warning, error, info)
 */
window.showToast = function(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center border-0 show`;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            toast.classList.add('bg-success', 'text-white');
            break;
        case 'warning':
            toast.classList.add('bg-warning', 'text-dark');
            break;
        case 'error':
            toast.classList.add('bg-danger', 'text-white');
            break;
        case 'info':
        default:
            toast.classList.add('bg-info', 'text-dark');
            break;
    }
    
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 500);
    }, 5000);
};
