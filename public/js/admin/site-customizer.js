/**
 * Site Customization JavaScript
 * Handles client-side functionality for the admin site customization page
 */

// Global variables
let siteSettings = {
  general: {
    restaurantName: 'Baklovah Baklava & Cafe',
    logoUrl: '/images/customer/logo.png',
    tagline: 'Authentic Middle Eastern Sweets & Cuisine',
    description: 'Family owned Middle Eastern restaurant serving authentic dishes with the finest ingredients.'
  },
  theme: {
    primaryColor: '#8B5E34',
    secondaryColor: '#6c757d',
    accentColor: '#ffc107',
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  homepage: {
    heroTitle: 'Welcome to Baklovah',
    heroSubtitle: 'Authentic Middle Eastern Cuisine',
    heroButtonText: 'Order Now',
    heroButtonLink: '/menu',
    heroImageUrl: '/images/customer/hero-bg.jpg',
    featuredCategories: ['baklava', 'kunafa', 'coffee', 'desserts']
  },
  contact: {
    phone: '(555) 123-4567',
    email: 'contact@baklovahcafe.com',
    address: '123 Middle Eastern St, San Francisco, CA 94123',
    mapEmbedUrl: 'https://maps.google.com/maps?q=San%20Francisco&output=embed'
  },
  hours: {
    monday: { open: '11:00', close: '21:00', closed: false },
    tuesday: { open: '11:00', close: '21:00', closed: false },
    wednesday: { open: '11:00', close: '21:00', closed: false },
    thursday: { open: '11:00', close: '22:00', closed: false },
    friday: { open: '11:00', close: '22:00', closed: false },
    saturday: { open: '10:00', close: '22:00', closed: false },
    sunday: { open: '10:00', close: '20:00', closed: false }
  }
};
let initialSettings = {}; // For tracking changes
let unsavedChanges = false;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Site customizer script loaded');
  // Initialize the page
  initializePage();
  
  // Set up event listeners
  setupEventListeners();
});

/**
 * Initialize the customization page
 */
async function initializePage() {
  try {
    // Make a copy of initial settings
    initialSettings = JSON.parse(JSON.stringify(siteSettings));
    
    // Populate form fields with settings
    populateFormFields();
    
    // Initialize color pickers for theme customization
    initializeColorPickers();
    
    // Initialize image previews for uploads
    initializeImagePreviews();
    
    // Setup the theme preview
    updateThemePreview();
    
    console.log('Customization page initialized successfully');
  } catch (error) {
    console.error('Error initializing customization page:', error);
    showToast('Error loading site settings', 'error');
  }
}

/**
 * Fetch site settings from the server
 */
async function fetchSiteSettings() {
  try {
    // In a real application, you would fetch the settings from the server
    // For now, we're using the default settings defined at the top of this file
    console.log('Using default site settings');
    
    // In the future, we can implement this to fetch from an API
    // const response = await fetch('/api/site-settings');
    // if (!response.ok) throw new Error('Failed to fetch site settings');
    // siteSettings = await response.json();
    
    return siteSettings;
  } catch (error) {
    console.error('Error fetching site settings:', error);
    throw error;
  }
}

/**
 * Populate form fields with settings
 */
function populateFormFields() {
  // Restaurant Information
  document.getElementById('restaurantName').value = siteSettings.general.restaurantName || '';
  document.getElementById('restaurantTagline').value = siteSettings.general.tagline || '';
  document.getElementById('restaurantDescription').value = siteSettings.general.description || '';
  
  // Theme Settings
  document.getElementById('primaryColor').value = siteSettings.theme.primaryColor || '#8B5E34';
  document.getElementById('primaryColorText').value = siteSettings.theme.primaryColor || '#8B5E34';
  document.getElementById('secondaryColor').value = siteSettings.theme.secondaryColor || '#6c757d';
  document.getElementById('secondaryColorText').value = siteSettings.theme.secondaryColor || '#6c757d';
  document.getElementById('accentColor').value = siteSettings.theme.accentColor || '#ffc107';
  document.getElementById('accentColorText').value = siteSettings.theme.accentColor || '#ffc107';
  
  if (document.getElementById('fontFamily')) {
    const fontSelectElement = document.getElementById('fontFamily');
    const fontValue = siteSettings.theme.fontFamily || "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif";
    
    // Find the option with matching value, or default to first option
    for (let i = 0; i < fontSelectElement.options.length; i++) {
      if (fontSelectElement.options[i].value === fontValue) {
        fontSelectElement.selectedIndex = i;
        break;
      }
    }
  }
  
  // Hero Section
  document.getElementById('heroTitle').value = siteSettings.homepage.heroTitle || '';
  document.getElementById('heroSubtitle').value = siteSettings.homepage.heroSubtitle || '';
  document.getElementById('heroButtonText').value = siteSettings.homepage.heroButtonText || '';
  document.getElementById('heroButtonLink').value = siteSettings.homepage.heroButtonLink || '';
  
  // Check featured categories
  const featuredCats = siteSettings.homepage.featuredCategories || [];
  document.querySelectorAll('#categoriesCheckboxes input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = featuredCats.includes(checkbox.value);
  });
  
  console.log('Form fields populated with settings');
}

/**
 * Initialize color pickers and their text inputs
 */
function initializeColorPickers() {
  const colorInputs = document.querySelectorAll('input[type="color"]');
  colorInputs.forEach(colorInput => {
    const textInput = document.getElementById(colorInput.id + 'Text');
    if (textInput) {
      // Ensure the values match on initialization
      textInput.value = colorInput.value;
      
      // Add event listeners to sync values
      colorInput.addEventListener('input', function() {
        textInput.value = this.value;
        updateThemePreview();
      });
      
      textInput.addEventListener('input', function() {
        // Validate and normalize hex color
        let color = this.value;
        if (/^#[0-9A-F]{6}$/i.test(color)) {
          colorInput.value = color;
          updateThemePreview();
        }
      });
    }
  });
  
  console.log('Color pickers initialized');
}

/**
 * Initialize image preview functionality
 */
function initializeImagePreviews() {
  // Setup file input previews
  const fileInputs = ['restaurantLogo', 'heroImage'];
  
  fileInputs.forEach(inputId => {
    const fileInput = document.getElementById(inputId);
    if (!fileInput) return;
    
    const previewContainer = document.getElementById('current' + inputId.charAt(0).toUpperCase() + inputId.slice(1) + 'Preview');
    if (!previewContainer) return;
    
    const previewImg = previewContainer.querySelector('img');
    if (!previewImg) return;
    
    // Show current image if available
    if (inputId === 'restaurantLogo' && siteSettings.general.logoUrl) {
      previewImg.src = siteSettings.general.logoUrl;
      previewImg.style.display = 'block';
    } else if (inputId === 'heroImage' && siteSettings.homepage.heroImageUrl) {
      previewImg.src = siteSettings.homepage.heroImageUrl;
      previewImg.style.display = 'block';
    }
    
    // Add change event listener to show preview of selected file
    fileInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          previewImg.style.display = 'block';
          markUnsavedChanges();
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        previewImg.style.display = 'none';
      }
    });
  });
  
  console.log('Image previews initialized');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Bootstrap tabs are already handled by Bootstrap's JavaScript
  
  // Form inputs change detection - connect to all form inputs in the customization page
  document.querySelectorAll('.card-body input, .card-body textarea, .card-body select').forEach(input => {
    input.addEventListener('change', function() {
      markUnsavedChanges();
    });
    
    // For text inputs, also listen for keyup
    if (input.type === 'text' || input.tagName.toLowerCase() === 'textarea') {
      input.addEventListener('keyup', function() {
        markUnsavedChanges();
      });
    }
  });
  
  // Color picker synchronization
  document.querySelectorAll('input[type="color"]').forEach(colorInput => {
    const textInput = document.getElementById(colorInput.id + 'Text');
    if (textInput) {
      // Update text when color changes
      colorInput.addEventListener('input', function() {
        textInput.value = this.value;
        updateThemePreview();
      });
      
      // Update color when text changes
      textInput.addEventListener('input', function() {
        colorInput.value = this.value;
        updateThemePreview();
      });
    }
  });
  
  // Save button - use the main save button specified in the template
  const saveBtn = document.getElementById('saveCustomizationsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }
  
  // Form submissions - prevent default and handle via API
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      saveSettings();
    });
  });
  
  // Before unload warning
  window.addEventListener('beforeunload', function(e) {
    if (unsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });
  
  console.log('Event listeners set up successfully');
}

/**
 * Updates the theme preview with current color and font settings
 */
function updateThemePreview() {
  const previewEl = document.querySelector('.theme-preview');
  if (!previewEl) return;

  const primaryColor = document.getElementById('primaryColor').value;
  const secondaryColor = document.getElementById('secondaryColor').value;
  const accentColor = document.getElementById('accentColor').value;
  const fontFamily = document.getElementById('fontFamily')?.value || 
    "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif";

  // Apply colors and font to preview
  previewEl.style.fontFamily = fontFamily;
  
  // Update preview elements
  const previewHeading = previewEl.querySelector('.preview-heading');
  if (previewHeading) previewHeading.style.color = primaryColor;
  
  const previewText = previewEl.querySelector('.preview-text');
  if (previewText) previewText.style.color = secondaryColor;
  
  const primaryBtn = previewEl.querySelector('.preview-primary-btn');
  if (primaryBtn) {
    primaryBtn.style.backgroundColor = primaryColor;
    primaryBtn.style.color = '#fff';
    primaryBtn.style.borderColor = primaryColor;
  }
  
  const secondaryBtn = previewEl.querySelector('.preview-secondary-btn');
  if (secondaryBtn) {
    secondaryBtn.style.backgroundColor = 'transparent';
    secondaryBtn.style.color = accentColor;
    secondaryBtn.style.borderColor = accentColor;
  }
  
  console.log('Theme preview updated');
}

/**
 * Mark form as having unsaved changes
 */
function markUnsavedChanges() {
  unsavedChanges = true;
  const saveBtn = document.getElementById('saveCustomizationsBtn');
  if (saveBtn) {
    saveBtn.classList.add('btn-pulse');
  }
}

/**
 * Save site settings to the server
 */
async function saveSettings() {
  try {
    // Show save in progress
    const saveBtn = document.getElementById('saveCustomizationsBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
      saveBtn.disabled = true;
    }

    // Collect data from all forms
    const updatedSettings = {
      general: {},
      theme: {},
      homepage: {},
      contact: {},
      hours: {}
    };

    // Restaurant Info
    updatedSettings.general.restaurantName = document.getElementById('restaurantName')?.value || '';
    updatedSettings.general.tagline = document.getElementById('restaurantTagline')?.value || '';
    updatedSettings.general.description = document.getElementById('restaurantDescription')?.value || '';

    // Theme settings
    updatedSettings.theme.primaryColor = document.getElementById('primaryColor')?.value || '#8B5E34';
    updatedSettings.theme.secondaryColor = document.getElementById('secondaryColor')?.value || '#6c757d';
    updatedSettings.theme.accentColor = document.getElementById('accentColor')?.value || '#ffc107';
    updatedSettings.theme.fontFamily = document.getElementById('fontFamily')?.value || 
      "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif";

    // Homepage settings
    updatedSettings.homepage.heroTitle = document.getElementById('heroTitle')?.value || '';
    updatedSettings.homepage.heroSubtitle = document.getElementById('heroSubtitle')?.value || '';
    updatedSettings.homepage.heroButtonText = document.getElementById('heroButtonText')?.value || '';
    updatedSettings.homepage.heroButtonLink = document.getElementById('heroButtonLink')?.value || '';
    
    // Featured categories
    const featuredCategories = [];
    document.querySelectorAll('#categoriesCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
      featuredCategories.push(checkbox.value);
    });
    updatedSettings.homepage.featuredCategories = featuredCategories;

    // Handle file uploads
    const logoFile = document.getElementById('restaurantLogo')?.files?.[0];
    const heroFile = document.getElementById('heroImage')?.files?.[0];

    // Simulate a file upload - in a real app we'd use FormData and fetch
    if (logoFile) {
      console.log('Logo file would be uploaded:', logoFile.name);
      // Placeholder for upload - in production, you'd use FormData and upload to server
      // updatedSettings.general.logoUrl = '/uploads/' + logoFile.name;
    }

    if (heroFile) {
      console.log('Hero image would be uploaded:', heroFile.name);
      // Placeholder for upload - in production, you'd use FormData and upload to server
      // updatedSettings.homepage.heroImageUrl = '/uploads/' + heroFile.name;
    }

    // Update the settings
    console.log('Settings would be saved to server:', updatedSettings);
    
    // In a real app, you'd send this to your API
    // const response = await fetch('/api/site-settings', {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(updatedSettings)
    // });
    // if (!response.ok) throw new Error('Failed to save settings');

    // For demo purposes, just update our local copy
    Object.assign(siteSettings, updatedSettings);
    initialSettings = JSON.parse(JSON.stringify(siteSettings));
    unsavedChanges = false;

    // Success message
    showToast('Settings saved successfully', 'success');

    // Reset save button
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="bi bi-save"></i> Save Changes';
      saveBtn.disabled = false;
      saveBtn.classList.remove('btn-pulse');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Error saving settings: ' + error.message, 'error');
    
    // Reset save button on error
    const saveBtn = document.getElementById('saveCustomizationsBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="bi bi-save"></i> Save Changes';
      saveBtn.disabled = false;
    }
  }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast: success, error, warning, info
 */
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }

  // Create a unique ID for this toast
  const toastId = 'toast-' + Date.now();
  
  // Set the appropriate color based on type
  let bgColor = 'bg-primary';
  let icon = '<i class="bi bi-info-circle me-2"></i>';
  
  switch (type) {
    case 'success':
      bgColor = 'bg-success';
      icon = '<i class="bi bi-check-circle me-2"></i>';
      break;
    case 'error':
      bgColor = 'bg-danger';
      icon = '<i class="bi bi-exclamation-circle me-2"></i>';
      break;
    case 'warning':
      bgColor = 'bg-warning';
      icon = '<i class="bi bi-exclamation-triangle me-2"></i>';
      break;
  }

  // Create the toast HTML
  const toastHtml = `
    <div class="toast align-items-center ${bgColor} text-white" role="alert" aria-live="assertive" aria-atomic="true" id="${toastId}">
      <div class="d-flex">
        <div class="toast-body">
          ${icon} ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  // Add the toast to the container
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);

  // Initialize and show the toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
  toast.show();
  
  // Remove the toast element after it's hidden
  toastElement.addEventListener('hidden.bs.toast', function() {
    toastElement.remove();
  });
}

/**
 * Activate a specific tab
 * @param {string} tabId - ID of the tab to activate
 */
function activateTab(tabId) {
  // Update current tab
  currentTab = tabId;
  
  // Update active tab button
  document.querySelectorAll('.customize-tab').forEach(tab => {
    if (tab.getAttribute('data-tab') === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Show active tab content, hide others
  document.querySelectorAll('.customize-tab-content').forEach(content => {
    if (content.id === `${tabId}-tab`) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });
}

/**
 * Fetch site settings from API
 */
async function fetchSiteSettings() {
  try {
    const response = await fetch('/api/settings');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch site settings');
    }
    
    const data = await response.json();
    siteSettings = data.settings || {};
    
    // Store initial settings for comparison
    initialSettings = JSON.parse(JSON.stringify(siteSettings));
    
    return siteSettings;
  } catch (error) {
    console.error('Error fetching site settings:', error);
    showToast('Error fetching site settings: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Populate form fields with settings values
 */
function populateFormFields() {
  // Iterate through form fields and set values
  document.querySelectorAll('[data-setting]').forEach(field => {
    const settingKey = field.getAttribute('data-setting');
    const settingValue = getNestedValue(siteSettings, settingKey);
    
    if (settingValue !== undefined) {
      // Handle different input types
      if (field.type === 'checkbox') {
        field.checked = settingValue === true || settingValue === 'true' || settingValue === '1';
      } else if (field.tagName === 'SELECT') {
        field.value = settingValue;
      } else if (field.type === 'color') {
        field.value = settingValue;
        // Update any associated color preview
        const previewId = field.getAttribute('data-color-preview');
        if (previewId) {
          const preview = document.getElementById(previewId);
          if (preview) {
            preview.style.backgroundColor = settingValue;
          }
        }
      } else if (field.type === 'file') {
        // For file inputs, we can't set the value directly
        // Instead, display the current filename or preview image
        const filenameDisplay = document.getElementById(`${field.id}-filename`);
        if (filenameDisplay) {
          filenameDisplay.textContent = getFilenameFromPath(settingValue);
        }
        
        // Update image preview if applicable
        const previewId = field.getAttribute('data-image-preview');
        if (previewId) {
          const preview = document.getElementById(previewId);
          if (preview) {
            preview.src = settingValue || '/img/placeholder-image.jpg';
            preview.style.display = 'block';
          }
        }
      } else {
        // Text, textarea, etc.
        field.value = settingValue;
      }
    }
  });
  
  // Handle special cases like business hours
  populateBusinessHours();
  
  // Reset unsaved changes flag
  unsavedChanges = false;
  updateSaveButtonState();
}

/**
 * Populate business hours fields
 */
function populateBusinessHours() {
  if (!siteSettings.businessHours) return;
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach(day => {
    if (siteSettings.businessHours[day]) {
      const hours = siteSettings.businessHours[day];
      
      // Set closed checkbox
      const closedCheckbox = document.getElementById(`${day}-closed`);
      if (closedCheckbox) {
        closedCheckbox.checked = hours.closed === true || hours.closed === 'true';
        toggleHoursInputs(day, hours.closed);
      }
      
      // Set opening hours
      const openingInput = document.getElementById(`${day}-opening`);
      if (openingInput && hours.open) {
        openingInput.value = hours.open;
      }
      
      // Set closing hours
      const closingInput = document.getElementById(`${day}-closing`);
      if (closingInput && hours.close) {
        closingInput.value = hours.close;
      }
    }
  });
}

/**
 * Toggle the disabled state of hours inputs based on closed status
 * @param {string} day - Day of the week
 * @param {boolean} isClosed - Whether the restaurant is closed on this day
 */
function toggleHoursInputs(day, isClosed) {
  const openingInput = document.getElementById(`${day}-opening`);
  const closingInput = document.getElementById(`${day}-closing`);
  
  if (openingInput) openingInput.disabled = isClosed;
  if (closingInput) closingInput.disabled = isClosed;
}

/**
 * Initialize color pickers and their previews
 */
function initializeColorPickers() {
  document.querySelectorAll('input[type="color"]').forEach(colorPicker => {
    // Set up change event to update preview
    colorPicker.addEventListener('input', function() {
      const previewId = this.getAttribute('data-color-preview');
      if (previewId) {
        const preview = document.getElementById(previewId);
        if (preview) {
          preview.style.backgroundColor = this.value;
        }
      }
      markUnsavedChanges();
    });
  });
}

/**
 * Initialize image preview functionality
 */
function initializeImagePreviews() {
  document.querySelectorAll('input[type="file"][data-image-preview]').forEach(fileInput => {
    fileInput.addEventListener('change', function() {
      const previewId = this.getAttribute('data-image-preview');
      const preview = document.getElementById(previewId);
      
      if (preview && this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          preview.src = e.target.result;
          preview.style.display = 'block';
        };
        
        reader.readAsDataURL(this.files[0]);
        markUnsavedChanges();
      }
    });
  });
}

/**
 * Mark form as having unsaved changes
 */
function markUnsavedChanges() {
  unsavedChanges = true;
  updateSaveButtonState();
}

/**
 * Update save button state based on changes
 */
function updateSaveButtonState() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  const resetBtn = document.getElementById('resetSettingsBtn');
  
  if (unsavedChanges) {
    saveBtn.classList.remove('btn-outline-primary');
    saveBtn.classList.add('btn-primary');
    saveBtn.removeAttribute('disabled');
    
    resetBtn.removeAttribute('disabled');
  } else {
    saveBtn.classList.remove('btn-primary');
    saveBtn.classList.add('btn-outline-primary');
    saveBtn.setAttribute('disabled', 'disabled');
    
    resetBtn.setAttribute('disabled', 'disabled');
  }
}

/**
 * Save settings to the server
 */
async function saveSettings() {
  try {
    // Show loading state
    const saveBtn = document.getElementById('saveSettingsBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    // Collect form data
    const updatedSettings = collectFormData();
    
    // Make API request
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ settings: updatedSettings })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save settings');
    }
    
    // Update local settings
    siteSettings = updatedSettings;
    initialSettings = JSON.parse(JSON.stringify(updatedSettings));
    
    // Reset unsaved changes flag
    unsavedChanges = false;
    updateSaveButtonState();
    
    // Show success message
    showToast('Site settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Error saving settings: ' + error.message, 'error');
  } finally {
    // Restore button state
    const saveBtn = document.getElementById('saveSettingsBtn');
    saveBtn.innerHTML = 'Save Changes';
    saveBtn.disabled = false;
  }
}

/**
 * Collect form data from all inputs
 * @returns {Object} The collected settings data
 */
function collectFormData() {
  const settings = {};
  
  // Collect data from all fields with data-setting attribute
  document.querySelectorAll('[data-setting]').forEach(field => {
    const settingKey = field.getAttribute('data-setting');
    let settingValue;
    
    // Get value based on input type
    if (field.type === 'checkbox') {
      settingValue = field.checked;
    } else if (field.type === 'file') {
      // For file inputs, we need to handle files separately via FormData
      // For now, keep existing value
      settingValue = getNestedValue(siteSettings, settingKey);
    } else {
      settingValue = field.value;
    }
    
    // Set value in the settings object (handling nested keys)
    setNestedValue(settings, settingKey, settingValue);
  });
  
  // Handle special cases like business hours
  collectBusinessHours(settings);
  
  return settings;
}

/**
 * Collect business hours data from form
 * @param {Object} settings - The settings object to update
 */
function collectBusinessHours(settings) {
  if (!settings.businessHours) {
    settings.businessHours = {};
  }
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach(day => {
    const closedCheckbox = document.getElementById(`${day}-closed`);
    const openingInput = document.getElementById(`${day}-opening`);
    const closingInput = document.getElementById(`${day}-closing`);
    
    if (closedCheckbox) {
      settings.businessHours[day] = {
        closed: closedCheckbox.checked,
        open: openingInput ? openingInput.value : '',
        close: closingInput ? closingInput.value : ''
      };
    }
  });
}

/**
 * Reset the form to initial values
 */
function resetForm() {
  if (confirm('Are you sure you want to reset all changes?')) {
    // Reset settings to initial state
    siteSettings = JSON.parse(JSON.stringify(initialSettings));
    
    // Repopulate form fields
    populateFormFields();
    
    // Reset unsaved changes flag
    unsavedChanges = false;
    updateSaveButtonState();
    
    // Show message
    showToast('Form has been reset to last saved state.', 'info');
  }
}

/**
 * Get a nested value from an object using a dot-notation path
 * @param {Object} obj - The object to get the value from
 * @param {string} path - The dot-notation path to the value
 * @returns {*} The value at the path, or undefined if not found
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
}

/**
 * Set a nested value in an object using a dot-notation path
 * @param {Object} obj - The object to set the value in
 * @param {string} path - The dot-notation path to the value
 * @param {*} value - The value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  const lastObj = keys.reduce((prev, curr) => {
    if (!prev[curr]) prev[curr] = {};
    return prev[curr];
  }, obj);
  
  lastObj[lastKey] = value;
}

/**
 * Get filename from a path
 * @param {string} path - The file path
 * @returns {string} The filename
 */
function getFilenameFromPath(path) {
  if (!path) return 'No file selected';
  return path.split('/').pop();
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
      <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
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
