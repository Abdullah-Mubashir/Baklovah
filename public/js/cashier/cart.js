/**
 * Baklovah Restaurant - Cashier Cart Management
 * Handles cart functionality for the cashier interface
 */

// Check if window.cart is already defined (to avoid duplicate initialization)
if (typeof window.cart === 'undefined') {
    try {
        // Initialize cart from localStorage or create empty cart
        const storedCart = localStorage.getItem('baklovahCashierCart');
        window.cart = storedCart ? JSON.parse(storedCart) : { 
            items: [], 
            totalPrice: 0, 
            tax: 0, 
            finalTotal: 0 
        };
        console.log('Cart initialized from storage:', window.cart);
        
        // Clean up any invalid items in the cart
        cleanupCart();
    } catch (e) {
        console.error('Error initializing cart:', e);
        window.cart = { 
            items: [], 
            totalPrice: 0, 
            tax: 0, 
            finalTotal: 0 
        };
    }
}

/**
 * Clean up the cart to remove any invalid/undefined items
 */
function cleanupCart() {
    if (!window.cart || !window.cart.items) {
        window.cart = { 
            items: [], 
            totalPrice: 0, 
            tax: 0, 
            finalTotal: 0 
        };
        return;
    }
    
    // Filter out invalid items
    const validItems = window.cart.items.filter(item => {
        return item && 
               typeof item.id !== 'undefined' && 
               typeof item.name !== 'undefined' && 
               typeof item.price !== 'undefined';
    });
    
    // Replace with only valid items
    window.cart.items = validItems;
    
    // Update totals
    updateCartTotals();
    
    // Save cleaned cart
    saveCart();
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    try {
        localStorage.setItem('baklovahCashierCart', JSON.stringify(window.cart));
        console.log('Cart saved to localStorage');
    } catch (e) {
        console.error('Error saving cart to localStorage:', e);
    }
}

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cart.js loaded, initializing cart display...');
    // Just update the display with the loaded cart data
    updateCartDisplay();
});

// Add item to order - make it globally accessible
window.addToOrder = function(itemId, itemName, itemPrice, quantity = 1, imageUrl = null) {
    console.log('Adding to order:', { itemId, itemName, itemPrice, quantity, imageUrl });
    
    // Validate inputs - more detailed validation
    if (!itemId) {
        console.error('Missing item ID');
        return;
    }
    
    if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
        console.error('Invalid item name:', itemName);
        return;
    }
    
    if (isNaN(parseFloat(itemPrice))) {
        console.error('Invalid item price:', itemPrice);
        return;
    }
    
    // Check if item already exists in cart
    const existingItemIndex = window.cart.items.findIndex(item => item.id === itemId);
    
    if (existingItemIndex !== -1) {
        // Update quantity for existing item
        window.cart.items[existingItemIndex].quantity += quantity;
    } else {
        // Add new item to cart
        window.cart.items.push({
            id: itemId,
            name: itemName,
            price: itemPrice,
            quantity: quantity,
            image_url: imageUrl || '/images/customer/placeholder-food.jpg'
        });
    }
    
    // Update cart calculations
    updateCartTotals();
    
    // Save cart to localStorage
    saveCart();
    
    // Update cart display
    updateCartDisplay();
    
    // Show success notification
    showNotification(`${itemName} added to order`, 'success');
}

// Remove item from order
function removeFromOrder(itemId) {
    const itemIndex = window.cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        const removedItem = window.cart.items[itemIndex];
        window.cart.items.splice(itemIndex, 1);
        
        // Update cart calculations
        updateCartTotals();
        
        // Save cart to localStorage
        saveCart();
        
        // Update the display
        updateCartDisplay();
        
        showNotification(`${removedItem.name} removed from order`, 'warning');
    }
}

// Update item quantity in order
function updateItemQuantity(itemId, newQuantity) {
    const itemIndex = window.cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        // Ensure quantity is valid
        newQuantity = parseInt(newQuantity);
        if (isNaN(newQuantity) || newQuantity < 1) {
            newQuantity = 1;
        }
        
        window.cart.items[itemIndex].quantity = newQuantity;
        
        // Update cart calculations
        updateCartTotals();
        
        // Save cart to localStorage
        saveCart();
        
        // Update the display
        updateCartDisplay();
    }
}

// Calculate totals in the cart
function updateCartTotals() {
    // Calculate total price
    window.cart.totalPrice = window.cart.items.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    // Calculate tax (assume 8.25%)
    window.cart.tax = window.cart.totalPrice * 0.0825;
    
    // Calculate final total
    window.cart.finalTotal = window.cart.totalPrice + window.cart.tax;
    
    console.log('Cart totals updated:', window.cart);
}

// Update the cart display in the UI
function updateCartDisplay() {
    const orderContainer = document.getElementById('current-order-items');
    const orderSummary = document.getElementById('order-summary');
    const emptyOrderMessage = document.querySelector('.empty-order-message');
    
    if (!orderContainer) return;
    
    // Calculate totals
    updateCartTotals();
    
    // Check if cart is empty
    if (window.cart.items.length === 0) {
        // Show empty cart message
        if (emptyOrderMessage) {
            emptyOrderMessage.classList.remove('d-none');
        }
        
        // Hide order summary
        if (orderSummary) {
            orderSummary.classList.add('d-none');
        }
        
        // Clear order items
        orderContainer.innerHTML = `
            <div class="text-center py-4 empty-order-message">
                <i class="fas fa-shopping-cart fa-3x mb-3 text-secondary"></i>
                <p class="lead">No items in current order</p>
                <p class="text-muted">Add items from the menu to create an order</p>
            </div>
        `;
        return;
    }
    
    // Hide empty cart message if exists
    if (emptyOrderMessage) {
        emptyOrderMessage.classList.add('d-none');
    }
    
    // Show order summary
    if (orderSummary) {
        orderSummary.classList.remove('d-none');
    }
    
    // Generate order items HTML
    let orderItemsHTML = '';
    window.cart.items.forEach(item => {
        orderItemsHTML += `
            <div class="order-item border-bottom pb-3 mb-3" data-id="${item.id}">
                <div class="d-flex">
                    <div class="order-item-img me-2">
                        <img src="${item.image_url}" alt="${item.name}" class="rounded" width="50" height="50" style="object-fit: cover;">
                    </div>
                    <div class="order-item-details flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <h6 class="mb-0 fw-bold">${item.name}</h6>
                            <span class="text-primary">$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <div class="quantity-control d-flex align-items-center">
                                <button class="btn btn-sm btn-outline-secondary qty-btn" data-action="decrease">-</button>
                                <span class="mx-2">${item.quantity}</span>
                                <button class="btn btn-sm btn-outline-secondary qty-btn" data-action="increase">+</button>
                            </div>
                            <button class="btn btn-sm btn-outline-danger remove-item-btn">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Update order container
    orderContainer.innerHTML = orderItemsHTML;
    
    // Update order summary
    if (orderSummary) {
        orderSummary.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span id="order-subtotal">$${window.cart.totalPrice.toFixed(2)}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span id="order-tax">$${window.cart.tax.toFixed(2)}</span>
            </div>
            <div class="d-flex justify-content-between fw-bold">
                <span>Total:</span>
                <span id="order-total">$${window.cart.finalTotal.toFixed(2)}</span>
            </div>
            <div class="d-grid gap-2 mt-3">
                <button id="clear-order-btn" class="btn btn-outline-danger">
                    <i class="fas fa-times me-1"></i> Cancel Order
                </button>
                <button id="complete-order-btn" class="btn btn-primary">
                    <i class="fas fa-check-circle me-1"></i> Complete Order
                </button>
            </div>
        `;
    }
    
    // Initialize quantity buttons
    initQuantityButtons();
    
    // Initialize remove buttons
    initRemoveButtons();
    
    // Initialize action buttons
    initActionButtons();
}

// Initialize quantity buttons
function initQuantityButtons() {
    const quantityButtons = document.querySelectorAll('.qty-btn');
    
    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const orderItem = this.closest('.order-item');
            const itemId = orderItem.getAttribute('data-id');
            const itemIndex = window.cart.items.findIndex(item => item.id === itemId);
            
            if (itemIndex !== -1) {
                let newQuantity = window.cart.items[itemIndex].quantity;
                
                if (action === 'increase') {
                    newQuantity++;
                } else if (action === 'decrease' && newQuantity > 1) {
                    newQuantity--;
                }
                
                updateItemQuantity(itemId, newQuantity);
            }
        });
    });
}

// Initialize remove buttons
function initRemoveButtons() {
    const removeButtons = document.querySelectorAll('.remove-item-btn');
    
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const orderItem = this.closest('.order-item');
            const itemId = orderItem.getAttribute('data-id');
            removeFromOrder(itemId);
        });
    });
}

// Initialize action buttons (clear order, complete order)
function initActionButtons() {
    const clearOrderBtn = document.getElementById('clear-order-btn');
    const completeOrderBtn = document.getElementById('complete-order-btn');
    
    if (clearOrderBtn) {
        clearOrderBtn.addEventListener('click', function() {
            clearOrder();
        });
    }
    
    if (completeOrderBtn) {
        completeOrderBtn.addEventListener('click', function() {
            completeOrder();
        });
    }
}

// Clear the entire order
function clearOrder() {
    if (window.cart.items.length > 0) {
        if (confirm('Are you sure you want to clear the entire order?')) {
            window.cart.items = [];
            window.cart.totalPrice = 0;
            window.cart.tax = 0;
            window.cart.finalTotal = 0;
            
            // Save to localStorage
            saveCart();
            
            // Update display
            updateCartDisplay();
            
            showNotification('Order cleared', 'info');
        }
    }
}

// Process the current order
function processOrder() {
    // Validate order has items
    if (window.cart.items.length === 0) {
        showNotification('Cannot process empty order', 'error');
        return;
    }
    
    // In a real system, this would connect to a payment processor or POS system
    // For now, just show a success message and clear the cart
    showNotification('Order processed successfully!', 'success');
    
    // Reset the cart
    window.cart.items = [];
    window.cart.totalPrice = 0;
    window.cart.tax = 0;
    window.cart.finalTotal = 0;
    
    // Save to localStorage
    saveCart();
    
    // Update display
    updateCartDisplay();
}

// Complete order
function completeOrder() {
    if (window.cart.items.length === 0) {
        showNotification('Cannot complete an empty order', 'error');
        return;
    }
    
    // Create order object
    const order = {
        items: window.cart.items,
        subtotal: window.cart.totalPrice,
        tax: window.cart.tax,
        total: window.cart.finalTotal,
        status: 'pending'
    };
    
    // In a real system, this would save to a database
    console.log('Processing order:', order);
    
    // Show confirmation modal
    document.getElementById('orderTotal').textContent = `$${order.total.toFixed(2)}`;
    document.getElementById('orderItemCount').textContent = order.items.length;
    const modal = new bootstrap.Modal(document.getElementById('orderCompleteModal'));
    modal.show();
    
    // Clear cart for next order
    window.cart.items = [];
    window.cart.totalPrice = 0;
    window.cart.tax = 0;
    window.cart.finalTotal = 0;
    
    // Save to localStorage
    saveCart();
    
    // Update display
    updateCartDisplay();
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if toastContainer exists, if not create it
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create a random ID for this toast
    const toastId = 'toast-' + Math.random().toString(36).substring(2, 10);
    
    // Create toast HTML
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.innerHTML += toastHTML;
    
    // Initialize the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    
    // Show toast
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}
