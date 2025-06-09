/**
 * Baklovah Restaurant - Cashier Checkout JavaScript
 * Handles checkout process for cashier interface
 */

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Only run on the checkout view
    if (document.getElementById('checkout-view') && !document.getElementById('checkout-view').classList.contains('d-none')) {
        updateCheckoutDisplay();
        initializeCheckoutForm();
    }
});

// Update the checkout display with items from the cart
function updateCheckoutDisplay() {
    const checkoutItemsContainer = document.getElementById('checkout-items');
    const emptyCheckoutMessage = document.querySelector('.empty-checkout-message');
    
    if (!checkoutItemsContainer) return;
    
    if (!window.cashierCart.items || window.cashierCart.items.length === 0) {
        // Show empty checkout message
        if (emptyCheckoutMessage) emptyCheckoutMessage.style.display = 'block';
        
        checkoutItemsContainer.innerHTML = `
            <div class="text-center py-4 empty-checkout-message">
                <i class="fas fa-shopping-cart fa-3x mb-3 text-secondary"></i>
                <p class="lead">No items to checkout</p>
                <p class="text-muted">Add items from the menu first</p>
                <a href="/cashier" class="btn btn-primary">
                    <i class="fas fa-utensils me-1"></i> Go to Menu
                </a>
            </div>
        `;
        
        // Disable checkout button
        const checkoutButton = document.getElementById('complete-order-btn');
        if (checkoutButton) checkoutButton.disabled = true;
    } else {
        // Hide empty checkout message
        if (emptyCheckoutMessage) emptyCheckoutMessage.style.display = 'none';
        
        // Clear previous items
        checkoutItemsContainer.innerHTML = '';
        
        // Add each item to the checkout display
        const tableContainer = document.createElement('div');
        tableContainer.classList.add('table-responsive');
        
        const table = document.createElement('table');
        table.classList.add('table', 'table-striped', 'align-middle');
        
        let tableContent = `
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        window.cashierCart.items.forEach(item => {
            const itemSubtotal = item.price * item.quantity;
            
            tableContent += `
                <tr data-item-id="${item.id}">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="item-image-container me-2" style="width: 50px; height: 50px; overflow: hidden; border-radius: 5px;">
                                <img src="${item.image_url || '/images/customer/placeholder-food.jpg'}" 
                                     class="img-fluid" style="object-fit: cover; width: 100%; height: 100%;" alt="${item.name}">
                            </div>
                            <div>
                                <strong>${item.name}</strong>
                            </div>
                        </div>
                    </td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>
                        <div class="input-group input-group-sm" style="width: 100px;">
                            <button class="btn btn-outline-secondary qty-minus-btn" type="button" data-item-id="${item.id}">-</button>
                            <input type="number" class="form-control text-center item-qty" value="${item.quantity}" min="1" max="100" data-item-id="${item.id}">
                            <button class="btn btn-outline-secondary qty-plus-btn" type="button" data-item-id="${item.id}">+</button>
                        </div>
                    </td>
                    <td>${formatCurrency(itemSubtotal)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger remove-item-btn" data-item-id="${item.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableContent += `
            </tbody>
        `;
        
        table.innerHTML = tableContent;
        tableContainer.appendChild(table);
        checkoutItemsContainer.appendChild(tableContainer);
        
        // Add a clear cart button
        const clearCartDiv = document.createElement('div');
        clearCartDiv.classList.add('d-flex', 'justify-content-end', 'mt-3');
        
        const clearCartButton = document.createElement('button');
        clearCartButton.classList.add('btn', 'btn-outline-danger');
        clearCartButton.innerHTML = '<i class="fas fa-trash-alt me-1"></i> Clear Cart';
        clearCartButton.addEventListener('click', clearCart);
        
        clearCartDiv.appendChild(clearCartButton);
        checkoutItemsContainer.appendChild(clearCartDiv);
        
        // Update totals
        const { subtotal, tax, total } = updateCartTotals();
        
        document.getElementById('checkout-subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('checkout-tax').textContent = formatCurrency(tax);
        document.getElementById('checkout-total').textContent = formatCurrency(total);
        
        // Enable checkout button if cart has items
        const checkoutButton = document.getElementById('complete-order-btn');
        if (checkoutButton) checkoutButton.disabled = false;
        
        // Add event listeners to quantity control buttons
        document.querySelectorAll('.qty-minus-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                const item = window.cashierCart.items.find(item => item.id === itemId);
                if (item) {
                    updateCheckoutItemQuantity(itemId, item.quantity - 1);
                }
            });
        });
        
        document.querySelectorAll('.qty-plus-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                const item = window.cashierCart.items.find(item => item.id === itemId);
                if (item) {
                    updateCheckoutItemQuantity(itemId, item.quantity + 1);
                }
            });
        });
        
        document.querySelectorAll('.item-qty').forEach(input => {
            input.addEventListener('change', function() {
                const itemId = this.getAttribute('data-item-id');
                const newQuantity = parseInt(this.value);
                if (!isNaN(newQuantity)) {
                    updateCheckoutItemQuantity(itemId, newQuantity);
                }
            });
        });
        
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                removeCheckoutItem(itemId);
            });
        });
    }
}

// Initialize the checkout form
function initializeCheckoutForm() {
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
    }
}

// Update cart item quantity in checkout
function updateCheckoutItemQuantity(itemId, newQuantity) {
    if (!window.cashierCart.items) window.cashierCart.items = [];
    
    const item = window.cashierCart.items.find(item => item.id === itemId);
    
    if (item) {
        if (newQuantity <= 0) {
            // Remove item if quantity is 0 or less
            removeCheckoutItem(itemId);
        } else if (newQuantity <= 100) { // Setting a reasonable max quantity
            item.quantity = newQuantity;
            
            // Update display
            const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
            if (row) {
                const subtotalCell = row.querySelector('td:nth-child(4)');
                const itemSubtotal = item.price * item.quantity;
                subtotalCell.textContent = formatCurrency(itemSubtotal);
                
                const qtyInput = row.querySelector('.item-qty');
                if (qtyInput) qtyInput.value = newQuantity;
            }
            
            // Update totals
            const { subtotal, tax, total } = updateCartTotals();
            document.getElementById('checkout-subtotal').textContent = formatCurrency(subtotal);
            document.getElementById('checkout-tax').textContent = formatCurrency(tax);
            document.getElementById('checkout-total').textContent = formatCurrency(total);
            
            // Update cart count
            updateCartCount();
        }
    }
}

// Remove item from checkout
function removeCheckoutItem(itemId) {
    if (!window.cashierCart.items) window.cashierCart.items = [];
    
    const itemIndex = window.cashierCart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        const removedItem = window.cashierCart.items[itemIndex];
        window.cashierCart.items.splice(itemIndex, 1);
        
        // Remove row from table
        const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
        if (row) row.remove();
        
        // Update checkout display if cart is now empty
        if (window.cashierCart.items.length === 0) {
            updateCheckoutDisplay();
        } else {
            // Update totals
            const { subtotal, tax, total } = updateCartTotals();
            document.getElementById('checkout-subtotal').textContent = formatCurrency(subtotal);
            document.getElementById('checkout-tax').textContent = formatCurrency(tax);
            document.getElementById('checkout-total').textContent = formatCurrency(total);
        }
        
        // Show notification
        showToast(`${removedItem.name} removed from order`, 'info');
        
        // Update cart count
        updateCartCount();
    }
}

// Clear entire cart
function clearCart() {
    if (window.cashierCart.items && window.cashierCart.items.length > 0) {
        if (confirm('Are you sure you want to clear the entire cart?')) {
            window.cashierCart.items = [];
            updateCartTotals();
            updateCartCount();
            updateCheckoutDisplay();
            showToast('Cart cleared', 'info');
        }
    }
}

// Place the order
async function placeOrder() {
    const completeOrderBtn = document.getElementById('complete-order-btn');
    
    // Validate cart has items
    if (!window.cashierCart.items || window.cashierCart.items.length === 0) {
        showToast('No items in cart to checkout', 'error');
        return;
    }
    
    // Validate customer information
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    
    if (!customerName) {
        showToast('Please enter customer name', 'warning');
        document.getElementById('customer-name').focus();
        return;
    }
    
    // Disable button and show loading
    completeOrderBtn.disabled = true;
    completeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    
    try {
        // Prepare order data
        const orderData = {
            items: window.cashierCart.items,
            customer_name: customerName,
            customer_phone: customerPhone,
            total: window.cashierCart.total,
            payment_method: document.querySelector('input[name="payment-method"]:checked').value
        };
        
        // Send order to the server
        const response = await fetch('/cashier/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            showToast('Order placed successfully!', 'success');
            
            // Create order success display
            const checkoutItemsContainer = document.getElementById('checkout-items');
            checkoutItemsContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-check-circle fa-4x mb-3 text-success"></i>
                    <h3>Order Placed Successfully!</h3>
                    <p class="lead">Order #${result.orderId}</p>
                    <div class="d-flex justify-content-center gap-3 mt-4">
                        <a href="/cashier" class="btn btn-primary">
                            <i class="fas fa-utensils me-1"></i> New Order
                        </a>
                        <a href="/cashier/orders" class="btn btn-secondary">
                            <i class="fas fa-clipboard-list me-1"></i> Manage Orders
                        </a>
                    </div>
                </div>
            `;
            
            // Clear form and cart
            document.getElementById('customer-name').value = '';
            document.getElementById('customer-phone').value = '';
            window.cashierCart.items = [];
            updateCartTotals();
            updateCartCount();
            
            // Reset button
            completeOrderBtn.disabled = false;
            completeOrderBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Complete Order';
        } else {
            showToast('Failed to place order: ' + (result.error || 'Unknown error'), 'error');
            completeOrderBtn.disabled = false;
            completeOrderBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Complete Order';
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Error placing order. Please try again.', 'error');
        completeOrderBtn.disabled = false;
        completeOrderBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Complete Order';
    }
}
