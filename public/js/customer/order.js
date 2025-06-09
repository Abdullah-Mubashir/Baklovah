/**
 * Baklovah Restaurant - Order Page JavaScript
 * Handles order page functionality for the customer-facing website
 */

// Function to load menu items
function loadMenuItems() {
    fetch('/api/menu')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.menuItems = data.data;
                console.log('Menu items loaded:', window.menuItems.length);
            } else {
                console.error('Failed to load menu items:', data.message);
                window.menuItems = [];
            }
        })
        .catch(error => {
            console.error('Error loading menu items:', error);
            window.menuItems = [];
        });
}

// Function to initialize cart
function initializeCart() {
    // Check if cart exists in localStorage
    const savedCart = localStorage.getItem('baklovahCart');
    
    if (savedCart) {
        try {
            // Parse saved cart data
            const parsedCart = JSON.parse(savedCart);
            window.cart = parsedCart;
            console.log('Cart loaded from localStorage:', window.cart);
        } catch (error) {
            console.error('Error parsing saved cart:', error);
            // Initialize empty cart if parsing fails
            window.cart = {
                items: [],
                subtotal: 0,
                tax: 0,
                total: 0,
                deliveryFee: 0,
                discount: 0
            };
        }
    } else {
        // Initialize empty cart if no saved cart exists
        window.cart = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0,
            deliveryFee: 0,
            discount: 0
        };
        console.log('Initialized empty cart');
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cart
    initializeCart();
    
    // Load menu items
    loadMenuItems();
    
    // Initialize order steps navigation
    initOrderStepsNavigation();
    
    // Handle delivery method change
    handleDeliveryMethodChange();
    
    // Initialize address fields required state based on initial delivery method
    const deliveryRadio = document.getElementById('delivery');
    const pickupRadio = document.getElementById('pickup');
    if (deliveryRadio && pickupRadio) {
        toggleAddressFieldsRequired(deliveryRadio.checked);
    }
    
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
        placeOrderBtn.addEventListener('click', async function() {
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
                
                // Make address fields required
                toggleAddressFieldsRequired(true);
                
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
                
                // Make address fields not required
                toggleAddressFieldsRequired(false);
                
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
 * Toggle the required attribute on address fields based on delivery method
 * @param {boolean} isRequired - Whether the fields should be required
 */
function toggleAddressFieldsRequired(isRequired) {
    const addressFields = ['address', 'city', 'state', 'zip'];
    addressFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (isRequired) {
                field.setAttribute('required', '');
            } else {
                field.removeAttribute('required');
            }
        }
    });
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
 * This function is now just a wrapper around the payment.js functionality
 */
function initStripeElements() {
    // This is now handled in payment.js
    // initializeStripe() is called from payment.js when the payment section becomes active
    console.log('Stripe elements initialization delegated to payment.js');
}

/**
 * Update confirmation details after order is placed
 * @param {string} orderNumber - The order number from the server
 * @param {number} orderId - The order ID from the server
 */
function updateConfirmationDetails(orderNumber, orderId) {
    // Set the order number from the server
    document.getElementById('order-number').textContent = orderNumber;
    
    // Store the order ID for order tracking
    window.orderId = orderId;
    
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
    // Connect order placement logic to payment processing
    // Get the place order button
    const placeOrderBtn = document.getElementById('place-order');
    
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async function(event) {
            event.preventDefault();
            
            // Disable button to prevent multiple submissions
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            try {
                // Get form data
                const customerName = document.getElementById('name').value;
                const customerEmail = document.getElementById('email').value;
                const customerPhone = document.getElementById('phone').value;
                
                // Get order notes with a check for element existence
                const orderNotesElement = document.getElementById('order-notes');
                const orderNotes = orderNotesElement ? orderNotesElement.value : '';
                
                // Get selected payment method
                const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
                
                // Get delivery method
                const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked').value;
                
                // For pickup orders, we don't need delivery address
                const deliveryAddress = null;
                
                // Get pickup time
                const pickupTime = document.getElementById('pickup-time').value;
                
                // Prepare item data for order submission
                const orderItems = cart.items.map(item => {
                    return {
                        menu_item_id: item.id,
                        quantity: item.quantity,
                        notes: item.notes || ''
                    };
                });
                
                // Ensure cart data is valid
                if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
                    throw new Error('Your cart is empty. Please add items before placing an order.');
                }
                
                // Make sure we have valid total amounts
                const safeTotal = parseFloat(cart.total) || 0;
                const safeSubtotal = parseFloat(cart.subtotal) || 0;
                const safeTax = parseFloat(cart.tax) || 0;
                const safeDeliveryFee = parseFloat(cart.deliveryFee) || 0;
                const safeDiscount = parseFloat(cart.discount) || 0;
                
                // Ensure we have the global menuItems list
                if (!window.menuItems || !Array.isArray(window.menuItems) || window.menuItems.length === 0) {
                    console.log('Menu items not loaded yet, loading now...');
                    try {
                        // Load menu items synchronously
                        const response = await fetch('/api/menu');
                        const data = await response.json();
                        if (data.success) {
                            window.menuItems = data.data;
                            console.log('Menu items loaded successfully:', window.menuItems.length);
                        } else {
                            console.error('Failed to load menu items:', data.message);
                            window.showToast('Failed to load menu items. Please try again.', 'error');
                            return false;
                        }
                    } catch (error) {
                        console.error('Error loading menu items:', error);
                        window.showToast('Failed to load menu items. Please try again.', 'error');
                        return false;
                    }
                }
                
                // Create order data object with robust error handling
                const orderData = {
                    customer_name: customerName || 'Guest',
                    customer_email: customerEmail || '',
                    customer_phone: customerPhone || '',
                    delivery_method: 'pickup',
                    pickup_time: pickupTime || 'asap',
                    payment_method: 'card', // Force card payment
                    items: orderItems.map(item => {
                        // Make sure each item has a price and all required fields
                        const menuItem = window.menuItems.find(menuItem => menuItem.id === item.menu_item_id);
                        if (!menuItem) {
                            console.warn(`Menu item not found for ID: ${item.menu_item_id}. Using fallback price.`);
                        }
                        return {
                            menu_item_id: item.menu_item_id,
                            id: item.menu_item_id, // Include both formats for compatibility
                            quantity: parseInt(item.quantity) || 1,
                            price: menuItem ? parseFloat(menuItem.price) : (item.price || 0),
                            notes: item.notes || ''
                        };
                    }),
                    total_amount: Math.round(safeTotal * 100), // Convert to cents for Stripe
                    subtotal: Math.round(safeSubtotal * 100), // Convert to cents for Stripe
                    tax: Math.round(safeTax * 100), // Convert to cents for Stripe
                    delivery_fee: Math.round(safeDeliveryFee * 100), // Convert to cents for Stripe
                    discount: Math.round(safeDiscount * 100), // Convert to cents for Stripe
                    notes: orderNotes || ''
                };
                
                // Log order data for debugging
                console.log('Submitting order data:', orderData);
                
                // Process order with payment
                const orderResult = await window.submitOrderWithPayment(orderData);
                
                if (!orderResult.success) {
                    throw new Error(orderResult.message || 'Failed to place order');
                }
                
                // Store order number and order ID for confirmation
                window.orderNumber = orderResult.orderNumber;
                window.orderId = orderResult.orderId;
                
                // Hide step 3, show step 4
                document.getElementById('payment-section').classList.add('d-none');
                document.getElementById('confirmation-section').classList.remove('d-none');
                
                // Update active step
                document.getElementById('step-3').classList.remove('active');
                document.getElementById('step-3').classList.add('completed');
                document.getElementById('step-4').classList.add('active');
                
                // Update confirmation details
                updateConfirmationDetails(orderResult.orderNumber, orderResult.orderId);
                
                // Clear cart after successful order
                clearCart();
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Show success toast
                window.showToast('Order placed successfully!', 'success');
            } catch (error) {
                console.error('Error placing order:', error);
                window.showToast(error.message || 'Failed to place order. Please try again.', 'error');
                
                // Check if we should retry payment
                if (error.message && error.message.includes('retry') || (error.retry === true)) {
                    window.showToast('Payment failed, please retry.', 'error');
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.innerHTML = 'Retry Payment <i class="fas fa-check"></i>';
                } else {
                    // Re-enable button
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.innerHTML = 'Place Order <i class="fas fa-check"></i>';
                }
            }
        });
    } else {
        window.showToast('Please select a payment method', 'error');
    }
}
