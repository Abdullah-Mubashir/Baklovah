/**
 * Baklovah Restaurant - Order Page JavaScript
 * Handles order page functionality for the customer-facing website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize order steps navigation
    initOrderStepsNavigation();
    
    // Handle delivery method change
    handleDeliveryMethodChange();
    
    // Handle payment method change
    handlePaymentMethodChange();
    
    // Initialize category buttons
    initCategoryButtons();
    
    // Initialize menu search
    initMenuSearch();
    
    // Load menu items for ordering
    loadOrderMenuItems();
    
    // Initialize Stripe elements (placeholder for now)
    initStripeElements();
    
    // Handle order submission
    initOrderSubmission();
});

/**
 * Initialize order steps navigation
 */
function initOrderStepsNavigation() {
    // Step 1 to Step 2 (Items to Delivery)
    const proceedToDeliveryBtn = document.getElementById('proceed-to-delivery');
    if (proceedToDeliveryBtn) {
        proceedToDeliveryBtn.addEventListener('click', function() {
            // Check if cart has items
            if (cart.items.length === 0) {
                window.showToast('Please add items to your cart before proceeding', 'warning');
                return;
            }
            
            // Hide step 1, show step 2
            document.getElementById('select-items-section').classList.add('d-none');
            document.getElementById('delivery-info-section').classList.remove('d-none');
            
            // Update active step
            document.getElementById('step-1').classList.remove('active');
            document.getElementById('step-1').classList.add('completed');
            document.getElementById('step-2').classList.add('active');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Back to Step 1 (Delivery to Items)
    const backToItemsBtn = document.getElementById('back-to-items');
    if (backToItemsBtn) {
        backToItemsBtn.addEventListener('click', function() {
            // Show step 1, hide step 2
            document.getElementById('select-items-section').classList.remove('d-none');
            document.getElementById('delivery-info-section').classList.add('d-none');
            
            // Update active step
            document.getElementById('step-2').classList.remove('active');
            document.getElementById('step-1').classList.remove('completed');
            document.getElementById('step-1').classList.add('active');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Step 2 to Step 3 (Delivery to Payment)
    const proceedToPaymentBtn = document.getElementById('proceed-to-payment');
    if (proceedToPaymentBtn) {
        proceedToPaymentBtn.addEventListener('click', function() {
            // Validate delivery form
            const deliveryForm = document.getElementById('delivery-form');
            if (!deliveryForm.checkValidity()) {
                deliveryForm.reportValidity();
                return;
            }
            
            // Hide step 2, show step 3
            document.getElementById('delivery-info-section').classList.add('d-none');
            document.getElementById('payment-section').classList.remove('d-none');
            
            // Update active step
            document.getElementById('step-2').classList.remove('active');
            document.getElementById('step-2').classList.add('completed');
            document.getElementById('step-3').classList.add('active');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Back to Step 2 (Payment to Delivery)
    const backToDeliveryBtn = document.getElementById('back-to-delivery');
    if (backToDeliveryBtn) {
        backToDeliveryBtn.addEventListener('click', function() {
            // Show step 2, hide step 3
            document.getElementById('delivery-info-section').classList.remove('d-none');
            document.getElementById('payment-section').classList.add('d-none');
            
            // Update active step
            document.getElementById('step-3').classList.remove('active');
            document.getElementById('step-2').classList.remove('completed');
            document.getElementById('step-2').classList.add('active');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Step 3 to Step 4 (Payment to Confirmation)
    const placeOrderBtn = document.getElementById('place-order');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', function() {
            // Simulate order processing
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            // Simulate API call delay
            setTimeout(() => {
                // Hide step 3, show step 4
                document.getElementById('payment-section').classList.add('d-none');
                document.getElementById('confirmation-section').classList.remove('d-none');
                
                // Update active step
                document.getElementById('step-3').classList.remove('active');
                document.getElementById('step-3').classList.add('completed');
                document.getElementById('step-4').classList.add('active');
                
                // Update confirmation details
                updateConfirmationDetails();
                
                // Clear cart after successful order
                clearCart();
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 2000);
        });
    }
}

/**
 * Handle delivery method change
 */
function handleDeliveryMethodChange() {
    const deliveryRadio = document.getElementById('delivery');
    const pickupRadio = document.getElementById('pickup');
    const deliveryAddressSection = document.getElementById('delivery-address-section');
    const pickupSection = document.getElementById('pickup-section');
    const deliveryFeeRow = document.querySelector('.delivery-fee-row');
    
    if (deliveryRadio && pickupRadio) {
        deliveryRadio.addEventListener('change', function() {
            if (this.checked) {
                deliveryAddressSection.classList.remove('d-none');
                pickupSection.classList.add('d-none');
                
                // Add delivery fee
                cart.deliveryFee = 3.99;
                updateCartTotals();
                saveCart();
                updateCartDisplay();
                
                // Show delivery fee in order summary
                if (deliveryFeeRow) deliveryFeeRow.classList.remove('d-none');
            }
        });
        
        pickupRadio.addEventListener('change', function() {
            if (this.checked) {
                deliveryAddressSection.classList.add('d-none');
                pickupSection.classList.remove('d-none');
                
                // Remove delivery fee
                cart.deliveryFee = 0;
                updateCartTotals();
                saveCart();
                updateCartDisplay();
                
                // Hide delivery fee in order summary
                if (deliveryFeeRow) deliveryFeeRow.classList.add('d-none');
            }
        });
    }
}

/**
 * Handle payment method change
 */
function handlePaymentMethodChange() {
    const cardRadio = document.getElementById('card');
    const cashRadio = document.getElementById('cash');
    const cardPaymentSection = document.getElementById('card-payment-section');
    const cashPaymentSection = document.getElementById('cash-payment-section');
    
    if (cardRadio && cashRadio) {
        cardRadio.addEventListener('change', function() {
            if (this.checked) {
                cardPaymentSection.classList.remove('d-none');
                cashPaymentSection.classList.add('d-none');
            }
        });
        
        cashRadio.addEventListener('change', function() {
            if (this.checked) {
                cardPaymentSection.classList.add('d-none');
                cashPaymentSection.classList.remove('d-none');
            }
        });
    }
}

/**
 * Initialize category buttons
 */
function initCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('btn-primary', 'text-white'));
            categoryButtons.forEach(btn => btn.classList.add('btn-outline-primary'));
            
            // Add active class to clicked button
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-primary', 'text-white');
            
            // Show selected category items
            showCategoryItems(category);
        });
    });
}

/**
 * Initialize menu search
 */
function initMenuSearch() {
    const searchInput = document.getElementById('menu-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            
            if (searchTerm === '') {
                // If search is cleared, show the active category
                const activeCategory = document.querySelector('.category-btn.btn-primary');
                if (activeCategory) {
                    showCategoryItems(activeCategory.dataset.category);
                } else {
                    showCategoryItems('popular');
                }
                return;
            }
            
            // Search all menu items
            searchMenuItems(searchTerm);
        });
    }
}

/**
 * Show menu items for a specific category
 * @param {string} category - Category to show
 */
function showCategoryItems(category) {
    // This will be replaced with actual API data
    // For now, we're just toggling visibility of the sample items
    
    // Hide all category sections
    const categoryContainers = document.querySelectorAll('.menu-category');
    categoryContainers.forEach(container => {
        container.classList.add('d-none');
    });
    
    // Show selected category
    const selectedCategory = document.getElementById(`${category}-items`);
    if (selectedCategory) {
        selectedCategory.classList.remove('d-none');
    } else {
        // If category doesn't exist, show popular items
        const popularItems = document.getElementById('popular-items');
        if (popularItems) popularItems.classList.remove('d-none');
    }
}

/**
 * Search menu items
 * @param {string} searchTerm - Term to search for
 */
function searchMenuItems(searchTerm) {
    // This will be replaced with actual search functionality
    // For now, we're just showing a placeholder message
    
    // Hide all category sections
    const categoryContainers = document.querySelectorAll('.menu-category');
    categoryContainers.forEach(container => {
        container.classList.add('d-none');
    });
    
    // Show popular items with a search message
    const popularItems = document.getElementById('popular-items');
    if (popularItems) {
        popularItems.classList.remove('d-none');
        popularItems.querySelector('h4').textContent = `Search Results for "${searchTerm}"`;
    }
}

/**
 * Load menu items for the order page
 */
function loadOrderMenuItems() {
    // This will be replaced with actual API calls
    // For now, we're using the static HTML content
    console.log('Order menu items loaded (placeholder)');
}

/**
 * Initialize Stripe elements for payment
 * This is a placeholder for future Stripe integration
 */
function initStripeElements() {
    // This will be replaced with actual Stripe integration
    console.log('Stripe elements ready for implementation');
}

/**
 * Update confirmation details after order is placed
 */
function updateConfirmationDetails() {
    // Generate random order number
    const orderNumber = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('order-number').textContent = orderNumber;
    
    // Set estimated time based on delivery method
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked');
    let estimatedTime = '30-45 minutes';
    
    if (deliveryMethod && deliveryMethod.value === 'pickup') {
        const pickupTime = document.getElementById('pickup-time').value;
        switch (pickupTime) {
            case 'asap':
                estimatedTime = '15-20 minutes';
                break;
            case '30min':
                estimatedTime = '30 minutes';
                break;
            case '1hour':
                estimatedTime = '1 hour';
                break;
            case '2hours':
                estimatedTime = '2 hours';
                break;
            default:
                estimatedTime = '30-45 minutes';
        }
    }
    
    document.getElementById('estimated-time').textContent = estimatedTime;
    
    // Set confirmation email
    const email = document.getElementById('email').value;
    document.getElementById('confirmation-email').textContent = email;
}

/**
 * Initialize order submission
 */
function initOrderSubmission() {
    // This will be expanded with actual order submission logic
    console.log('Order submission ready for implementation');
    
    // Apply promo code button
    const applyPromoBtn = document.getElementById('apply-promo');
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', function() {
            const promoCode = document.getElementById('promo-code').value.trim();
            
            if (promoCode === '') {
                window.showToast('Please enter a promo code', 'warning');
                return;
            }
            
            // Simulate promo code validation
            if (promoCode.toLowerCase() === 'welcome10') {
                // Apply 10% discount
                cart.discount = cart.subtotal * 0.1;
                cart.total = cart.subtotal + cart.tax - cart.discount;
                if (cart.deliveryFee) cart.total += cart.deliveryFee;
                
                saveCart();
                updateCartDisplay();
                
                window.showToast('Promo code applied: 10% discount', 'success');
                
                // Add discount line to order summary
                const orderTotals = document.querySelector('.order-totals');
                const totalRow = document.querySelector('.order-totals div:last-child');
                
                if (orderTotals && totalRow) {
                    // Check if discount row already exists
                    let discountRow = document.querySelector('.discount-row');
                    
                    if (!discountRow) {
                        // Create discount row
                        discountRow = document.createElement('div');
                        discountRow.className = 'discount-row d-flex justify-content-between mb-2 text-success';
                        discountRow.innerHTML = `
                            <span>Discount (10%):</span>
                            <span id="order-discount">-$${cart.discount.toFixed(2)}</span>
                        `;
                        
                        // Insert before total row
                        orderTotals.insertBefore(discountRow, totalRow);
                    } else {
                        // Update existing discount row
                        document.getElementById('order-discount').textContent = `-$${cart.discount.toFixed(2)}`;
                    }
                }
            } else {
                window.showToast('Invalid promo code', 'error');
            }
        });
    }
}
