/**
 * Baklovah Restaurant - Shopping Cart JavaScript
 * Handles all cart functionality for the customer-facing website
 */

// Check if window.cart is already defined (to avoid duplicate initialization)
if (typeof window.cart === 'undefined') {
    try {
        // Initialize cart from localStorage or create empty cart
        const storedCart = localStorage.getItem('baklovahCart');
        window.cart = storedCart ? JSON.parse(storedCart) : { items: [], subtotal: 0, tax: 0, total: 0 };
        console.log('Cart initialized:', window.cart);
        
        // Clean up any invalid items in the cart
        cleanupCart();
    } catch (e) {
        console.error('Error initializing cart:', e);
        window.cart = { items: [], subtotal: 0, tax: 0, total: 0 };
    }
}

/**
 * Clean up the cart to remove any invalid/undefined items
 */
function cleanupCart() {
    if (!window.cart || !window.cart.items) {
        window.cart = { items: [], subtotal: 0, tax: 0, total: 0 };
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
    
    // Recalculate totals
    updateCartTotals();
    
    // Save cleaned cart
    saveCart();
}

// Important: Use window.cart throughout instead of creating a separate reference
// This avoids potential issues if the script gets loaded multiple times

/**
 * Show Popular Items section and hide Cart Items section
 */
function showPopularItems() {
    const cartItemsSection = document.getElementById('cart-items-section');
    const popularItemsSection = document.getElementById('popular-items');
    
    if (cartItemsSection && popularItemsSection) {
        cartItemsSection.style.display = 'none';
        popularItemsSection.style.display = 'block';
        
        // Load popular items if not already loaded
        const popularItemsContainer = document.getElementById('popular-items-container');
        if (popularItemsContainer && popularItemsContainer.children.length === 0) {
            fetchPopularItems();
        }
        
        // Add event listener to the "Back to Cart Items" button
        const backToCartBtn = document.querySelector('.show-cart-items');
        if (backToCartBtn) {
            backToCartBtn.addEventListener('click', showCartItems);
        }
    }
}

/**
 * Show Cart Items section and hide Popular Items section
 */
function showCartItems() {
    const cartItemsSection = document.getElementById('cart-items-section');
    const popularItemsSection = document.getElementById('popular-items');
    
    if (cartItemsSection && popularItemsSection) {
        cartItemsSection.style.display = 'block';
        popularItemsSection.style.display = 'none';
        
        // Update the cart display to refresh items
        updateCartDisplay();
    }
}

/**
 * Fetch popular menu items from API and display them
 */
function fetchPopularItems() {
    const popularItemsContainer = document.getElementById('popular-items-container');
    if (!popularItemsContainer) return;
    
    // Show loading indicator
    popularItemsContainer.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Fetch popular items from API
    fetch('/api/menu/popular?limit=6')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.items && data.items.length > 0) {
                let itemsHTML = '';
                data.items.forEach(item => {
                    // Use item's image or placeholder
                    const imageUrl = item.image_url || '/images/customer/placeholder-food.jpg';
                    
                    itemsHTML += `
                        <div class="col-md-6 mb-3">
                            <div class="card h-100 menu-item-card">
                                <div class="row g-0">
                                    <div class="col-4">
                                        <img src="${imageUrl}" class="img-fluid rounded-start h-100 object-fit-cover" alt="${item.title}">
                                    </div>
                                    <div class="col-8">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-start">
                                                <h5 class="card-title">${item.title}</h5>
                                                <span class="menu-item-price">$${parseFloat(item.price).toFixed(2)}</span>
                                            </div>
                                            <p class="card-text small">${item.description || ''}</p>
                                            <div class="d-flex align-items-center">
                                                <div class="input-group input-group-sm quantity-control me-2">
                                                    <button class="btn btn-outline-secondary decrease-qty" type="button">-</button>
                                                    <input type="number" class="form-control text-center item-qty" value="1" min="1" max="10">
                                                    <button class="btn btn-outline-secondary increase-qty" type="button">+</button>
                                                </div>
                                                <button class="btn btn-primary btn-sm add-to-cart-btn" data-item-id="${item.id}" data-item-name="${item.title}" data-item-price="${item.price}" data-item-image="${imageUrl}">
                                                    <i class="fas fa-cart-plus"></i> Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                popularItemsContainer.innerHTML = itemsHTML;
                
                // Initialize quantity controls for popular items
                initQuantityControls();
                
                // Add event listeners to add-to-cart buttons
                document.querySelectorAll('.add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const itemId = this.dataset.itemId;
                        const itemName = this.dataset.itemName;
                        const itemPrice = parseFloat(this.dataset.itemPrice);
                        const itemImage = this.dataset.itemImage;
                        const quantityInput = this.closest('.card-body').querySelector('.item-qty');
                        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
                        
                        addToCart(itemId, itemName, itemPrice, quantity, itemImage);
                        // Switch back to cart items view after adding to cart
                        showCartItems();
                    });
                });
            } else {
                popularItemsContainer.innerHTML = '<div class="col-12 text-center"><p>No popular items found</p></div>';
            }
        })
        .catch(error => {
            console.error('Error fetching popular items:', error);
            popularItemsContainer.innerHTML = '<div class="col-12 text-center"><p>Failed to load popular items</p></div>';
        });
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Clean up any invalid items in the cart
    cleanupCart();
    
    // Initialize cart items view in the order page
    initCartItemsView();

    // Add event listeners to all add-to-cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            const itemName = this.dataset.itemName;
            const itemPrice = parseFloat(this.dataset.itemPrice);
            
            // Get the image URL from the nearest image element or data attribute
            let imageUrl = this.dataset.itemImage;
            if (!imageUrl) {
                const cardContainer = this.closest('.card, .menu-item');
                if (cardContainer) {
                    const imgElement = cardContainer.querySelector('img');
                    if (imgElement) {
                        imageUrl = imgElement.src;
                    }
                }
            }
            
            // Get quantity if available
            const quantityInput = this.closest('.card-body, .item-controls').querySelector('.item-qty');
            const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
            
            // Only proceed if we have valid item data
            if (itemId && itemName && !isNaN(itemPrice)) {
                addToCart(itemId, itemName, itemPrice, quantity, imageUrl);
            } else {
                console.error('Invalid item data:', { itemId, itemName, itemPrice });
            }
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
 * Initialize the cart items view for the order page
 */
function initCartItemsView() {
    // Check if we're on the order page
    if (window.location.pathname !== '/order') return;
    
    // Initialize the items added display
    updateCartDisplay();
    
    // Add event listener for the show popular items button
    const showPopularBtn = document.querySelector('.show-popular-items');
    if (showPopularBtn) {
        showPopularBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showPopularItems();
        });
    }
    
    // Add event listener for the show cart items button
    const showCartBtn = document.querySelector('.show-cart-items');
    if (showCartBtn) {
        showCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showCartItems();
        });
    }
}

/**
 * Initialize quantity controls for menu items
 */
function initQuantityControls() {
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
}

/**
 * Add an item to the cart
 * @param {string} itemId - ID of the item to add
 * @param {string} itemName - Name of the item to add
 * @param {string|number} itemPrice - Price of the item to add
 * @param {number} quantity - Quantity of the item to add
 * @param {string} imageUrl - URL of item image
 */
function addToCart(itemId, itemName, itemPrice, quantity = 1, imageUrl = null) {
    // Input validation to prevent undefined items
    if (!itemId || !itemName) {
        console.error('Invalid item data:', { itemId, itemName, itemPrice });
        return;
    }
    
    // Ensure itemPrice is a number
    const price = parseFloat(itemPrice);
    if (isNaN(price)) {
        console.error('Invalid price:', itemPrice);
        return;
    }
    
    // Initialize cart items array if it doesn't exist
    if (!window.cart.items) window.cart.items = [];
    
    // Find if item already exists in cart
    const existingItemIndex = window.cart.items.findIndex(item => item.id === itemId);
    
    if (existingItemIndex !== -1) {
        // Update quantity if item exists
        window.cart.items[existingItemIndex].quantity += quantity;
        
        // Update image URL if it wasn't set before but is provided now
        if (imageUrl && !window.cart.items[existingItemIndex].image_url) {
            window.cart.items[existingItemIndex].image_url = imageUrl;
        }
    } else {
        // If no image URL is provided, try to find it from the menu
        if (!imageUrl) {
            const menuItems = document.querySelectorAll('.menu-item, .menu-item-card');
            for (let menuItem of menuItems) {
                if (menuItem.dataset.itemId === itemId) {
                    const img = menuItem.querySelector('img');
                    if (img && img.src) {
                        imageUrl = img.src;
                        break;
                    }
                }
            }
        }
        
        // Add new item if it doesn't exist
        window.cart.items.push({
            id: itemId,
            name: itemName,
            price: price,
            quantity: quantity,
            image_url: imageUrl || '/images/customer/placeholder-food.jpg'
        });
    }
    
    // Update cart totals
    updateCartTotals();
    
    // Save cart to localStorage
    saveCart();
    
    // Update cart display
    updateCartDisplay();
    
    // Show success message
    if (typeof window.showToast === 'function') {
        window.showToast(`${itemName} added to cart`, 'success');
    } else {
        console.log(`${itemName} added to cart`);
    }
    
    // Update cart count badge
    updateCartCount();
}

/**
 * Remove an item from the cart
 * @param {string} itemId - ID of the item to remove
 */
function removeFromCart(itemId) {
    // Handle case where undefined items or objects might be in cart
    if (typeof itemId === 'object' && itemId !== null) {
        console.warn('Attempted to remove item with object instead of ID, cleaning cart', itemId);
        cleanupCart();
        updateCartDisplay();
        return;
    }
    
    if (!window.cart.items) window.cart.items = [];
    const itemIndex = window.cart.items.findIndex(item => {
        // Handle both string and number IDs
        return item && (item.id === itemId || item.id === parseInt(itemId) || item.id === itemId.toString());
    });
    
    if (itemIndex !== -1) {
        const removedItem = window.cart.items[itemIndex];
        window.cart.items.splice(itemIndex, 1);
        
        console.log('Item removed from cart:', removedItem);
        
        // Update cart totals
        updateCartTotals();
        
        // Save cart to localStorage
        saveCart();
        
        // Update cart display
        updateCartDisplay();
        
        // Show removal message
        if (typeof window.showToast === 'function') {
            const itemName = removedItem.name || 'Item';
            window.showToast(`${itemName} removed from cart`, 'info');
        }
        
        // Update cart count badge
        updateCartCount();
    } else {
        // Try to locate undefined item element and remove it
        const itemElement = document.querySelector(`.col-md-6[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.remove();
            cleanupCart(); // Force cleanup of any invalid items
            console.log('Removed invalid cart item visually:', itemId);
        }
    }
}

/**
 * Update the quantity of an item in the cart
 * @param {string} itemId - ID of the item to update
 * @param {number} newQuantity - New quantity value
 */
function updateCartItemQuantity(itemId, newQuantity) {
    if (!window.cart.items) window.cart.items = [];
    const itemIndex = window.cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        if (newQuantity <= 0) {
            removeFromCart(itemId);
            return;
        }
        
        window.cart.items[itemIndex].quantity = newQuantity;
        
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
    // Ensure cart has items property
    if (!window.cart.items) window.cart.items = [];
    
    // Calculate subtotal
    window.cart.subtotal = window.cart.items.reduce((total, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        return total + (price * quantity);
    }, 0);
    
    // Calculate tax (8%)
    window.cart.tax = window.cart.subtotal * 0.08;
    
    // Calculate total
    window.cart.total = window.cart.subtotal + window.cart.tax;
    
    // Add delivery fee if on order page and delivery is selected
    if (window.location.pathname === '/order') {
        const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked');
        if (deliveryMethod && deliveryMethod.value === 'delivery') {
            window.cart.deliveryFee = 3.99;
            window.cart.total += window.cart.deliveryFee;
        } else {
            window.cart.deliveryFee = 0;
        }
    }
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    localStorage.setItem('baklovahCart', JSON.stringify(window.cart));
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
        if (!window.cart.items || window.cart.items.length === 0) {
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
                                    <small>Remove</small>
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
                    const item = window.cart.items.find(item => item.id === itemId);
                    if (item) {
                        updateCartItemQuantity(itemId, item.quantity - 1);
                    }
                });
            });
            
            document.querySelectorAll('.cart-qty-plus').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    const item = window.cart.items.find(item => item.id === itemId);
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
    
    if (cartSubtotal && typeof window.cart.subtotal === 'number') cartSubtotal.textContent = `$${window.cart.subtotal.toFixed(2)}`;
    if (cartTax && typeof window.cart.tax === 'number') cartTax.textContent = `$${window.cart.tax.toFixed(2)}`;
    if (cartTotal && typeof window.cart.total === 'number') cartTotal.textContent = `$${window.cart.total.toFixed(2)}`;
    
    // Update order summary on order page
    
    // Update Items Added section on the order page
    const cartItemsDisplay = document.getElementById('cart-items-display');
    const emptyCartMessageMain = document.querySelector('.empty-cart-message-main');
    
    if (cartItemsDisplay) {
        if (!window.cart.items || window.cart.items.length === 0) {
            // Show empty cart message
            if (emptyCartMessageMain) emptyCartMessageMain.style.display = 'block';
            
            // Clear items
            cartItemsDisplay.innerHTML = `
                <div class="col-12 text-center empty-cart-message-main">
                    <i class="fas fa-shopping-basket fa-3x my-3"></i>
                    <p>Your cart is empty</p>
                    <a href="#" class="btn btn-primary show-popular-items">Browse Popular Items</a>
                </div>
            `;
            
            // Add listener for the "Browse Popular Items" button
            const browsePopularBtn = document.querySelector('.show-popular-items');
            if (browsePopularBtn) {
                browsePopularBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    showPopularItems();
                });
            }
        } else {
            // Hide empty cart message
            if (emptyCartMessageMain) emptyCartMessageMain.style.display = 'none';
            
            // Build cart items HTML with images
            let cartItemsHTML = '';
            window.cart.items.forEach(item => {
                // Make sure we have valid item data
                if (!item || !item.name || !item.id) {
                    return; // Skip invalid items
                }
                
                // Debugging 
                console.log('Item in cart:', item);
                
                // Use item.image_url if available, otherwise try to find it from the menu or use placeholder
                let imageUrl = item.image_url || null;
                if (!imageUrl) {
                    // Try to find image URL from menu items in the DOM
                    const menuItems = document.querySelectorAll('.menu-item, .menu-item-card');
                    for (let menuItem of menuItems) {
                        if (menuItem.dataset.itemId === item.id) {
                            const img = menuItem.querySelector('img');
                            if (img && img.src) {
                                imageUrl = img.src;
                                // Update the item in cart
                                item.image_url = imageUrl;
                                saveCart();
                                break;
                            }
                        }
                    }
                }
                
                // Use placeholder if still no image
                if (!imageUrl) {
                    imageUrl = '/images/customer/placeholder-food.jpg';
                }
                
                cartItemsHTML += `
                    <div class="col-md-6 mb-3" data-item-id="${item.id}">
                        <div class="card h-100 menu-item-card">
                            <div class="row g-0">
                                <div class="col-4 cart-item-image-container">
                                    <img src="${imageUrl}" class="img-fluid rounded-start cart-item-image" alt="${item.name}">
                                </div>
                                <div class="col-8">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <h5 class="card-title">${item.name}</h5>
                                            <span class="menu-item-price">$${parseFloat(item.price).toFixed(2)}</span>
                                        </div>
                                        <div class="d-flex align-items-center mt-2">
                                            <div class="input-group input-group-sm quantity-control me-2">
                                                <button class="btn btn-outline-secondary cart-qty-minus" type="button" data-item-id="${item.id}">-</button>
                                                <input type="number" class="form-control text-center cart-item-qty" value="${item.quantity}" min="1" max="10" data-item-id="${item.id}">
                                                <button class="btn btn-outline-secondary cart-qty-plus" type="button" data-item-id="${item.id}">+</button>
                                            </div>
                                            <button class="btn btn-danger btn-sm remove-from-cart-btn" data-item-id="${item.id}">
                                                <i class="fas fa-trash-alt"></i> Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            cartItemsDisplay.innerHTML = cartItemsHTML;
            
            // Add event listeners to cart item buttons in the Items Added section
            document.querySelectorAll('.cart-qty-minus').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    const item = window.cart.items.find(item => item.id === itemId);
                    if (item && item.quantity > 1) {
                        updateCartItemQuantity(itemId, item.quantity - 1);
                    } else if (item && item.quantity <= 1) {
                        if (confirm('Do you want to remove this item from your cart?')) {
                            removeFromCart(itemId);
                        }
                    }
                });
            });
            
            document.querySelectorAll('.cart-qty-plus').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    const item = window.cart.items.find(item => item.id === itemId);
                    if (item) {
                        updateCartItemQuantity(itemId, item.quantity + 1);
                    }
                });
            });
            
            document.querySelectorAll('.cart-item-qty').forEach(input => {
                input.addEventListener('change', function() {
                    const itemId = this.dataset.itemId;
                    const newQuantity = parseInt(this.value);
                    if (!isNaN(newQuantity) && newQuantity > 0) {
                        updateCartItemQuantity(itemId, newQuantity);
                    } else {
                        // Reset to 1 if invalid input
                        this.value = 1;
                        updateCartItemQuantity(itemId, 1);
                    }
                });
            });
            
            document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    removeFromCart(itemId);
                });
            });
        }
    }
    updateOrderSummary();
    
    // Update cart count badge
    updateCartCount();
}
updateOrderSummary();

// Update cart count badge
updateCartCount();

/**
 * Update the order summary on the order page
 */
function updateOrderSummary() {
    // Update order summary on order page
    const orderSubtotal = document.getElementById('order-subtotal');
    const orderTax = document.getElementById('order-tax');
    const deliveryFee = document.getElementById('delivery-fee');
    const orderTotal = document.getElementById('order-total');
    const orderItems = document.getElementById('order-items');

    // Safely update order summary elements
    if (orderSubtotal && typeof window.cart.subtotal === 'number') {
        orderSubtotal.textContent = `$${window.cart.subtotal.toFixed(2)}`;
    }
    if (orderTax && typeof window.cart.tax === 'number') {
        orderTax.textContent = `$${window.cart.tax.toFixed(2)}`;
    }
    if (deliveryFee && typeof window.cart.deliveryFee === 'number') {
        deliveryFee.textContent = `$${window.cart.deliveryFee.toFixed(2)}`;
    }
    if (orderTotal && typeof window.cart.total === 'number') {
        orderTotal.textContent = `$${window.cart.total.toFixed(2)}`;
    }

    if (orderItems) {
        if (!window.cart.items || window.cart.items.length === 0) {
            // Show empty cart message
            const emptyCartMessage = document.querySelector('#order-items .empty-cart-message');
            if (emptyCartMessage) emptyCartMessage.classList.remove('d-none');

            // Clear items
            orderItems.innerHTML = `
                <div class="text-center empty-cart-message">
                    <i class="fas fa-shopping-basket fa-3x mb-3"></i>
                    <p>Your cart is empty</p>
                    <a href="#select-items-section" class="btn btn-primary">Add Items</a>
                </div>
            `;
        } else {
            // Hide empty cart message
            const emptyCartMessage = document.querySelector('#order-items .empty-cart-message');
            if (emptyCartMessage) emptyCartMessage.classList.add('d-none');

            // Build order items HTML
            let orderItemsHTML = '';
            window.cart.items.forEach(item => {
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

            orderItems.innerHTML = orderItemsHTML;

            // Add event listeners to order item remove buttons
            document.querySelectorAll('.order-item-remove').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.dataset.itemId;
                    removeFromCart(itemId);
                });
            });
        }
    }
}

/**
 * Update the cart count badge
 */
function updateCartCount() {
    const cartCountBadge = document.querySelector('.cart-count');
    if (cartCountBadge) {
        // Ensure cart has items property
        if (!window.cart.items) window.cart.items = [];

        const itemCount = window.cart.items.reduce((count, item) => {
            return count + (parseInt(item.quantity) || 0);
        }, 0);

        cartCountBadge.textContent = itemCount;

        if (itemCount > 0) {
            cartCountBadge.classList.remove('d-none');
        } else {
            cartCountBadge.classList.add('d-none');
        }
    }
}

/**
 * Clear the entire cart
 */
function clearCart() {
    window.cart = { items: [], subtotal: 0, tax: 0, total: 0 };
    saveCart();
    updateCartDisplay();
    updateCartCount();
    if (typeof window.showToast === 'function') {
        window.showToast('Cart has been cleared', 'info');
    }
}

// Expose functions to global scope for use in other scripts
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.clearCart = clearCart;
