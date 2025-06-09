/**
 * Baklovah Restaurant - Stripe Payment Integration
 * Handles client-side payment processing for customer orders
 */

// Initialize variables
let stripe = null;
let elements = null;
let cardElement = null;
let paymentIntentId = null;
let orderData = {};

// Explicitly expose the submitOrderWithPayment function to the global window object
window.submitOrderWithPayment = async function(orderData) {
    console.log('submitOrderWithPayment called with data:', orderData);
    try {
        let paymentResult = { success: true };
        
        // Process payment if using credit card
        if (orderData.payment_method === 'card') {
            paymentResult = await processPayment(orderData);
            
            if (!paymentResult.success) {
                return {
                    success: false,
                    message: paymentResult.error || 'Payment processing failed'
                };
            }
            
            // Add payment info to order data as token for storage
            orderData.paymentIntentId = paymentIntentId;
            orderData.paymentStatus = 'authorized';
        }
        
        // Submit order to server
        console.log('Sending order data to server:', JSON.stringify(orderData));
        
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to create order');
        }
        
        return {
            success: true,
            orderNumber: result.orderNumber || '000000',
            orderId: result.orderId || 0
        };
    } catch (error) {
        console.error('Error in submitOrderWithPayment:', error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred'
        };
    }
};

console.log('Payment.js loaded and window.submitOrderWithPayment defined:', typeof window.submitOrderWithPayment);

// Initialize Stripe when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event in payment.js');
    // Initialize Stripe
    initializeStripe();
    
    // Handle payment method changes
    const cardRadio = document.getElementById('card');
    if (cardRadio) {
        cardRadio.addEventListener('change', function() {
            if (this.checked) {
                // Make sure Stripe is initialized when card payment is selected
                if (!stripe || !elements) {
                    initializeStripe();
                }
                document.getElementById('card-payment-section').classList.remove('d-none');
            } else {
                document.getElementById('card-payment-section').classList.add('d-none');
            }
        });
    }
    
    // Handle cash payment option
    const cashRadio = document.getElementById('cash');
    if (cashRadio) {
        cashRadio.addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('card-payment-section').classList.add('d-none');
            }
        });
    }
    
    // Set up place order button
    const placeOrderButton = document.getElementById('place-order');
    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', handlePlaceOrder);
    }
    
    console.log('Payment.js initialized');
});

// Initialize Stripe
function initializeStripe() {
    try {
        // Get Stripe public key from meta tag
        const stripePublicKeyMeta = document.querySelector('meta[name="stripe-public-key"]');
        const stripePublicKey = stripePublicKeyMeta ? stripePublicKeyMeta.getAttribute('content') : null;
        
        // Check if Stripe public key is available
        if (!stripePublicKey) {
            console.error('Stripe public key is not available');
            displayPaymentError('Payment system configuration error. Please try again later.');
            return;
        }

        // Initialize Stripe
        stripe = Stripe(stripePublicKey);
        elements = stripe.elements();

        // Create card element
        cardElement = elements.create('card', {
            style: {
                base: {
                    color: '#32325d',
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                }
            }
        });

        // Mount the card element to the DOM
        const cardElementContainer = document.getElementById('card-element');
        
        if (cardElementContainer) {
            // Clear any existing content
            cardElementContainer.innerHTML = '';
            
            // Mount card element
            cardElement.mount('#card-element');

            // Add event listener for change events
            cardElement.addEventListener('change', function(event) {
                const displayError = document.getElementById('card-errors');
                
                if (event.error) {
                    displayError.textContent = event.error.message;
                } else {
                    displayError.textContent = '';
                }
            });

            console.log('Stripe card element initialized successfully');
        } else {
            console.error('Card element container not found');
        }
    } catch (error) {
        console.error('Error initializing Stripe:', error);
        displayPaymentError('Failed to initialize payment system. Please try again later.');
    }
}

/**
 * Create a payment intent with the server
 * @param {number} amount - Amount to charge in dollars
 * @param {Object} orderData - Order metadata
 * @returns {Promise<Object>} - Payment intent data including client secret
 */
async function createPaymentIntent(amount, orderData) {
    try {
        const response = await fetch('/api/payment/create-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount,
                metadata: {
                    customerName: orderData.customerName,
                    customerEmail: orderData.customerEmail,
                    customerPhone: orderData.customerPhone,
                    deliveryMethod: orderData.deliveryMethod
                }
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to create payment intent');
        }

        paymentIntentId = data.paymentIntentId;
        return {
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId
        };
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
}

/**
 * Process the payment with Stripe
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} - Payment result
 */
async function processPayment(orderData) {
    try {
        // Show loading state
        setPaymentProcessingState(true);
        
        // Create payment intent with the server
        const paymentData = await createPaymentIntent(
            orderData.total,
            {
                customerName: orderData.customerName,
                customerEmail: orderData.customerEmail,
                customerPhone: orderData.customerPhone,
                deliveryMethod: orderData.deliveryMethod
            }
        );

        // Process payment with Stripe
        const result = await stripe.confirmCardPayment(paymentData.clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: orderData.customerName,
                    email: orderData.customerEmail,
                    phone: orderData.customerPhone,
                    address: orderData.deliveryMethod === 'delivery' ? {
                        line1: orderData.address,
                        city: orderData.city,
                        state: orderData.state,
                        postal_code: orderData.zip
                    } : undefined
                }
            }
        });

        // Handle errors
        if (result.error) {
            throw new Error(result.error.message);
        }

        // Payment succeeded
        console.log('Payment succeeded:', result.paymentIntent);
        return {
            success: true,
            paymentIntent: result.paymentIntent,
            paymentIntentId: paymentData.paymentIntentId
        };
    } catch (error) {
        console.error('Payment processing failed:', error);
        return {
            success: false,
            error: error.message || 'Payment processing failed'
        };
    } finally {
        // Hide loading state
        setPaymentProcessingState(false);
    }
}

/**
 * Set the payment processing state
 * @param {boolean} isProcessing - Whether payment is being processed
 */
function setPaymentProcessingState(isProcessing) {
    const placeOrderButton = document.getElementById('place-order');
    const cardElement = document.getElementById('card-element');
    
    if (placeOrderButton) {
        if (isProcessing) {
            placeOrderButton.disabled = true;
            placeOrderButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        } else {
            placeOrderButton.disabled = false;
            placeOrderButton.innerHTML = 'Place Order <i class="fas fa-check"></i>';
        }
    }
    
    if (cardElement) {
        cardElement.disabled = isProcessing;
    }
}

/**
 * Display payment error message
 * @param {string} message - Error message to display
 */
function displayPaymentError(message) {
    const errorElement = document.getElementById('card-errors');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('alert', 'alert-danger', 'mt-3');
    }
}

// Initialize Stripe when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Stripe public key should be included in the HTML via a script tag
    // or set via a global variable in the page
    try {
        // Retrieve Stripe public key from meta tag
        const stripeKeyMeta = document.querySelector('meta[name="stripe-public-key"]');
        if (stripeKeyMeta) {
            window.STRIPE_PUBLIC_KEY = stripeKeyMeta.getAttribute('content');
        } else {
            console.warn('Stripe public key meta tag not found');
        }
    } catch (error) {
        console.error('Error retrieving Stripe public key:', error);
    }

    // Initialize payment form based on active step
    initializePaymentForm();

    // Add event listeners for payment method selection
    const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
    paymentMethodRadios.forEach(radio => {
        radio.addEventListener('change', handlePaymentMethodChange);
    });
});

/**
 * Initialize the payment form
 */
function initializePaymentForm() {
    // Check if payment section is visible
    const paymentSection = document.getElementById('payment-section');
    if (paymentSection && !paymentSection.classList.contains('d-none')) {
        // Check if card payment is selected
        const cardPaymentRadio = document.getElementById('card');
        if (cardPaymentRadio && cardPaymentRadio.checked) {
            // Initialize Stripe
            initializeStripe();
        }
    }
}

/**
 * Handle payment method change
 */
function handlePaymentMethodChange() {
    const cardPaymentSection = document.getElementById('card-payment-section');
    const cashPaymentSection = document.getElementById('cash-payment-section');
    const cardPaymentRadio = document.getElementById('card');

    if (!cardPaymentSection || !cashPaymentSection) return;

    if (cardPaymentRadio.checked) {
        cardPaymentSection.classList.remove('d-none');
        cashPaymentSection.classList.add('d-none');
        // Initialize Stripe if not already done
        if (!cardElement) {
            initializeStripe();
        }
    } else {
        cardPaymentSection.classList.add('d-none');
        cashPaymentSection.classList.remove('d-none');
    }
}

/**
 * Submit order with payment details
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} - Order submission result
 */
// Expose this function to the global window object so it can be called from order.js
window.submitOrderWithPayment = async function(orderData) {
    try {
        let paymentResult = { success: true };
        
        // Process payment if using credit card
        if (orderData.paymentMethod === 'card') {
            paymentResult = await processPayment(orderData);
            
            if (!paymentResult.success) {
                return {
                    success: false,
                    message: paymentResult.error || 'Payment processing failed'
                };
            }
            
            // Add payment info to order data as token for storage
            orderData.paymentIntentId = paymentIntentId;
            orderData.paymentStatus = 'authorized';
        }
        
        // Submit order to server
        console.log('Sending order data to server:', JSON.stringify(orderData));
        
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response error:', response.status, errorText);
            if (orderData.paymentMethod === 'card' && response.status === 400) {
                // Retry payment if it fails due to validation
                return {
                    success: false,
                    message: 'Payment validation failed, please retry',
                    retry: true
                };
            }
            throw new Error(`Order API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Server response:', data);
        
        if (!data.success) {
            if (orderData.paymentMethod === 'card') {
                return {
                    success: false,
                    message: data.message || 'Failed to create order, please retry payment',
                    retry: true
                };
            }
            throw new Error(data.message || 'Failed to create order');
        }
        
        return {
            success: true,
            orderId: data.orderId,
            orderNumber: data.orderNumber
        };
    } catch (error) {
        console.error('Error submitting order:', error);
        if (orderData.paymentMethod === 'card') {
            return {
                success: false,
                message: error.message || 'Failed to submit order, please retry payment',
                retry: true
            };
        }
        return {
            success: false,
            message: error.message || 'Failed to submit order'
        };
    }
}

/**
 * Handle the place order button click
 */
async function handlePlaceOrder() {
    try {
        // Get payment method
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'card';
        
        // Collect order data
        const orderData = collectOrderData();
        orderData.paymentMethod = paymentMethod;
        
        // Validate order data
        if (!validateOrderData(orderData)) {
            return;
        }
        
        // Show processing state
        setPaymentProcessingState(true);
        
        // Process order based on payment method
        let orderResult;
        
        if (paymentMethod === 'card') {
            // Process with Stripe
            const paymentResult = await processPayment(orderData);
            
            if (!paymentResult.success) {
                displayPaymentError(paymentResult.error);
                return;
            }
            
            // Add payment intent ID to order data
            orderData.paymentIntentId = paymentResult.paymentIntentId;
            orderData.paymentStatus = 'authorized';
            
            // Submit order to server
            orderResult = await submitOrder(orderData);
        } else {
            // Cash payment - just submit the order
            orderData.paymentStatus = 'unpaid';
            orderResult = await submitOrder(orderData);
        }
        
        // Handle order result
        if (orderResult.success) {
            // Clear cart
            window.clearCart();
            
            // Redirect to order confirmation page
            window.location.href = `/order/confirmation/${orderResult.orderNumber}`;
        } else {
            displayPaymentError(orderResult.error || 'Failed to place order');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        displayPaymentError('An unexpected error occurred. Please try again.');
    } finally {
        setPaymentProcessingState(false);
    }
}

/**
 * Collect order data from the form
 * @returns {Object} Order data
 */
function collectOrderData() {
    // Get cart data
    const cart = window.cart || { items: [], subtotal: 0, tax: 0, total: 0 };
    
    // Get delivery method
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'pickup';
    
    // Get customer info
    const customerName = document.getElementById('name')?.value || '';
    const customerEmail = document.getElementById('email')?.value || '';
    const customerPhone = document.getElementById('phone')?.value || '';
    
    // Get delivery address if applicable
    const address = document.getElementById('address')?.value || '';
    const city = document.getElementById('city')?.value || '';
    const state = document.getElementById('state')?.value || '';
    const zip = document.getElementById('zip')?.value || '';
    
    // Get notes
    const notes = document.getElementById('orderNotes')?.value || '';
    
    // Format delivery address
    const deliveryAddress = deliveryMethod === 'delivery' ? {
        address,
        city,
        state,
        zip
    } : {};
    
    // Get pickup time if applicable
    const pickupTime = deliveryMethod === 'pickup' ? 
        document.getElementById('pickup-time')?.value || 'asap' : null;
    
    // Format delivery instructions
    const deliveryInstructions = document.getElementById('delivery-instructions')?.value || '';
    
    return {
        customerName,
        customerEmail,
        customerPhone,
        deliveryMethod,
        deliveryAddress,
        pickupTime,
        deliveryInstructions,
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        notes,
        address,
        city,
        state,
        zip
    };
}

/**
 * Validate order data
 * @param {Object} orderData - Order data to validate
 * @returns {boolean} Whether the data is valid
 */
function validateOrderData(orderData) {
    // Check if cart has items
    if (!orderData.items || orderData.items.length === 0) {
        displayPaymentError('Your cart is empty. Please add items to your order.');
        return false;
    }
    
    // Check for customer info
    if (!orderData.customerName || !orderData.customerEmail || !orderData.customerPhone) {
        displayPaymentError('Please provide your name, email, and phone number.');
        return false;
    }
    
    // Check for delivery address if delivery method is selected
    if (orderData.deliveryMethod === 'delivery') {
        if (!orderData.address || !orderData.city || !orderData.state || !orderData.zip) {
            displayPaymentError('Please provide your complete delivery address.');
            return false;
        }
    }
    
    // Check for pickup time if pickup method is selected
    if (orderData.deliveryMethod === 'pickup' && !orderData.pickupTime) {
        displayPaymentError('Please select a pickup time.');
        return false;
    }
    
    // Check for valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.customerEmail)) {
        displayPaymentError('Please provide a valid email address.');
        return false;
    }
    
    // Check for valid phone format (simple check)
    const phoneRegex = /^[0-9\-\+\(\)\s]{10,15}$/;
    if (!phoneRegex.test(orderData.customerPhone)) {
        displayPaymentError('Please provide a valid phone number.');
        return false;
    }
    
    return true;
}

/**
 * Submit order to server
 * @param {Object} orderData - Order data to submit
 * @returns {Promise<Object>} Order submission result
 */
async function submitOrder(orderData) {
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to submit order');
        }
        
        return {
            success: true,
            orderId: data.orderId,
            orderNumber: data.orderNumber
        };
    } catch (error) {
        console.error('Error submitting order:', error);
        return {
            success: false,
            error: error.message || 'Failed to submit order'
        };
    }
}

// Expose functions to global scope for use in other scripts
window.processPayment = processPayment;
window.handlePlaceOrder = handlePlaceOrder;
window.submitOrder = submitOrder;
