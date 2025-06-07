/**
 * Baklovah Restaurant - Shopping Cart JavaScript
 * Handles all cart functionality for the customer-facing website
 */

// Initialize cart from localStorage or create empty cart
let cart = JSON.parse(localStorage.getItem('baklovahCart')) || { items: [], subtotal: 0, tax: 0, total: 0 };

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to all add-to-cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            const itemName = this.dataset.itemName;
            const itemPrice = parseFloat(this.dataset.itemPrice);
            const quantityInput = this.closest('.card-body').querySelector('.item-qty');
            const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
            
            addToCart(itemId, itemName, itemPrice, quantity);
        });
    });

    // Initialize quantity controls
    document.querySelectorAll('.quantity-control').forEach(control => {
        const decreaseBtn = control.querySelector('.decrease-qty');
        const increaseBtn = control.querySelector('.increase-qty');
        const input = control.querySelector('.item-qty');
        
        if (decreaseBtn && increaseBtn && input) {
            decreaseBtn.addEventListener('click', function() {
                const currentValue = parseInt(input.value);
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                }
            });
            
            increaseBtn.addEventListener('click', function() {
                const currentValue = parseInt(input.value);
                const max = parseInt(input.getAttribute('max') || 10);
                if (currentValue < max) {
                    input.value = currentValue + 1;
                }
            });
            
            input.addEventListener('change', function() {
                let value = parseInt(this.value);
                const min = parseInt(this.getAttribute('min') || 1);
                const max = parseInt(this.getAttribute('max') || 10);
                
                if (isNaN(value) || value < min) {
                    value = min;
                } else if (value > max) {
                    value = max;
                }
                
                this.value = value;
            });
        }
    });

    // Update cart display on page load
    updateCartDisplay();
});

/**
 * Add an item to the cart
 * @param {string} itemId - ID of the item to add
 * @param {string} itemName - Name of the item to add
 * @param {string|number} itemPrice - Price of the item to add
 * @param {number} quantity - Quantity of the item to add
 */
function addToCart(itemId, itemName, itemPrice, quantity = 1) {
    // Ensure itemPrice is a number
    const price = parseFloat(itemPrice);
    // Find if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => item.id === itemId);
    
    if (existingItemIndex !== -1) {
        // Update quantity if item exists
        cart.items[existingItemIndex].quantity += quantity;
    } else {
        // Add new item if it doesn't exist
        cart.items.push({
            id: itemId,
            name: itemName,
            price: price, // Use the parsed float price
            quantity: quantity
        });
    }
    
    // Update cart totals
    updateCartTotals();
    
    // Save cart to localStorage
    saveCart();
    
    // Update cart display
    updateCartDisplay();
    
    // Show success message
    window.showToast(`${itemName} added to cart`, 'success');
    
    // Update cart count badge
    updateCartCount();
}

/**
 * Remove an item from the cart
 * @param {string} itemId - ID of the item to remove
 */
function removeFromCart(itemId) {
    const itemIndex = cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        const removedItem = cart.items[itemIndex];
        cart.items.splice(itemIndex, 1);
        
        // Update cart totals
        updateCartTotals();
        
        // Save cart to localStorage
        saveCart();
        
        // Update cart display
        updateCartDisplay();
        
        // Show removal message
        window.showToast(`${removedItem.name} removed from cart`, 'info');
        
        // Update cart count badge
        updateCartCount();
    }
}

/**
 * Update the quantity of an item in the cart
 * @param {string} itemId - ID of the item to update
 * @param {number} newQuantity - New quantity value
 */
function updateCartItemQuantity(itemId, newQuantity) {
    const itemIndex = cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        if (newQuantity <= 0) {
            removeFromCart(itemId);
            return;
        }
        
        cart.items[itemIndex].quantity = newQuantity;
        
        // Update cart totals
        updateCartTotals();
        
        // Save cart to localStorage
        saveCart();
        
        // Update cart display
        updateCartDisplay();
        
        // Update cart count badge
        updateCartCount();
    }
}

/**
 * Calculate and update cart totals
 */
function updateCartTotals() {
    // Calculate subtotal
    cart.subtotal = cart.items.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    // Calculate tax (8%)
    cart.tax = cart.subtotal * 0.08;
    
    // Calculate total
    cart.total = cart.subtotal + cart.tax;
    
    // Add delivery fee if on order page and delivery is selected
    if (window.location.pathname === '/order') {
        const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked');
        if (deliveryMethod && deliveryMethod.value === 'delivery') {
            cart.deliveryFee = 3.99;
            cart.total += cart.deliveryFee;
        } else {
            cart.deliveryFee = 0;
        }
    }
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    localStorage.setItem('baklovahCart', JSON.stringify(cart));
}

/**
 * Update the cart display in the sidebar and on the order page
 */
function updateCartDisplay() {
    // Update cart sidebar
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummary = document.querySelector('.cart-summary');
    const emptyCartMessage = document.querySelector('.empty-cart-message');
    
    if (cartItemsContainer) {
        if (cart.items.length === 0) {
            // Show empty cart message
            if (emptyCartMessage) emptyCartMessage.classList.remove('d-none');
            if (cartSummary) cartSummary.classList.add('d-none');
            
            // Clear items
            cartItemsContainer.innerHTML = `
                <div class="text-center empty-cart-message">
                    <i class="fas fa-shopping-basket fa-3x mb-3"></i>
                    <p>Your cart is empty</p>
                    <a href="/menu" class="btn btn-primary">Browse Menu</a>
                </div>
            `;
        } else {
            // Hide empty cart message
            if (emptyCartMessage) emptyCartMessage.classList.add('d-none');
            if (cartSummary) cartSummary.classList.remove('d-none');
            
            // Build cart items HTML
            let cartItemsHTML = '';
            cart.items.forEach(item => {
                cartItemsHTML += `
                    <div class="cart-item mb-3">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6 class="mb-0">${item.name}</h6>
                                <div class="d-flex align-items-center">
                                    <small class="text-muted me-2">$${parseFloat(item.price).toFixed(2)} × ${item.quantity}</small>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-secondary btn-sm cart-qty-minus" data-item-id="${item.id}">-</button>
                                        <button class="btn btn-outline-secondary btn-sm cart-qty-plus" data-item-id="${item.id}">+</button>
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex flex-column align-items-end">
                                <span class="fw-bold">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                <button class="btn btn-link text-danger p-0 cart-remove" data-item-id="${item.id}">
                                    <small><i class="fas fa-trash-alt"></i> Remove</small>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            cartItemsContainer.innerHTML = cartItemsHTML;
            
            // Add event listeners to cart item buttons
            document.querySelectorAll('.cart-remove').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    removeFromCart(itemId);
                });
            });
            
            document.querySelectorAll('.cart-qty-minus').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    const item = cart.items.find(item => item.id === itemId);
                    if (item) {
                        updateCartItemQuantity(itemId, item.quantity - 1);
                    }
                });
            });
            
            document.querySelectorAll('.cart-qty-plus').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    const item = cart.items.find(item => item.id === itemId);
                    if (item) {
                        updateCartItemQuantity(itemId, item.quantity + 1);
                    }
                });
            });
        }
    }
    
    // Update cart totals in sidebar
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTax = document.getElementById('cart-tax');
    const cartTotal = document.getElementById('cart-total');
    
    if (cartSubtotal) cartSubtotal.textContent = `$${cart.subtotal.toFixed(2)}`;
    if (cartTax) cartTax.textContent = `$${cart.tax.toFixed(2)}`;
    if (cartTotal) cartTotal.textContent = `$${cart.total.toFixed(2)}`;
    
    // Update order summary on order page
    updateOrderSummary();
    
    // Update cart count badge
    updateCartCount();
}

/**
 * Update the order summary on the order page
 */
function updateOrderSummary() {
    const orderItemsContainer = document.getElementById('order-items');
    const orderSubtotal = document.getElementById('order-subtotal');
    const orderTax = document.getElementById('order-tax');
    const deliveryFee = document.getElementById('delivery-fee');
    const orderTotal = document.getElementById('order-total');
    const emptyCartMessage = document.querySelector('#order-items .empty-cart-message');
    
    if (orderItemsContainer) {
        if (cart.items.length === 0) {
            // Show empty cart message
            if (emptyCartMessage) emptyCartMessage.classList.remove('d-none');
            
            // Clear items
            orderItemsContainer.innerHTML = `
                <div class="text-center empty-cart-message">
                    <i class="fas fa-shopping-basket fa-3x mb-3"></i>
                    <p>Your cart is empty</p>
                    <a href="#select-items-section" class="btn btn-primary">Add Items</a>
                </div>
            `;
        } else {
            // Hide empty cart message
            if (emptyCartMessage) emptyCartMessage.classList.add('d-none');
            
            // Build order items HTML
            let orderItemsHTML = '';
            cart.items.forEach(item => {
                orderItemsHTML += `
                    <div class="order-item">
                        <div class="d-flex justify-content-between">
                            <div>
                                <div class="order-item-title">${item.name}</div>
                                <div class="order-item-quantity">${item.quantity} × $${parseFloat(item.price).toFixed(2)}</div>
                            </div>
                            <div class="d-flex align-items-center">
                                <span class="order-item-total me-2">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                <span class="order-item-remove" data-item-id="${item.id}">
                                    <i class="fas fa-times"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            orderItemsContainer.innerHTML = orderItemsHTML;
            
            // Add event listeners to order item remove buttons
            document.querySelectorAll('.order-item-remove').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    removeFromCart(itemId);
                });
            });
        }
    }
    
    // Update order totals
    if (orderSubtotal) orderSubtotal.textContent = `$${cart.subtotal.toFixed(2)}`;
    if (orderTax) orderTax.textContent = `$${cart.tax.toFixed(2)}`;
    if (deliveryFee && typeof cart.deliveryFee !== 'undefined') {
        deliveryFee.textContent = `$${cart.deliveryFee.toFixed(2)}`;
        
        // Show/hide delivery fee row
        const deliveryFeeRow = document.querySelector('.delivery-fee-row');
        if (deliveryFeeRow) {
            if (cart.deliveryFee > 0) {
                deliveryFeeRow.classList.remove('d-none');
            } else {
                deliveryFeeRow.classList.add('d-none');
            }
        }
    }
    if (orderTotal) orderTotal.textContent = `$${cart.total.toFixed(2)}`;
}

/**
 * Update the cart count badge
 */
function updateCartCount() {
    const cartCount = document.querySelectorAll('.cart-count');
    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
    
    cartCount.forEach(badge => {
        badge.textContent = itemCount;
        
        if (itemCount === 0) {
            badge.classList.add('d-none');
        } else {
            badge.classList.remove('d-none');
        }
    });
}

/**
 * Clear the entire cart
 */
function clearCart() {
    cart = { items: [], subtotal: 0, tax: 0, total: 0 };
    saveCart();
    updateCartDisplay();
    window.showToast('Cart has been cleared', 'info');
}

// Expose functions to global scope for use in other scripts
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.clearCart = clearCart;
