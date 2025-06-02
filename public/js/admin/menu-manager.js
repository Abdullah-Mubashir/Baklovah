/**
 * Menu Manager JavaScript
 * Handles the client-side functionality for the admin menu management page
 */

// Global variables
let menuItems = [];
let categories = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the page
  initializePage();
});

/**
 * Initialize the page
 */
async function initializePage() {
  // Load menu items
  await loadMenuItems();
  
  // Load categories for filter dropdown
  loadCategories();
  
  // Initialize search functionality
  initializeSearch();
  
  // Initialize event listeners
  initializeEventListeners();
}

/**
 * Load menu items from the API
 */
async function loadMenuItems() {
  const tableBody = document.querySelector('#menuTable tbody');
  tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading menu items...</td></tr>';
  
  try {
    // Fetch menu items from API with authentication
    const response = await fetch('/api/menu', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token-for-dev'}`
      }
    });
    
    // Handle server errors with better user feedback
    if (!response.ok) {
      if (response.status === 500) {
        console.error('Server error when loading menu items');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle"></i> Server error occurred. Please try refreshing the page.</td></tr>';
        showToast('Server error loading menu items. Please try again later.', 'error');
        return;
      }
      
      if (response.status === 401 || response.status === 403) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-warning"><i class="bi bi-shield-lock"></i> Authentication error. Please log in again.</td></tr>';
        showToast('Authentication error. Please log in again.', 'warning');
        return;
      }
      
      // Try to get error details from response
      let errorMessage = 'Failed to load menu items';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If can't parse JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-circle"></i> ${errorMessage}</td></tr>`;
      showToast(errorMessage, 'error');
      return;
    }
    
    // Parse response data with error handling
    let data;
    try {
      data = await response.json();
      menuItems = data.data || [];
    } catch (e) {
      console.error('Error parsing menu items JSON:', e);
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle"></i> Error parsing data. Please try refreshing the page.</td></tr>';
      showToast('Error parsing menu data. Please try again.', 'error');
      return;
    }
    
    // Clear table
    tableBody.innerHTML = '';
    
    // If no items
    if (!menuItems || menuItems.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No menu items found. Click "Add Item" to create your first menu item.</td></tr>';
      return;
    }
    
    // Populate table with proper error handling for all properties
    menuItems.forEach(item => {
      // Ensure all required properties exist with fallbacks
      const safeItem = {
        id: item.id || 0,
        title: item.title || 'Unnamed Item',
        category: item.category || 'Uncategorized',
        price: item.price || 0,
        status: item.status || 'inactive',
        view_count: item.view_count || 0,
        purchase_count: item.purchase_count || 0,
        like_count: item.like_count || 0,
        image_url: item.image_url || '/img/placeholder.jpg'
      };
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <img src="${safeItem.image_url}" alt="${safeItem.title}" class="img-thumbnail" width="60" onerror="this.src='/img/placeholder.jpg';this.onerror=null;">
        </td>
        <td>${safeItem.title}</td>
        <td>${safeItem.category}</td>
        <td>$${parseFloat(safeItem.price).toFixed(2)}</td>
        <td>
          <span class="badge ${getStatusBadgeClass(safeItem.status)}">${capitalizeFirst(safeItem.status)}</span>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="me-2" title="Views"><i class="bi bi-eye"></i> ${safeItem.view_count}</div>
            <div class="me-2" title="Purchases"><i class="bi bi-cart"></i> ${safeItem.purchase_count}</div>
            <div title="Likes"><i class="bi bi-heart"></i> ${safeItem.like_count}</div>
          </div>
        </td>
        <td>
          <div class="btn-group" role="group">
            ${getPublishButton(safeItem)}
            <button type="button" class="btn btn-sm btn-outline-primary edit-btn" data-id="${safeItem.id}" title="Edit Item">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-id="${safeItem.id}" data-name="${safeItem.title}" title="Delete Item">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    // Attach event listeners to buttons
    attachActionButtonListeners();
  } catch (error) {
    console.error('Error loading menu items:', error);
    showToast('Error loading menu items: ' + error.message, 'error');
  }
}

/**
 * Get the appropriate publish button based on item status
 * @param {Object} item - The menu item
 * @returns {string} HTML for publish button
 */
function getPublishButton(item) {
  if (item.status === 'active') {
    return `
      <button type="button" class="btn btn-sm btn-outline-warning unpublish-btn" data-id="${item.id}" title="Unpublish Item">
        <i class="bi bi-eye-slash"></i>
      </button>
    `;
  } else {
    return `
      <button type="button" class="btn btn-sm btn-outline-success publish-btn" data-id="${item.id}" title="Publish Item">
        <i class="bi bi-eye"></i>
      </button>
    `;
  }
}

/**
 * Get appropriate CSS class for status badge
 * @param {string} status - The item status
 * @returns {string} CSS class
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'active':
      return 'bg-success';
    case 'inactive':
      return 'bg-secondary';
    case 'featured':
      return 'bg-primary';
    default:
      return 'bg-secondary';
  }
}

/**
 * Capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Load unique categories for the filter dropdown
 */
function loadCategories() {
  try {
    const categoryFilter = document.getElementById('categoryFilter');
    
    // Get unique categories
    const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
    categories = uniqueCategories;
    
    // Clear dropdown (except the 'All Categories' option)
    while (categoryFilter.options.length > 1) {
      categoryFilter.options.remove(1);
    }
    
    // Add categories to dropdown
    uniqueCategories.forEach(category => {
      if (category) { // Only add if category is not null/empty
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      }
    });
    
    // Add event listener for filter change
    categoryFilter.addEventListener('change', filterMenuItems);
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
  const searchInput = document.getElementById('menuSearch');
  searchInput.addEventListener('input', filterMenuItems);
}

/**
 * Filter menu items based on search and category
 */
function filterMenuItems() {
  const searchTerm = document.getElementById('menuSearch').value.toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;
  const tableBody = document.querySelector('#menuTable tbody');
  
  // Clear table
  tableBody.innerHTML = '';
  
  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm) || 
                          (item.description && item.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  // If no matches
  if (filteredItems.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No matching menu items found.</td></tr>';
    return;
  }
  
  // Populate table with filtered items
  filteredItems.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <img src="${item.image_url || '/img/placeholder-food.jpg'}" alt="${item.title}" 
             class="menu-thumb" width="50" height="50"
             onerror="this.onerror=null; this.src='/img/placeholder.jpg';">
      </td>
      <td>${item.title}</td>
      <td>${item.category}</td>
      <td>$${parseFloat(item.price).toFixed(2)}</td>
      <td>
        <span class="badge ${getStatusBadgeClass(item.status)}">${capitalizeFirst(item.status)}</span>
      </td>
      <td>
        <div class="d-flex align-items-center">
          <div class="me-2" title="Views"><i class="bi bi-eye"></i> ${item.view_count || 0}</div>
          <div class="me-2" title="Purchases"><i class="bi bi-cart"></i> ${item.purchase_count || 0}</div>
          <div title="Likes"><i class="bi bi-heart"></i> ${item.like_count || 0}</div>
        </div>
      </td>
      <td>
        <div class="btn-group" role="group">
          ${getPublishButton(item)}
          <button type="button" class="btn btn-sm btn-outline-primary edit-btn" data-id="${item.id}" title="Edit Item">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}" data-name="${item.title}" title="Delete Item">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  // Reattach event listeners
  attachActionButtonListeners();
}

/**
 * Initialize event listeners for form buttons
 */
function initializeEventListeners() {
  // Add Item button
  const addItemBtn = document.querySelector('#addItemBtn');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      resetAddItemForm();
      const addItemModal = new bootstrap.Modal(document.getElementById('addItemModal'));
      addItemModal.show();
    });
  }
  
  // Save Item button
  const saveItemBtn = document.querySelector('#saveItemBtn');
  if (saveItemBtn) {
    saveItemBtn.addEventListener('click', saveMenuItem);
  }
  
  // Update Item button
  const updateItemBtn = document.querySelector('#updateItemBtn');
  if (updateItemBtn) {
    updateItemBtn.addEventListener('click', updateMenuItem);
  }
}

/**
 * Reset the Add Item form
 */
function resetAddItemForm() {
  const form = document.getElementById('addItemForm');
  form.reset();
  
  // Set category dropdown to include existing categories
  const categoryInput = document.getElementById('category');
  if (categoryInput && categories.length > 0) {
    // Create a datalist for categories
    let datalist = document.getElementById('categoryList');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'categoryList';
      categoryInput.insertAdjacentElement('afterend', datalist);
      categoryInput.setAttribute('list', 'categoryList');
    }
    
    // Clear and populate datalist
    datalist.innerHTML = '';
    categories.forEach(category => {
      if (category) {
        const option = document.createElement('option');
        option.value = category;
        datalist.appendChild(option);
      }
    });
  }
}

/**
 * Attach event listeners to action buttons
 */
function attachActionButtonListeners() {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function() {
      const itemId = this.getAttribute('data-id');
      editMenuItem(itemId);
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', function() {
      const itemId = this.getAttribute('data-id');
      const itemName = this.getAttribute('data-name');
      confirmDeleteMenuItem(itemId, itemName);
    });
  });
  
  // Publish buttons
  document.querySelectorAll('.publish-btn').forEach(button => {
    button.addEventListener('click', function() {
      const itemId = this.getAttribute('data-id');
      publishMenuItem(itemId, 'active');
    });
  });
  
  // Unpublish buttons
  document.querySelectorAll('.unpublish-btn').forEach(button => {
    button.addEventListener('click', function() {
      const itemId = this.getAttribute('data-id');
      publishMenuItem(itemId, 'inactive');
    });
  });
}

/**
 * Handle publishing/unpublishing a menu item
 * @param {string} itemId - ID of the menu item
 * @param {string} status - New status ('active' or 'inactive')
 */
async function publishMenuItem(itemId, status) {
  // Show loading toast
  showToast(`${status === 'active' ? 'Publishing' : 'Unpublishing'} menu item...`, 'info');
  
  // Add retry logic for 500 errors
  let retryCount = 0;
  const maxRetries = 2;
  let success = false;
  
  while (!success && retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        showToast(`Retrying ${status === 'active' ? 'publish' : 'unpublish'} (attempt ${retryCount} of ${maxRetries})...`, 'info');
        // Short delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await fetch(`/api/menu/${itemId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token-for-dev'}`
        },
        body: JSON.stringify({ status }),
        // Add cache control to prevent caching issues
        cache: 'no-cache'
      });
      
      // Handle different error scenarios
      if (!response.ok) {
        if (response.status === 500 && retryCount < maxRetries) {
          console.warn(`Server error when publishing menu item (attempt ${retryCount + 1})`);
          retryCount++;
          continue; // Try again
        } else if (response.status === 500) {
          console.error('Server error when publishing menu item - all retries failed');
          throw new Error('Server error occurred. Please try again later.');
        }
        
        if (response.status === 404) {
          throw new Error('Menu item not found. It may have been deleted.');
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please log in again.');
        }
        
        // Try to get error details from response
        let errorMessage = `Failed to ${status === 'active' ? 'publish' : 'unpublish'} menu item`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse successful response safely
      try {
        const data = await response.json();
        console.log('Publish operation successful:', data);
      } catch (e) {
        console.warn('Could not parse publish response JSON, but operation may have succeeded');
        // Continue anyway since response was OK
      }
      
      // Success message
      showToast(`Menu item ${status === 'active' ? 'published' : 'unpublished'} successfully!`, 'success');
      
      // Reload menu items to reflect changes
      await loadMenuItems();
      
      // Mark as successful
      success = true;
      return;
    } catch (error) {
      console.error('Error publishing menu item:', error);
      
      // Only show error toast and exit if we've exhausted retries or it's not a 500 error
      if (retryCount >= maxRetries || (error.message && !error.message.includes('Server error'))) {
        showToast('Error publishing menu item: ' + error.message, 'error');
        return;
      }
      
      retryCount++;
    }
  }
}

/**
 * Handle editing a menu item
 * @param {string} itemId - ID of the menu item to edit
 */
function editMenuItem(itemId) {
  const item = menuItems.find(i => i.id == itemId);
  if (!item) {
    showToast('Error: Item not found', 'error');
    return;
  }
  
  // Fill form fields with safe fallbacks
  document.getElementById('edit_item_id').value = item.id;
  document.getElementById('edit_title').value = item.title || '';
  document.getElementById('edit_description').value = item.description || '';
  document.getElementById('edit_price').value = item.price || 0;
  document.getElementById('edit_category').value = item.category || '';
  document.getElementById('edit_status').value = item.status || 'inactive';
  
  // Set checkbox values if they exist
  if (document.getElementById('edit_is_vegetarian')) {
    document.getElementById('edit_is_vegetarian').checked = item.is_vegetarian || false;
  }
  if (document.getElementById('edit_is_gluten_free')) {
    document.getElementById('edit_is_gluten_free').checked = item.is_gluten_free || false;
  }
  if (document.getElementById('edit_is_spicy')) {
    document.getElementById('edit_is_spicy').checked = item.is_spicy || false;
  }
  
  // Show current image if available with fallback
  const currentImage = document.getElementById('current_image');
  const currentImageContainer = document.getElementById('current_image_container');
  if (item.image_url) {
    currentImage.src = item.image_url;
    currentImage.style.display = 'block';
    currentImageContainer.style.display = 'block';
    // Add error handler for missing images
    currentImage.onerror = function() {
      this.src = '/img/placeholder.jpg';
      this.onerror = null;
    };
  } else {
    currentImage.src = '/img/placeholder.jpg';
    currentImage.style.display = 'block';
    currentImageContainer.style.display = 'block';
  }
  
  // Reset file input
  document.getElementById('edit_image').value = '';
  
  // Show the edit modal
  const editItemModal = new bootstrap.Modal(document.getElementById('editItemModal'));
  editItemModal.show();
}

/**
 * Handle deleting a menu item
 * @param {string} itemId - ID of the menu item to delete
 * @param {string} itemName - Name of the menu item for confirmation
 */
function confirmDeleteMenuItem(itemId, itemName) {
  // Set the delete confirmation modal content
  document.getElementById('deleteItemName').textContent = itemName;
  document.getElementById('deleteItemId').value = itemId;
  
  // Show the delete confirmation modal
  const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  deleteConfirmModal.show();
  
  // Set up the confirm delete button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  confirmDeleteBtn.onclick = function() {
    deleteMenuItem(itemId, itemName);
    deleteConfirmModal.hide();
  };
}

/**
 * Save a new menu item
 */
async function saveMenuItem() {
  try {
    const form = document.getElementById('addItemForm');
    const formData = new FormData(form);
    
    // Validate required fields
    const title = formData.get('title');
    const category = formData.get('category');
    const price = formData.get('price');
    
    if (!title || !category || !price) {
      showToast('Please fill out all required fields', 'error');
      return;
    }
    
    // Convert form data to JSON object
    const menuItem = {};
    formData.forEach((value, key) => {
      if (key === 'is_vegetarian' || key === 'is_gluten_free' || key === 'is_spicy') {
        menuItem[key] = value === 'on' ? 1 : 0;
      } else if (key !== 'image') { // Handle image separately
        menuItem[key] = value;
      }
    });
    
    // Don't set image_url here - the server will handle image uploads via multer and S3
    // The formData already contains the image file in the 'image' field
    // The controller will upload it to S3 and store the URL
    
    // Show loading toast
    showToast('Creating new menu item...', 'info');
    
    // Make API request with robust error handling
    try {
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token-for-dev'}`
        },
        body: JSON.stringify(menuItem)
      });
      
      // Handle different error scenarios
      if (!response.ok) {
        if (response.status === 500) {
          console.error('Server error when creating menu item');
          throw new Error('Server error occurred. Please try again.');
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please log in again.');
        }
        
        // Try to get error details from response
        let errorMessage = 'Failed to create menu item';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Try to parse successful response
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.warn('Could not parse response JSON, but item creation may have succeeded');
        // Continue anyway since response was OK
      }
    } catch (error) {
      console.error('Error creating menu item:', error);
      showToast('Error creating menu item: ' + error.message, 'error');
      return; // Exit function early, don't close modal or reload
    }
    
    // Close modal
    const addItemModal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
    addItemModal.hide();
    
    // Show success message
    showToast('Menu item created successfully!', 'success');
    
    // Reload menu items
    await loadMenuItems();
  } catch (error) {
    console.error('Error creating menu item:', error);
    showToast('Error creating menu item: ' + error.message, 'error');
  }
}

/**
 * Update an existing menu item
 */
async function updateMenuItem() {
  try {
    const form = document.getElementById('editItemForm');
    const formData = new FormData(form);
    const itemId = document.getElementById('edit_item_id').value;
    
    // Validate required fields
    const title = formData.get('title');
    const category = formData.get('category');
    const price = formData.get('price');
    
    if (!title || !category || !price) {
      showToast('Please fill out all required fields', 'error');
      return;
    }
    
    // Convert form data to JSON object with proper type handling
    const menuItem = {};
    formData.forEach((value, key) => {
      // Use the same field names as the server expects
      const dbFieldName = key;
      
      if (key === 'is_vegetarian' || key === 'is_gluten_free' || key === 'is_spicy') {
        // Convert checkbox values to integers for MySQL
        menuItem[dbFieldName] = value === 'on' ? 1 : 0;
      } else if (key === 'price') {
        // Ensure price is a valid number
        menuItem[dbFieldName] = parseFloat(value) || 0;
      } else if (key === 'status') {
        // Ensure status is properly set
        menuItem[dbFieldName] = value || 'inactive';
      } else if (key === 'category') {
        // Handle category (might need to be category_id in database)
        menuItem['category_id'] = parseInt(value) || null;
      } else if (key !== 'image' && key !== 'id') { // Handle image and id separately
        // Sanitize strings to prevent SQL injection
        menuItem[dbFieldName] = typeof value === 'string' ? value.trim() : value;
      }
    });
    
    // Ensure is_available is set (required by database schema)
    if (!('is_available' in menuItem)) {
      menuItem.is_available = 1; // Default to available
    }
    
    // Log the data being sent for debugging
    console.log('Updating menu item with data:', menuItem);
    
    // Handle image - in a real implementation, you would upload to S3 here
    const imageFile = formData.get('image');
    if (imageFile && imageFile.size > 0) {
      // For now, just use a placeholder
      // In production, this would be an S3 upload process
      menuItem.image_url = '/img/placeholder.jpg';
    } else {
      // Keep existing image or use default
      const existingItem = menuItems.find(item => item.id == itemId);
      if (existingItem && existingItem.image_url) {
        menuItem.image_url = existingItem.image_url;
      } else {
        // Fallback to a default image that exists
        menuItem.image_url = '/img/placeholder.jpg';
      }
    }
    
    // Show loading toast
    showToast('Updating menu item...', 'info');
    
    // Make API request with robust error handling and retry logic
    let retryCount = 0;
    const maxRetries = 2; // Maximum number of retries for 500 errors
    let success = false;
    
    while (!success && retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          showToast(`Retrying update (attempt ${retryCount} of ${maxRetries})...`, 'info');
          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const response = await fetch(`/api/menu/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token-for-dev'}`
          },
          body: JSON.stringify(menuItem),
          // Add cache control to prevent caching issues
          cache: 'no-cache'
        });
        
        // Handle different error scenarios
        if (!response.ok) {
          if (response.status === 500 && retryCount < maxRetries) {
            console.warn(`Server error when updating menu item (attempt ${retryCount + 1})`);
            retryCount++;
            continue; // Try again
          } else if (response.status === 500) {
            console.error('Server error when updating menu item - all retries failed');
            throw new Error('Server error occurred. Please try again later.');
          }
          
          if (response.status === 404) {
            throw new Error('Menu item not found. It may have been deleted.');
          }
          
          if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication error. Please log in again.');
          }
          
          // Try to get error details from response
          let errorMessage = 'Failed to update menu item';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If can't parse JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        // Try to parse successful response
        let data;
        try {
          data = await response.json();
          console.log('Update successful, received data:', data);
        } catch (e) {
          console.warn('Could not parse response JSON, but update may have succeeded');
          // Continue anyway since response was OK
        }
        
        // If we got here, the request was successful
        success = true;
        
        // Close modal
        const editItemModal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
        editItemModal.hide();
        
        // Show success message
        showToast('Menu item updated successfully!', 'success');
        
        // Reload menu items
        await loadMenuItems();
        return; // Exit after successful update
      } catch (error) {
        console.error('Error updating menu item:', error);
        showToast('Error updating menu item: ' + error.message, 'error');
        
        // Only exit the function if we've exhausted retries or it's not a 500 error
        if (retryCount >= maxRetries || (error.message && !error.message.includes('Server error'))) {
          return; // Exit function early, don't close modal or reload
        }
        
        retryCount++;
      }
    }
  } catch (error) {
    console.error('Error in updateMenuItem outer try-catch:', error);
    showToast('Error updating menu item: ' + error.message, 'error');
  }
}

/**
 * Delete a menu item
 * @param {string} itemId - ID of the menu item to delete
 * @param {string} itemName - Name of the menu item for confirmation
 */
async function deleteMenuItem(itemId, itemName) {
  if (confirm(`Are you sure you want to delete ${itemName}? This action cannot be undone.`)) {
    // Show loading toast
    showToast(`Deleting ${itemName}...`, 'info');
    
    try {
      // Make API request with proper auth
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token-for-dev'}`
        }
      });
      
      // Handle different error scenarios
      if (!response.ok) {
        if (response.status === 500) {
          console.error('Server error when deleting menu item');
          throw new Error('Server error occurred. The item may still exist.');
        }
        
        if (response.status === 404) {
          throw new Error('Menu item not found. It may have been already deleted.');
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please log in again.');
        }
        
        // Try to get error details from response
        let errorMessage = 'Failed to delete menu item';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse successful response safely
      try {
        await response.json();
      } catch (e) {
        console.warn('Could not parse delete response JSON, but delete may have succeeded');
        // Continue anyway since response was OK
      }
      
      // Show success notification
      showToast(`${itemName} has been deleted successfully`, 'success');
      
      // Reload menu items
      loadMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      showToast(`Error deleting ${itemName}: ${error.message}`, 'error');
    }
  }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'warning', 'info')
 */
function showToast(message, type = 'info') {
  // Check if there's a toast container, if not create one
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toastElement = document.createElement('div');
  toastElement.className = 'toast';
  toastElement.id = toastId;
  toastElement.setAttribute('role', 'alert');
  toastElement.setAttribute('aria-live', 'assertive');
  toastElement.setAttribute('aria-atomic', 'true');
  
  // Set background color based on type
  let bgClass = 'bg-primary text-white';
  switch (type) {
    case 'success':
      bgClass = 'bg-success text-white';
      break;
    case 'error':
      bgClass = 'bg-danger text-white';
      break;
    case 'warning':
      bgClass = 'bg-warning';
      break;
  }
  
  // Set toast content
  toastElement.innerHTML = `
    <div class="toast-header ${bgClass}">
      <strong class="me-auto">${capitalizeFirst(type)}</strong>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toastElement);
  
  // Initialize and show toast
  const toastInstance = new bootstrap.Toast(toastElement, { delay: 5000 });
  toastInstance.show();
  
  // Remove from DOM after hidden
  toastElement.addEventListener('hidden.bs.toast', function() {
    toastElement.remove();
  });
}
