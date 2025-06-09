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

    // Initialize Bootstrap modal
    const menuItemModal = document.getElementById('menuItemModal');
    if (menuItemModal) {
        new bootstrap.Modal(menuItemModal);
    }
});

/**
 * Set up menu filtering functionality
 */
function setupMenuFiltering() {
    // This will be expanded when filtering options are added
    console.log('Menu filtering ready for implementation');
}

/**
 * Create HTML for a menu item card
 * @param {Object} item - Menu item data
 * @returns {string} - HTML string for the menu item
 */
function createMenuItemHtml(item) {
    // Format price with 2 decimal places
    const formattedPrice = parseFloat(item.price).toFixed(2);
    
    // Generate tags HTML if the item has dietary tags
    let tagsHtml = '';
    if (item.is_vegetarian || item.is_gluten_free || item.is_spicy) {
        tagsHtml = `<div class="menu-item-tags">`;
        if (item.is_vegetarian) tagsHtml += `<span class="badge bg-success me-1">Vegetarian</span>`;
        if (item.is_gluten_free) tagsHtml += `<span class="badge bg-info me-1">Gluten-Free</span>`;
        if (item.is_spicy) tagsHtml += `<span class="badge bg-danger">Spicy</span>`;
        tagsHtml += `</div>`;
    }
    
    // Generate availability badge if item is limited
    const availabilityBadge = item.is_limited_availability ? 
        `<span class="position-absolute top-0 end-0 badge bg-warning text-dark m-2">Limited</span>` : '';
    
    // Return the complete HTML for the menu item card
    return `
    <div class="col-md-6 col-lg-4 mb-4">
        <div class="card menu-item-card h-100" data-item-id="${item.id}">
            ${availabilityBadge}
            <div class="menu-item-img-container">
                <img src="${item.image_url || '/img/placeholder-food.jpg'}" 
                    class="card-img-top menu-item-img" 
                    alt="${item.title}">
            </div>
            <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start">
                    <h5 class="card-title">${item.title}</h5>
                    <span class="menu-item-price" data-price="${item.price}">$${formattedPrice}</span>
                </div>
                <p class="card-text flex-grow-1">${item.description || 'No description available'}</p>
                ${tagsHtml}
                <div class="mt-auto pt-3">
                    <button class="btn btn-sm btn-primary add-to-cart-btn" 
                        data-item-id="${item.id}" 
                        data-item-name="${item.title}" 
                        data-item-price="${item.price}">Add to Cart</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

/**
 * Load menu items from the API
 */
function loadMenuItems() {
    // Show loading indicator
    const sections = ['appetizers', 'main-dishes', 'sandwiches', 'sides', 'desserts', 'beverages'];
    sections.forEach(section => {
        const sectionElement = document.getElementById(`${section}-items`);
        if (sectionElement) {
            sectionElement.innerHTML = '<div class="col-12 text-center"><p>Loading menu items...</p></div>';
        } else {
            console.warn(`Section element ${section}-items not found in the DOM`);
        }
    });
    
    // Fetch menu items from API with error handling for both network and server errors
    fetch('/api/menu', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        cache: 'no-store' // Prevent caching issues
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch menu items: ${response.status} ${response.statusText}`);
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
            
            // Render items by category with additional error handling
            Object.keys(itemsByCategory).forEach(category => {
                const items = itemsByCategory[category];
                const container = document.getElementById(`${category}-items`);
                
                // Skip if container doesn't exist
                if (!container) {
                    console.warn(`Container for category ${category} not found`);
                    return;
                }
                
                if (items.length === 0) {
                    container.innerHTML = '<div class="col-12 text-center"><p>No items available in this category</p></div>';
                    return;
                }
                
                container.innerHTML = '';
                items.forEach(item => {
                    try {
                        const itemHtml = createMenuItemHtml(item);
                        container.innerHTML += itemHtml;
                    } catch (error) {
                        console.error(`Error rendering item ${item.id || 'unknown'}:`, error);
                        // Continue with other items even if one fails
                    }
                });
            });
            
            // Menu items have already been rendered through the loop above
            
            // Initialize add to cart buttons
            initializeAddToCartButtons();

            // Initialize menu item clicks
            initializeMenuItemClicks();

            // Send viewed items to backend (if any)
            sendViewedItemsToBackend();
        })
        .catch(error => {
            console.error('Error loading menu items:', error);
            
            // Display error message in each section with error handling
            sections.forEach(section => {
                const sectionElement = document.getElementById(`${section}-items`);
                if (sectionElement) {
                    sectionElement.innerHTML = '<div class="col-12 text-center"><p class="text-danger">Error loading menu items. Please try again later.</p></div>';
                }
            });
            
            // Try to retrieve data from localStorage as fallback if available
            try {
                const cachedMenu = localStorage.getItem('baklovah_menu_cache');
                if (cachedMenu) {
                    const cachedData = JSON.parse(cachedMenu);
                    console.log('Using cached menu data as fallback');
                    // Process the cached data here if needed
                }
            } catch (cacheError) {
                console.warn('Failed to load cached menu data:', cacheError);
            }
        });
}

/**
 * Create HTML for a menu item
 * @param {Object} item - Menu item data
 * @returns {string} HTML for the menu item card
 */
function createMenuItemHtml(item) {
    // Handle image url with proper fallback
    let imageUrl = '/images/customer/placeholder-food.jpg';  // Default fallback
    
    if (item.image_url) {
        // Use real image from S3 when available
        imageUrl = item.image_url;
        
        // Add to image cache for offline use
        try {
            const imageCache = JSON.parse(localStorage.getItem('baklovah_image_cache') || '{}');
            imageCache[item.id] = imageUrl;
            localStorage.setItem('baklovah_image_cache', JSON.stringify(imageCache));
        } catch (e) {
            console.warn('Failed to cache image URL', e);
        }
    } else if (item.id) {
        // Try to get from cache if no image_url but we have an id
        try {
            const imageCache = JSON.parse(localStorage.getItem('baklovah_image_cache') || '{}');
            if (imageCache[item.id]) {
                imageUrl = imageCache[item.id];
            }
        } catch (e) {
            console.warn('Failed to retrieve cached image', e);
        }
    }
    
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
        <div class="card menu-item-card h-100 cursor-pointer" data-item-id="${item.id}">
            <div class="row g-0">
                <div class="col-md-4">
                    <img src="${imageUrl}" class="img-fluid rounded-start h-100 object-fit-cover" alt="${item.title}" 
                         loading="lazy" onerror="this.onerror=null; this.src='/images/customer/placeholder-food.jpg';">
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
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); // Prevent the card click event from firing
            
            const itemId = this.getAttribute('data-item-id');
            const itemName = this.getAttribute('data-item-name');
            const itemPrice = this.getAttribute('data-item-price');
            
            // Add item to cart - pass individual parameters as expected by addToCart function
            window.addToCart(itemId, itemName, itemPrice, 1);
        });
    });

    // Initialize modal add to cart button
    document.querySelector('.modal-add-to-cart-btn')?.addEventListener('click', function() {
        const modal = document.getElementById('menuItemModal');
        const itemId = modal.getAttribute('data-item-id');
        const itemName = document.getElementById('menuItemModalLabel').textContent;
        const itemPrice = document.querySelector('.menu-modal-price').getAttribute('data-price');

        // Add item to cart - pass individual parameters as expected by addToCart function
        // Also get image URL for item display
        const imageUrl = document.querySelector('.menu-modal-image')?.src || null;
        window.addToCart(itemId, itemName, itemPrice, 1, imageUrl);
        
        // Hide the modal
        const bsModal = bootstrap.Modal.getInstance(modal);
        bsModal.hide();
    });
}

/**
 * Initialize menu item clicks
 */
function initializeMenuItemClicks() {
    document.querySelectorAll('.menu-item-card').forEach(card => {
        // Prevent clicks on add to cart button from opening the modal
        card.querySelector('.add-to-cart-btn')?.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Add click event to the card
        card.addEventListener('click', function(event) {
            // Don't process the event if it originated from the add to cart button
            if (event.target.classList.contains('add-to-cart-btn') || 
                event.target.closest('.add-to-cart-btn')) {
                return;
            }
            
            event.preventDefault();
            
            const itemId = this.getAttribute('data-item-id');
            const itemName = this.querySelector('.card-title').textContent;
            // Get price content directly from the displayed text, and clean it
            const itemPriceElem = this.querySelector('.menu-item-price');
            let itemPrice = '0.00';
            
            if (itemPriceElem) {
                // Try to get from data-price attribute first
                itemPrice = itemPriceElem.getAttribute('data-price');
                
                // If that's not available, extract from text content
                if (!itemPrice) {
                    const priceText = itemPriceElem.textContent.trim();
                    // Remove $ sign and any non-numeric characters except decimal point
                    itemPrice = priceText.replace(/[^0-9.]/g, '');
                }
            }
            
            // Ensure we have a valid number
            const formattedPrice = (parseFloat(itemPrice) || 0).toFixed(2);
            const itemDescription = this.querySelector('.card-text').textContent;
            const itemImageElem = this.querySelector('.menu-item-img, img');
            const itemImageUrl = itemImageElem ? itemImageElem.src : '/images/customer/placeholder-food.jpg';
            
            console.log('Menu item clicked:', { itemId, itemName, itemPrice, formattedPrice, itemImageUrl });
            
            // Update modal with item details
            const modal = document.getElementById('menuItemModal');
            modal.setAttribute('data-item-id', itemId);
            
            document.getElementById('menuItemModalLabel').textContent = itemName;
            
            const modalPriceElem = document.querySelector('.menu-modal-price');
            if (modalPriceElem) {
                modalPriceElem.setAttribute('data-price', itemPrice);
                modalPriceElem.textContent = `$${formattedPrice}`;
            }
            
            const descriptionElem = document.getElementById('menuItemModalDescription');
            if (descriptionElem) {
                descriptionElem.textContent = itemDescription;
            }
            
            // Set the image
            const modalImage = document.getElementById('menuItemModalImage');
            if (modalImage) {
                modalImage.src = itemImageUrl;
                modalImage.alt = itemName;
            }
            
            // Ensure the add to cart button has correct data
            const modalAddBtn = modal.querySelector('.modal-add-to-cart-btn');
            if (modalAddBtn) {
                modalAddBtn.setAttribute('data-item-id', itemId);
                modalAddBtn.setAttribute('data-item-name', itemName);
                modalAddBtn.setAttribute('data-item-price', itemPrice);
            }
            
            // Show modal using Bootstrap API
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // Track viewed item
            trackViewedItem(itemId);
        });
    });
}

/**
 * Track viewed item
 * @param {string} itemId - ID of the viewed item
 */
function trackViewedItem(itemId) {
    try {
        // Store in local storage
        const viewedItems = JSON.parse(localStorage.getItem('baklovah_viewed_items') || '[]');
        if (!viewedItems.includes(itemId)) {
            viewedItems.push(itemId);
            localStorage.setItem('baklovah_viewed_items', JSON.stringify(viewedItems));
        }
        
        // Send to backend immediately
        fetch('/api/analytics/view-item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ itemId })
        })
        .then(response => {
            if (!response.ok) {
                console.warn('Failed to track viewed item on server');
            }
        })
        .catch(error => {
            console.warn('Error tracking viewed item:', error);
        });
    } catch (e) {
        console.warn('Failed to track viewed item', e);
    }
}

/**
 * Send viewed items to backend
 */
function sendViewedItemsToBackend() {
    try {
        const viewedItems = JSON.parse(localStorage.getItem('baklovah_viewed_items') || '[]');
        if (viewedItems.length > 0) {
            fetch('/api/analytics/view-items-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ itemIds: viewedItems })
            })
            .then(response => {
                if (response.ok) {
                    // Clear viewed items after successful sync
                    localStorage.removeItem('baklovah_viewed_items');
                }
            })
            .catch(error => {
                console.warn('Error syncing viewed items:', error);
            });
        }
    } catch (e) {
        console.warn('Failed to sync viewed items', e);
    }
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
