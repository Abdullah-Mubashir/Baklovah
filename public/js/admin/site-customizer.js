/**
 * Site Customization JavaScript
 * Handles client-side functionality for the admin site customization page
 */

// Global variables
let siteSettings = {};
let initialSettings = {}; // For tracking changes
let currentTab = 'general'; // Default active tab
let unsavedChanges = false;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
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
    // Show loading state
    document.getElementById('settingsLoadingSpinner').style.display = 'block';
    document.querySelector('.customize-container').style.display = 'none';
    
    // Fetch site settings
    await fetchSiteSettings();
    
    // Populate form fields with settings
    populateFormFields();
    
    // Hide loading spinner and show content
    document.getElementById('settingsLoadingSpinner').style.display = 'none';
    document.querySelector('.customize-container').style.display = 'block';
    
    // Initialize color pickers
    initializeColorPickers();
    
    // Initialize image previews
    initializeImagePreviews();
  } catch (error) {
    console.error('Error initializing customization page:', error);
    showToast('Error loading site settings: ' + error.message, 'error');
    document.getElementById('settingsLoadingSpinner').style.display = 'none';
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.customize-tab').forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      const tabId = this.getAttribute('data-tab');
      activateTab(tabId);
    });
  });
  
  // Form inputs change detection
  document.querySelectorAll('.settings-form input, .settings-form textarea, .settings-form select').forEach(input => {
    input.addEventListener('change', function() {
      markUnsavedChanges();
    });
    
    // For text inputs, also listen for keyup
    if (input.type === 'text' || input.type === 'textarea') {
      input.addEventListener('keyup', function() {
        markUnsavedChanges();
      });
    }
  });
  
  // Save button
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  
  // Reset button
  document.getElementById('resetSettingsBtn').addEventListener('click', resetForm);
  
  // Before unload warning
  window.addEventListener('beforeunload', function(e) {
    if (unsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
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
