/**
 * Baklovah Restaurant - Cashier Orders JavaScript
 * Handles loading and managing customer orders
 */

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Only run on the orders management view
    if (document.getElementById('orders-management-view') && !document.getElementById('orders-management-view').classList.contains('d-none')) {
        loadActiveOrders();
        
        // Add event listeners
        document.getElementById('refresh-orders').addEventListener('click', loadActiveOrders);
        document.getElementById('order-status-filter').addEventListener('change', loadActiveOrders);
        document.getElementById('complete-all-items-btn').addEventListener('click', markAllItemsComplete);
        
        // Connect to socket for real-time updates
        socket.on('new_order', (data) => {
            loadActiveOrders();
            showToast('New order received!', 'info');
        });
        
        socket.on('order_updated', (data) => {
            loadActiveOrders();
        });
    }
});

// Load all active orders
async function loadActiveOrders() {
    const ordersContainer = document.getElementById('active-orders-container');
    const statusFilter = document.getElementById('order-status-filter').value;
    
    // Reset notification counter since user viewed orders
    const ordersBadge = document.getElementById('order-notification-badge');
    if (ordersBadge) {
        ordersBadge.textContent = '0';
        ordersBadge.style.display = 'none';
    }
    
    // Show loading spinner
    ordersContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    try {
        const response = await fetch('/cashier/api/orders');
        const orders = await response.json();
        
        if (orders && orders.length > 0) {
            // Filter orders by status if not 'all'
            const filteredOrders = statusFilter !== 'all' 
                ? orders.filter(order => order.status === statusFilter)
                : orders;
                
            if (filteredOrders.length === 0) {
                ordersContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-filter fa-3x mb-3 text-secondary"></i>
                        <p class="lead">No orders matching filter</p>
                        <button class="btn btn-outline-primary" id="clear-filter-btn">Clear Filter</button>
                    </div>
                `;
                
                document.getElementById('clear-filter-btn').addEventListener('click', function() {
                    document.getElementById('order-status-filter').value = 'all';
                    loadActiveOrders();
                });
                return;
            }
            
            // Clear container
            ordersContainer.innerHTML = '';
            
            // Display each order as a card
            filteredOrders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.classList.add('col-md-6', 'col-lg-4', 'mb-4');
                
                // Calculate order progress
                const completedItems = order.items.filter(item => item.status === 'completed').length;
                const totalItems = order.items.length;
                const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
                
                // Determine status badge color
                let statusBadgeClass = 'bg-secondary';
                switch (order.status) {
                    case 'pending': statusBadgeClass = 'bg-warning'; break;
                    case 'preparing': statusBadgeClass = 'bg-primary'; break;
                    case 'ready': statusBadgeClass = 'bg-success'; break;
                    case 'completed': statusBadgeClass = 'bg-success'; break;
                    case 'cancelled': statusBadgeClass = 'bg-danger'; break;
                }
                
                const orderTime = new Date(order.order_time).toLocaleString();
                
                orderCard.innerHTML = `
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge ${statusBadgeClass} me-2">${order.status}</span>
                                <span>Order #${order.id}</span>
                            </div>
                            <span class="text-secondary small">${orderTime}</span>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <p class="mb-1"><strong>Customer:</strong> ${order.customer_name || 'Online Order'}</p>
                                <p class="mb-1"><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
                                <p class="mb-1"><strong>Type:</strong> ${order.order_type || 'Online'}</p>
                                <p class="mb-1"><strong>Items:</strong> ${totalItems}</p>
                            </div>
                            
                            <div class="progress mb-3" style="height: 10px;">
                                <div class="progress-bar ${progress === 100 ? 'bg-success' : 'bg-primary'}" role="progressbar" 
                                    style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            <p class="small text-center">${completedItems} of ${totalItems} items complete</p>
                            
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary view-order-btn" data-order-id="${order.id}">
                                    <i class="fas fa-eye me-1"></i> View Order Details
                                </button>
                                <button class="btn ${progress === 100 ? 'btn-success' : 'btn-outline-success'} complete-order-btn" data-order-id="${order.id}"
                                    ${progress === 100 ? '' : 'disabled'}>
                                    <i class="fas fa-check-circle me-1"></i> Mark Order Complete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                ordersContainer.appendChild(orderCard);
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-order-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const orderId = this.getAttribute('data-order-id');
                    viewOrderDetails(orderId);
                });
            });
            
            // Add event listeners to complete order buttons
            document.querySelectorAll('.complete-order-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const orderId = this.getAttribute('data-order-id');
                    markOrderComplete(orderId);
                });
            });
        } else {
            ordersContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-check-circle fa-3x mb-3 text-success"></i>
                    <p class="lead">No active orders</p>
                    <p class="text-muted">All orders have been completed</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x mb-3 text-danger"></i>
                <p class="lead">Failed to load orders</p>
                <button class="btn btn-primary" id="retry-load-btn">Retry</button>
            </div>
        `;
        
        document.getElementById('retry-load-btn').addEventListener('click', loadActiveOrders);
    }
}

// View order details in modal
async function viewOrderDetails(orderId) {
    const modalBody = document.getElementById('order-detail-content');
    const modalTitle = document.getElementById('orderDetailModalLabel');
    const completeAllBtn = document.getElementById('complete-all-items-btn');
    
    // Store active order ID for complete all function
    window.activeOrderId = orderId;
    
    // Show loading in modal
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Show modal
    const orderModal = new bootstrap.Modal(document.getElementById('order-detail-modal'));
    orderModal.show();
    
    try {
        // Fetch all orders (since we already have them loaded)
        const response = await fetch('/cashier/api/orders');
        const orders = await response.json();
        const order = orders.find(o => o.id == orderId);
        
        if (order) {
            modalTitle.textContent = `Order #${order.id} - ${order.customer_name || 'Online Order'}`;
            
            let itemsHtml = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Order Time:</strong> ${new Date(order.order_time).toLocaleString()}</p>
                        <p class="mb-1"><strong>Customer:</strong> ${order.customer_name || 'Online Order'}</p>
                        <p class="mb-1"><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Status:</strong> <span class="badge bg-${getStatusBadgeClass(order.status)}">${order.status}</span></p>
                        <p class="mb-1"><strong>Order Type:</strong> ${order.order_type || 'Online'}</p>
                        <p class="mb-1"><strong>Total:</strong> ${formatCurrency(order.total)}</p>
                    </div>
                </div>
                
                <h5 class="mb-3">Order Items</h5>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            order.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price)}</td>
                        <td><span class="badge bg-${getStatusBadgeClass(item.status)}">${item.status}</span></td>
                        <td>
                            <button class="btn btn-sm ${item.status === 'completed' ? 'btn-outline-success' : 'btn-success'} complete-item-btn"
                                data-item-id="${item.id}" data-order-id="${order.id}" ${item.status === 'completed' ? 'disabled' : ''}>
                                <i class="fas fa-check"></i> ${item.status === 'completed' ? 'Completed' : 'Mark Done'}
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            itemsHtml += `
                    </tbody>
                </table>
            `;
            
            modalBody.innerHTML = itemsHtml;
            
            // Enable/disable complete all button
            const allCompleted = order.items.every(item => item.status === 'completed');
            completeAllBtn.disabled = allCompleted;
            if (allCompleted) {
                completeAllBtn.textContent = 'All Items Completed';
            } else {
                completeAllBtn.textContent = 'Mark All Items Done';
            }
            
            // Add event listeners to complete item buttons
            document.querySelectorAll('.complete-item-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.getAttribute('data-item-id');
                    const orderId = this.getAttribute('data-order-id');
                    markItemComplete(orderId, itemId, this);
                });
            });
        } else {
            modalBody.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-exclamation-circle fa-3x mb-3 text-danger"></i>
                    <p class="lead">Order not found</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        modalBody.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x mb-3 text-danger"></i>
                <p class="lead">Failed to load order details</p>
            </div>
        `;
    }
}

// Mark an order item as complete
async function markItemComplete(orderId, itemId, button) {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const response = await fetch(`/cashier/api/orders/${orderId}/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            button.innerHTML = '<i class="fas fa-check"></i> Completed';
            button.classList.replace('btn-success', 'btn-outline-success');
            button.disabled = true;
            
            const statusBadge = button.closest('tr').querySelector('.badge');
            statusBadge.classList.remove('bg-warning', 'bg-secondary', 'bg-primary');
            statusBadge.classList.add('bg-success');
            statusBadge.textContent = 'completed';
            
            // Check if all items are now complete
            const allButtons = document.querySelectorAll('.complete-item-btn');
            const allCompleted = Array.from(allButtons).every(btn => btn.disabled);
            
            if (allCompleted) {
                document.getElementById('complete-all-items-btn').disabled = true;
                document.getElementById('complete-all-items-btn').textContent = 'All Items Completed';
                
                // Enable the complete order button
                const orderBtn = document.querySelector(`.complete-order-btn[data-order-id="${orderId}"]`);
                if (orderBtn) {
                    orderBtn.classList.remove('btn-outline-success');
                    orderBtn.classList.add('btn-success');
                    orderBtn.disabled = false;
                }
            }
            
            showToast('Item marked as done', 'success');
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-check"></i> Mark Done';
            showToast('Failed to update item status', 'error');
        }
    } catch (error) {
        console.error('Error marking item complete:', error);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check"></i> Mark Done';
        showToast('Error updating item status', 'error');
    }
}

// Mark all items in the current order as complete
async function markAllItemsComplete() {
    if (!window.activeOrderId) return;
    
    const orderId = window.activeOrderId;
    const completeAllBtn = document.getElementById('complete-all-items-btn');
    completeAllBtn.disabled = true;
    completeAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        // Get all incomplete item buttons
        const incompleteButtons = document.querySelectorAll('.complete-item-btn:not([disabled])');
        
        // Mark each item complete
        for (const button of incompleteButtons) {
            const itemId = button.getAttribute('data-item-id');
            await markItemComplete(orderId, itemId, button);
        }
        
        // Update button state
        completeAllBtn.textContent = 'All Items Completed';
        
        // Enable the complete order button in the list
        const orderBtn = document.querySelector(`.complete-order-btn[data-order-id="${orderId}"]`);
        if (orderBtn) {
            orderBtn.classList.remove('btn-outline-success');
            orderBtn.classList.add('btn-success');
            orderBtn.disabled = false;
        }
        
        showToast('All items marked as done', 'success');
    } catch (error) {
        console.error('Error marking all items complete:', error);
        completeAllBtn.disabled = false;
        completeAllBtn.textContent = 'Mark All Items Done';
        showToast('Error updating items', 'error');
    }
}

// Mark an entire order as complete
async function markOrderComplete(orderId) {
    const button = document.querySelector(`.complete-order-btn[data-order-id="${orderId}"]`);
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const response = await fetch(`/cashier/api/orders/${orderId}/items/all`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            button.innerHTML = '<i class="fas fa-check"></i> Completed';
            showToast('Order marked as complete', 'success');
            
            // Refresh order list after brief delay
            setTimeout(() => {
                loadActiveOrders();
            }, 1000);
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-check-circle me-1"></i> Mark Order Complete';
            showToast('Failed to mark order as complete', 'error');
        }
    } catch (error) {
        console.error('Error marking order complete:', error);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check-circle me-1"></i> Mark Order Complete';
        showToast('Error updating order', 'error');
    }
}

// Helper function to get badge class based on status
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'preparing': return 'primary';
        case 'ready': return 'success';
        case 'completed': return 'success';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}
