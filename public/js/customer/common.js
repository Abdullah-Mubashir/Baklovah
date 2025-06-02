/**
 * Baklovah Restaurant - Common JavaScript
 * Shared functionality across all customer-facing pages
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Handle mobile navigation
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    if (navbarToggler && navbarCollapse) {
        document.addEventListener('click', function(event) {
            const isNavbarOpen = navbarCollapse.classList.contains('show');
            const clickedInsideNavbar = navbarCollapse.contains(event.target) || navbarToggler.contains(event.target);
            
            if (isNavbarOpen && !clickedInsideNavbar) {
                // Close the navbar when clicking outside
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70, // Offset for fixed header
                    behavior: 'smooth'
                });
                
                // Update URL hash without scrolling
                history.pushState(null, null, targetId);
            }
        });
    });

    // Toast notification system
    window.showToast = function(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;
        
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast ${type}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
        toast.show();
        
        // Remove toast from DOM after it's hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            toastElement.remove();
        });
    };

    // Handle cart sidebar toggle
    const cartButtons = document.querySelectorAll('[data-bs-toggle="offcanvas"][data-bs-target="#cartSidebar"]');
    cartButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update cart contents before showing
            updateCartDisplay();
        });
    });

    // Check if user is logged in (for future authentication features)
    checkAuthStatus();
});

/**
 * Check user authentication status
 * This is a placeholder for future authentication implementation
 */
function checkAuthStatus() {
    // This will be implemented when user authentication is added
    // For now, we'll assume users are not logged in
    const token = localStorage.getItem('authToken');
    const isLoggedIn = !!token;
    
    // Update UI based on auth status
    updateAuthUI(isLoggedIn);
}

/**
 * Update UI elements based on authentication status
 * @param {boolean} isLoggedIn - Whether the user is logged in
 */
function updateAuthUI(isLoggedIn) {
    // This will be implemented when user authentication is added
    // For now, we'll just prepare the function
    console.log('Auth status:', isLoggedIn ? 'Logged in' : 'Not logged in');
    
    // Future implementation will update nav items, show/hide elements, etc.
}
