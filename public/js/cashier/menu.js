/**
 * Baklovah Restaurant - Cashier Menu Management
 * Handles menu functionality for the cashier interface
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Menu.js loaded');
    
    // Initialize with a slight delay to ensure cart.js is loaded
    setTimeout(() => {
        initializeMenuFiltering();
        initializeMenuSearch();
        initializeAddToOrderButtons();
    }, 300);
});

// Initialize menu category filtering
function initializeMenuFiltering() {
    const categoryButtons = document.querySelectorAll('.category-filter-btn');
    const menuItems = document.querySelectorAll('.menu-item');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const selectedCategory = this.getAttribute('data-category');
            
            // Show/hide menu items based on category
            menuItems.forEach(item => {
                if (selectedCategory === 'all' || item.getAttribute('data-category') === selectedCategory) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// Initialize menu search functionality
function initializeMenuSearch() {
    console.log('Initializing menu search...');
    const searchInput = document.getElementById('menu-search');
    const searchBtn = document.getElementById('search-btn');
    const menuItems = document.querySelectorAll('.menu-item');
    const categoryButtons = document.querySelectorAll('.category-filter-btn');
    
    // Check if elements exist
    if (!searchInput || !searchBtn) {
        console.warn('Search elements not found, skipping search initialization');
        return;
    }
    
    console.log('Search elements found, setting up event handlers');
    
    // Function to perform search
    const performSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log('Searching for:', searchTerm);
        
        // If search term is empty, reset to show all
        if (searchTerm === '') {
            menuItems.forEach(item => {
                item.style.display = '';
            });
            return;
        }
        
        menuItems.forEach(item => {
            const title = item.querySelector('.card-title').textContent.toLowerCase();
            const description = item.querySelector('.card-text')?.textContent.toLowerCase() || '';
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Reset category filter when searching
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        
        // Set 'All' as active
        document.querySelector('.category-filter-btn[data-category="all"]').classList.add('active');
    };

    searchBtn.addEventListener('click', performSearch);
    
    // Search when Enter key is pressed
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    console.log('Search functionality initialized');
}

// Initialize add to order buttons
function initializeAddToOrderButtons() {
    console.log('Setting up Add to Order buttons...');
    
    // First remove any existing click handlers by cloning and replacing buttons
    const addButtons = document.querySelectorAll('.add-to-order-btn');
    console.log(`Found ${addButtons.length} Add buttons`);
    
    addButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
    });
    
    // Now add fresh event listeners - using direct dataset properties like in the customer implementation
    document.querySelectorAll('.add-to-order-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get item details directly from the button dataset
            const itemId = this.dataset.id;
            let itemName = '';
            
            try {
                // Try to get the name from dataset, defaulting to the text content of the nearest title if necessary
                itemName = decodeURIComponent(this.dataset.name || '');
                
                // If itemName is still empty or 'undefined', try to find it in the card
                if (!itemName || itemName === 'undefined') {
                    const card = this.closest('.menu-item-card');
                    if (card) {
                        const titleElement = card.querySelector('.card-title');
                        if (titleElement) {
                            itemName = titleElement.textContent.trim();
                        }
                    }
                }
            } catch (e) {
                console.error('Error decoding item name:', e);
            }
            
            const itemPrice = parseFloat(this.dataset.price);
            
            // For debugging
            console.log('Button dataset:', this.dataset);
            console.log('Item name from dataset:', itemName);
            
            // Get image URL from parent container
            let imageUrl = null;
            const menuItem = this.closest('.menu-item');
            if (menuItem) {
                imageUrl = menuItem.dataset.image || menuItem.getAttribute('data-image');
            }
            
            console.log('Adding to cart using direct dataset access:', { itemId, itemName, itemPrice, imageUrl });
            
            // Check if window.addToOrder exists
            if (typeof window.addToOrder === 'function') {
                window.addToOrder(itemId, itemName, itemPrice, 1, imageUrl);
                
                // Visual feedback
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Added';
                this.classList.add('btn-success');
                this.classList.remove('btn-primary');
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.classList.add('btn-primary');
                    this.classList.remove('btn-success');
                }, 1000);
                
            } else {
                console.error('addToOrder function not found');
                alert('Error: Could not add item to order');
            }
        });
    });
    
    console.log('Add buttons setup complete');
}

// Initialize cart-related buttons
function initializeCartButtons() {
    // Proceed to checkout button
    document.getElementById('proceed-to-checkout').addEventListener('click', function() {
        if (window.cashierCart.items.length > 0) {
            window.location.href = '/cashier/checkout';
        } else {
            showToast('Add items to the order first', 'warning');
        }
    });
}

// Add to cart functionality
function initAddToCartButtons() {
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            const itemName = this.getAttribute('data-item-name');
            const itemPrice = parseFloat(this.getAttribute('data-item-price'));
            const itemImage = this.getAttribute('data-item-image');
            
            addToCart(itemId, itemName, itemPrice, 1, itemImage);
        });
    });
}

// Add item to cart
function addToCart(itemId, itemName, itemPrice, quantity = 1, imageUrl = null) {
    if (!itemId || !itemName) {
        console.error('Invalid item data:', { itemId, itemName, itemPrice });
        return;
    }
    
    if (!window.cashierCart.items) window.cashierCart.items = [];
    
    const existingItemIndex = window.cashierCart.items.findIndex(item => item.id === itemId);
    
    if (existingItemIndex !== -1) {
        // Update quantity if item exists
        window.cashierCart.items[existingItemIndex].quantity += quantity;
    } else {
        // Add new item to cart
        window.cashierCart.items.push({
            id: itemId,
            name: itemName,
            price: itemPrice,
            quantity: quantity,
            image_url: imageUrl || '/images/customer/placeholder-food.jpg'
        });
    }
    
    // Update order display
    updateOrderDisplay();
    
    // Show success notification
    showToast(`${itemName} added to order`, 'success');
    
    // Update cart count badge
    updateCartCount();
}

// Remove item from cart
function removeFromCart(itemId) {
    if (!window.cashierCart.items) window.cashierCart.items = [];
    
    const itemIndex = window.cashierCart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        const removedItem = window.cashierCart.items[itemIndex];
        window.cashierCart.items.splice(itemIndex, 1);
        
        // Update order display
        updateOrderDisplay();
        
        // Show notification
        showToast(`${removedItem.name} removed from order`, 'info');
        
        // Update cart count
        updateCartCount();
    }
}

// Update cart item quantity
function updateCartItemQuantity(itemId, newQuantity) {
    if (!window.cashierCart.items) window.cashierCart.items = [];
    
    const item = window.cashierCart.items.find(item => item.id === itemId);
    
    if (item) {
        if (newQuantity <= 0) {
            // Remove item if quantity is 0 or less
            removeFromCart(itemId);
        } else if (newQuantity <= 100) { // Setting a reasonable max quantity
            item.quantity = newQuantity;
            updateOrderDisplay();
            updateCartCount();
        }
    }
}

// Update order display in the current order panel
function updateOrderDisplay() {
    const orderItemsContainer = document.getElementById('current-order-items');
    const orderSummary = document.getElementById('order-summary');
    const emptyOrderMessage = document.querySelector('.empty-order-message');
    
    if (!orderItemsContainer) return;
    
    if (!window.cashierCart.items || window.cashierCart.items.length === 0) {
        // Show empty cart message
        if (emptyOrderMessage) emptyOrderMessage.style.display = 'block';
        if (orderSummary) orderSummary.classList.add('d-none');
        
        orderItemsContainer.innerHTML = `
            <div class="text-center py-4 empty-order-message">
                <i class="fas fa-shopping-cart fa-3x mb-3 text-secondary"></i>
                <p class="lead">No items in current order</p>
                <p class="text-muted">Add items from the menu to create an order</p>
            </div>
        `;
    } else {
        // Hide empty cart message
        if (emptyOrderMessage) emptyOrderMessage.style.display = 'none';
        if (orderSummary) orderSummary.classList.remove('d-none');
        
        // Clear previous items
        orderItemsContainer.innerHTML = '';
        
        // Add each item to the order display
        window.cashierCart.items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.classList.add('d-flex', 'justify-content-between', 'align-items-center', 'mb-3', 'border-bottom', 'pb-2');
            itemRow.innerHTML = `
                <div>
                    <h6 class="mb-0">${item.name}</h6>
                    <span class="text-secondary">${formatCurrency(item.price)} each</span>
                </div>
                <div class="d-flex align-items-center">
                    <div class="input-group input-group-sm" style="width: 100px;">
                        <button class="btn btn-outline-secondary qty-minus-btn" type="button" data-item-id="${item.id}">-</button>
                        <input type="number" class="form-control text-center item-qty" value="${item.quantity}" min="1" max="100" data-item-id="${item.id}">
                        <button class="btn btn-outline-secondary qty-plus-btn" type="button" data-item-id="${item.id}">+</button>
                    </div>
                    <button class="btn btn-sm btn-danger ms-2 remove-item-btn" data-item-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            orderItemsContainer.appendChild(itemRow);
        });
        
        // Update totals
        const { subtotal, tax, total } = updateCartTotals();
        
        document.getElementById('order-subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('order-tax').textContent = formatCurrency(tax);
        document.getElementById('order-total').textContent = formatCurrency(total);
        
        // Add event listeners to quantity control buttons
        document.querySelectorAll('.qty-minus-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                const item = window.cashierCart.items.find(item => item.id === itemId);
                if (item) {
                    updateCartItemQuantity(itemId, item.quantity - 1);
                }
            });
        });
        
        document.querySelectorAll('.qty-plus-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                const item = window.cashierCart.items.find(item => item.id === itemId);
                if (item) {
                    updateCartItemQuantity(itemId, item.quantity + 1);
                }
            });
        });
        
        document.querySelectorAll('.item-qty').forEach(input => {
            input.addEventListener('change', function() {
                const itemId = this.getAttribute('data-item-id');
                const newQuantity = parseInt(this.value);
                if (!isNaN(newQuantity)) {
                    updateCartItemQuantity(itemId, newQuantity);
                }
            });
        });
        
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                removeFromCart(itemId);
            });
        });
    }
}
