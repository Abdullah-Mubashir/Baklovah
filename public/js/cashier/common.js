/**
 * Baklovah Restaurant - Cashier Common JavaScript
 * Shared functions for cashier interface
 */

// Initialize socket connection
const socket = io();

// Global cashier cart for storing the current order
if (typeof window.cashierCart === 'undefined') {
    window.cashierCart = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0
    };
}

// Store the current active order ID if any
window.activeOrderId = null;

// Utility functions
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

function calculateTax(subtotal) {
    return subtotal * 0.08; // 8% tax rate
}

function calculateTotal(subtotal, tax) {
    return subtotal + tax;
}

function updateCartTotals() {
    let subtotal = 0;
    window.cashierCart.items.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const tax = calculateTax(subtotal);
    const total = calculateTotal(subtotal, tax);
    
    window.cashierCart.subtotal = subtotal;
    window.cashierCart.tax = tax;
    window.cashierCart.total = total;
    
    return { subtotal, tax, total };
}

function updateCartCount() {
    const cartCount = window.cashierCart.items.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById('cart-notification-badge');
    
    if (cartBadge) {
        if (cartCount > 0) {
            cartBadge.textContent = cartCount;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    
    if (toast && toastMessage) {
        let title = 'Notification';
        let bgClass = 'bg-primary';
        
        switch (type) {
            case 'success':
                title = 'Success';
                bgClass = 'bg-success';
                break;
            case 'error':
                title = 'Error';
                bgClass = 'bg-danger';
                break;
            case 'warning':
                title = 'Warning';
                bgClass = 'bg-warning';
                break;
            case 'info':
                title = 'Information';
                bgClass = 'bg-info';
                break;
        }
        
        // Remove any existing bg classes
        toast.className = toast.className.replace(/bg-\w+/g, '').trim();
        toast.classList.add('toast', bgClass + '-subtle');
        
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Listen for new order notifications
socket.on('new_order', (data) => {
    const ordersBadge = document.getElementById('order-notification-badge');
    
    if (ordersBadge) {
        const currentCount = parseInt(ordersBadge.textContent) || 0;
        ordersBadge.textContent = currentCount + 1;
        ordersBadge.style.display = 'flex';
    }
    
    showToast('New order received!', 'info');
});

// Listen for order updates
socket.on('order_updated', (data) => {
    // Refresh orders if we're on the orders page
    if (window.location.pathname === '/cashier/orders') {
        loadActiveOrders();
    }
});

// Handle tab navigation with browser back/forward buttons
window.addEventListener('popstate', (event) => {
    const path = window.location.pathname;
    if (path.includes('/cashier')) {
        const tabId = path.includes('/orders') ? 'orders' : 
                    path.includes('/checkout') ? 'checkout' : 'menu';
        
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('d-none');
        });
        
        document.getElementById(tabId + '-management-view').classList.remove('d-none');
        
        document.querySelectorAll('.tab-navigation .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelector(`.tab-navigation .nav-link[href="/cashier${tabId === 'menu' ? '' : '/' + tabId}"]`).classList.add('active');
    }
});
