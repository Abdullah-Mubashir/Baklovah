/**
 * Baklovah Restaurant - Menu Page JavaScript
 * Handles menu page functionality for the customer-facing website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Handle menu category navigation
    const menuNavLinks = document.querySelectorAll('.menu-nav-pills .nav-link');
    
    menuNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            menuNavLinks.forEach(navLink => navLink.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Scroll to the target section
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 100, // Offset for sticky header and nav
                    behavior: 'smooth'
                });
            }
        });
    });

    // Handle menu item filtering (for future implementation)
    setupMenuFiltering();
    
    // Load menu items from API
    loadMenuItems();
    
    // Handle scroll events to update active nav pill
    window.addEventListener('scroll', updateActiveNavPill);
});

/**
 * Set up menu filtering functionality
 */
function setupMenuFiltering() {
    // This will be expanded when filtering options are added
    console.log('Menu filtering ready for implementation');
}

/**
 * Load menu items from the API
 */
function loadMenuItems() {
    // Show loading indicator
    const sections = ['appetizers', 'main-dishes', 'sandwiches', 'sides', 'desserts', 'beverages'];
    sections.forEach(section => {
        document.getElementById(`${section}-items`).innerHTML = '<div class="col-12 text-center"><p>Loading menu items...</p></div>';
    });
    
    // Fetch menu items from API
    fetch('/api/menu')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch menu items');
            }
            return response.json();
        })
        .then(data => {
            // Group items by category
            const itemsByCategory = {};
            
            // Only show active items
            const activeItems = data.data.filter(item => item.status === 'active');
            
            // Initialize categories
            sections.forEach(section => {
                itemsByCategory[section] = [];
            });
            
            // Group items by category
            activeItems.forEach(item => {
                const category = item.category.toLowerCase().replace(/\s+/g, '-');
                if (itemsByCategory[category]) {
                    itemsByCategory[category].push(item);
                } else {
                    // If category doesn't match predefined sections, add to main dishes
                    itemsByCategory['main-dishes'].push(item);
                }
            });
            
            // Render items by category
            Object.keys(itemsByCategory).forEach(category => {
                const items = itemsByCategory[category];
                const container = document.getElementById(`${category}-items`);
                
                if (items.length === 0) {
                    container.innerHTML = '<div class="col-12 text-center"><p>No items available in this category</p></div>';
                    return;
                }
                
                container.innerHTML = '';
                items.forEach(item => {
                    const itemHtml = createMenuItemHtml(item);
                    container.innerHTML += itemHtml;
                });
            });
            
            // Initialize add to cart buttons after rendering
            initializeAddToCartButtons();
        })
        .catch(error => {
            console.error('Error loading menu items:', error);
            sections.forEach(section => {
                document.getElementById(`${section}-items`).innerHTML = 
                    '<div class="col-12 text-center"><p>Failed to load menu items. Please try again later.</p></div>';
            });
        });
}

/**
 * Create HTML for a menu item
 * @param {Object} item - Menu item data
 * @returns {string} HTML for the menu item card
 */
function createMenuItemHtml(item) {
    // Handle placeholder image if needed
    const imageUrl = item.image_url || '/images/customer/placeholder-food.jpg';
    
    // Create tags HTML
    let tagsHtml = '';
    if (item.is_vegetarian) {
        tagsHtml += '<span class="badge bg-success">Vegetarian</span> ';
    }
    if (item.is_gluten_free) {
        tagsHtml += '<span class="badge bg-info">Gluten-Free</span> ';
    }
    if (item.is_spicy) {
        tagsHtml += '<span class="badge bg-danger">Spicy</span> ';
    }
    
    return `
    <div class="col-lg-6 mb-4">
        <div class="card menu-item-card h-100">
            <div class="row g-0">
                <div class="col-md-4">
                    <img src="${imageUrl}" class="img-fluid rounded-start h-100 object-fit-cover" alt="${item.title}">
                </div>
                <div class="col-md-8">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${item.title}</h5>
                            <span class="menu-item-price">$${parseFloat(item.price).toFixed(2)}</span>
                        </div>
                        <p class="card-text">${item.description || 'No description available'}</p>
                        <div class="menu-item-tags mb-2">
                            ${tagsHtml}
                        </div>
                        <button class="btn btn-primary btn-sm add-to-cart-btn" 
                            data-item-id="${item.id}" 
                            data-item-name="${item.title}" 
                            data-item-price="${item.price}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

/**
 * Initialize Add to Cart buttons
 */
function initializeAddToCartButtons() {
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            const itemName = this.getAttribute('data-item-name');
            const itemPrice = this.getAttribute('data-item-price');
            
            // Add item to cart (functionality from cart.js)
            if (typeof addToCart === 'function') {
                addToCart(itemId, itemName, itemPrice, 1);
            }
        });
    });
}

/**
 * Update the active navigation pill based on scroll position
 */
function updateActiveNavPill() {
    const scrollPosition = window.scrollY + 150; // Offset for sticky header
    const sections = document.querySelectorAll('.menu-section');
    const navLinks = document.querySelectorAll('.menu-nav-pills .nav-link');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href').substring(1); // Remove the # character
        
        if (href === currentSection) {
            link.classList.add('active');
        }
    });
}

/**
 * Filter menu items by category
 * @param {string} category - Category to filter by
 */
function filterMenuByCategory(category) {
    const menuItems = document.querySelectorAll('.menu-item-card');
    
    menuItems.forEach(item => {
        const itemCategories = item.dataset.categories ? item.dataset.categories.split(',') : [];
        
        if (category === 'all' || itemCategories.includes(category)) {
            item.closest('.col-lg-6').style.display = 'block';
        } else {
            item.closest('.col-lg-6').style.display = 'none';
        }
    });
}

/**
 * Search menu items by keyword
 * @param {string} keyword - Keyword to search for
 */
function searchMenuItems(keyword) {
    const menuItems = document.querySelectorAll('.menu-item-card');
    const lowercaseKeyword = keyword.toLowerCase();
    
    menuItems.forEach(item => {
        const itemName = item.querySelector('.card-title').textContent.toLowerCase();
        const itemDescription = item.querySelector('.card-text').textContent.toLowerCase();
        
        if (itemName.includes(lowercaseKeyword) || itemDescription.includes(lowercaseKeyword)) {
            item.closest('.col-lg-6').style.display = 'block';
        } else {
            item.closest('.col-lg-6').style.display = 'none';
        }
    });
}
