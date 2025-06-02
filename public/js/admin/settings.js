/**
 * Baklovah Admin - Settings Page JavaScript
 * Handles all settings page functionality including form submissions,
 * user management, and notification settings
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize tabs
    const triggerTabList = [].slice.call(document.querySelectorAll('#settingsTab button'));
    triggerTabList.forEach(function(triggerEl) {
        const tabTrigger = new bootstrap.Tab(triggerEl);
        triggerEl.addEventListener('click', function(event) {
            event.preventDefault();
            tabTrigger.show();
            // Save active tab to localStorage
            localStorage.setItem('baklovah_settings_active_tab', triggerEl.getAttribute('id'));
        });
    });

    // Restore active tab from localStorage if available
    const activeTabId = localStorage.getItem('baklovah_settings_active_tab');
    if (activeTabId) {
        const activeTab = document.querySelector(`#${activeTabId}`);
        if (activeTab) {
            const tab = new bootstrap.Tab(activeTab);
            tab.show();
        }
    }

    // System Settings Form
    const systemSettingsForm = document.getElementById('systemSettingsForm');
    if (systemSettingsForm) {
        systemSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                siteName: document.getElementById('siteName').value,
                timeZone: document.getElementById('timeZone').value,
                dateFormat: document.getElementById('dateFormat').value,
                currencySymbol: document.getElementById('currencySymbol').value,
                maintenanceMode: document.getElementById('enableMaintenanceMode').checked
            };
            
            saveSettings('system', formData);
        });
    }

    // Order Settings Form
    const orderSettingsForm = document.getElementById('orderSettingsForm');
    if (orderSettingsForm) {
        orderSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                taxRate: document.getElementById('taxRate').value,
                minimumOrderAmount: document.getElementById('minimumOrderAmount').value,
                deliveryFee: document.getElementById('deliveryFee').value,
                freeDeliveryThreshold: document.getElementById('freeDeliveryThreshold').value,
                enableOnlineOrdering: document.getElementById('enableOnlineOrdering').checked
            };
            
            saveSettings('order', formData);
        });
    }

    // Stripe Settings Form
    const stripeSettingsForm = document.getElementById('stripeSettingsForm');
    if (stripeSettingsForm) {
        stripeSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                publishableKey: document.getElementById('stripePublishableKey').value,
                secretKey: document.getElementById('stripeSecretKey').value,
                testMode: document.getElementById('stripeTestMode').checked,
                enabled: document.getElementById('enableStripe').checked
            };
            
            saveSettings('stripe', formData);
        });
    }

    // Payment Methods Form
    const paymentMethodsForm = document.getElementById('paymentMethodsForm');
    if (paymentMethodsForm) {
        paymentMethodsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                creditCards: document.getElementById('enableCreditCards').checked,
                cashOnDelivery: document.getElementById('enableCashOnDelivery').checked,
                applePay: document.getElementById('enableApplePay').checked,
                googlePay: document.getElementById('enableGooglePay').checked
            };
            
            saveSettings('paymentMethods', formData);
        });
    }

    // Email Settings Form
    const emailSettingsForm = document.getElementById('emailSettingsForm');
    if (emailSettingsForm) {
        emailSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                smtpHost: document.getElementById('smtpHost').value,
                smtpPort: document.getElementById('smtpPort').value,
                smtpUsername: document.getElementById('smtpUsername').value,
                smtpPassword: document.getElementById('smtpPassword').value,
                fromEmail: document.getElementById('fromEmail').value,
                enabled: document.getElementById('enableEmailNotifications').checked
            };
            
            saveSettings('email', formData);
        });
    }

    // Notification Settings Form
    const notificationSettingsForm = document.getElementById('notificationSettingsForm');
    if (notificationSettingsForm) {
        notificationSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                admin: {
                    newOrders: document.getElementById('notifyNewOrders').checked,
                    lowStock: document.getElementById('notifyLowStock').checked,
                    newReviews: document.getElementById('notifyNewReviews').checked
                },
                customer: {
                    orderConfirmation: document.getElementById('sendOrderConfirmation').checked,
                    orderStatusUpdates: document.getElementById('sendOrderStatusUpdates').checked,
                    promotionalEmails: document.getElementById('sendPromotionalEmails').checked
                }
            };
            
            saveSettings('notifications', formData);
        });
    }

    // User Management
    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', function() {
            const userData = {
                name: document.getElementById('userName').value,
                email: document.getElementById('userEmail').value,
                password: document.getElementById('userPassword').value,
                role: document.getElementById('userRole').value,
                active: document.getElementById('userActive').checked
            };
            
            saveUser(userData);
        });
    }

    // Delete User Buttons
    const deleteUserBtns = document.querySelectorAll('.delete-user-btn');
    deleteUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            if (confirm('Are you sure you want to delete this user?')) {
                deleteUser(userId);
            }
        });
    });

    // Edit User Buttons
    const editUserBtns = document.querySelectorAll('.edit-user-btn');
    editUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            fetchUserDetails(userId);
        });
    });

    // Load initial settings data
    loadAllSettings();
});

/**
 * Save settings to the backend
 * @param {string} settingType - Type of settings (system, order, stripe, etc.)
 * @param {object} formData - Form data to save
 */
function saveSettings(settingType, formData) {
    // Show loading state
    showToast('Saving settings...', 'info');
    
    fetch(`/api/admin/settings/${settingType}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        return response.json();
    })
    .then(data => {
        showToast('Settings saved successfully!', 'success');
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        showToast('Error saving settings. Please try again.', 'error');
    });
}

/**
 * Load all settings from the backend
 */
function loadAllSettings() {
    // Load system settings
    fetch('/api/admin/settings/all', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load settings');
        }
        return response.json();
    })
    .then(data => {
        // Populate form fields with settings data
        populateSettingsForms(data);
    })
    .catch(error => {
        console.error('Error loading settings:', error);
        showToast('Error loading settings. Please refresh the page.', 'error');
    });
}

/**
 * Populate settings forms with data from the backend
 * @param {object} data - Settings data from the backend
 */
function populateSettingsForms(data) {
    // System settings
    if (data.system) {
        document.getElementById('siteName').value = data.system.siteName || '';
        document.getElementById('timeZone').value = data.system.timeZone || 'America/New_York';
        document.getElementById('dateFormat').value = data.system.dateFormat || 'MM/DD/YYYY';
        document.getElementById('currencySymbol').value = data.system.currencySymbol || '$';
        document.getElementById('enableMaintenanceMode').checked = data.system.maintenanceMode || false;
    }
    
    // Order settings
    if (data.order) {
        document.getElementById('taxRate').value = data.order.taxRate || '';
        document.getElementById('minimumOrderAmount').value = data.order.minimumOrderAmount || '';
        document.getElementById('deliveryFee').value = data.order.deliveryFee || '';
        document.getElementById('freeDeliveryThreshold').value = data.order.freeDeliveryThreshold || '';
        document.getElementById('enableOnlineOrdering').checked = data.order.enableOnlineOrdering !== false;
    }
    
    // Stripe settings
    if (data.stripe) {
        document.getElementById('stripePublishableKey').value = data.stripe.publishableKey || '';
        document.getElementById('stripeSecretKey').value = data.stripe.secretKey || '';
        document.getElementById('stripeTestMode').checked = data.stripe.testMode !== false;
        document.getElementById('enableStripe').checked = data.stripe.enabled !== false;
    }
    
    // Payment methods
    if (data.paymentMethods) {
        document.getElementById('enableCreditCards').checked = data.paymentMethods.creditCards !== false;
        document.getElementById('enableCashOnDelivery').checked = data.paymentMethods.cashOnDelivery !== false;
        document.getElementById('enableApplePay').checked = data.paymentMethods.applePay || false;
        document.getElementById('enableGooglePay').checked = data.paymentMethods.googlePay || false;
    }
    
    // Email settings
    if (data.email) {
        document.getElementById('smtpHost').value = data.email.smtpHost || '';
        document.getElementById('smtpPort').value = data.email.smtpPort || '';
        document.getElementById('smtpUsername').value = data.email.smtpUsername || '';
        document.getElementById('smtpPassword').value = data.email.smtpPassword || '';
        document.getElementById('fromEmail').value = data.email.fromEmail || '';
        document.getElementById('enableEmailNotifications').checked = data.email.enabled !== false;
    }
    
    // Notification settings
    if (data.notifications) {
        // Admin notifications
        if (data.notifications.admin) {
            document.getElementById('notifyNewOrders').checked = data.notifications.admin.newOrders !== false;
            document.getElementById('notifyLowStock').checked = data.notifications.admin.lowStock !== false;
            document.getElementById('notifyNewReviews').checked = data.notifications.admin.newReviews !== false;
        }
        
        // Customer notifications
        if (data.notifications.customer) {
            document.getElementById('sendOrderConfirmation').checked = data.notifications.customer.orderConfirmation !== false;
            document.getElementById('sendOrderStatusUpdates').checked = data.notifications.customer.orderStatusUpdates !== false;
            document.getElementById('sendPromotionalEmails').checked = data.notifications.customer.promotionalEmails || false;
        }
    }
}

/**
 * Save user to the backend
 * @param {object} userData - User data to save
 */
function saveUser(userData) {
    // Show loading state
    showToast('Saving user...', 'info');
    
    fetch('/api/admin/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save user');
        }
        return response.json();
    })
    .then(data => {
        showToast('User saved successfully!', 'success');
        // Close modal and refresh user list
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        modal.hide();
        loadUsers();
    })
    .catch(error => {
        console.error('Error saving user:', error);
        showToast('Error saving user. Please try again.', 'error');
    });
}

/**
 * Delete user from the backend
 * @param {string} userId - User ID to delete
 */
function deleteUser(userId) {
    // Show loading state
    showToast('Deleting user...', 'info');
    
    fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        return response.json();
    })
    .then(data => {
        showToast('User deleted successfully!', 'success');
        // Refresh user list
        loadUsers();
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showToast('Error deleting user. Please try again.', 'error');
    });
}

/**
 * Fetch user details from the backend
 * @param {string} userId - User ID to fetch
 */
function fetchUserDetails(userId) {
    fetch(`/api/admin/users/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch user details');
        }
        return response.json();
    })
    .then(data => {
        // Populate user form with user data
        document.getElementById('userName').value = data.name;
        document.getElementById('userEmail').value = data.email;
        document.getElementById('userPassword').value = ''; // Don't populate password for security
        document.getElementById('userRole').value = data.role;
        document.getElementById('userActive').checked = data.active;
        
        // Set form action to update instead of create
        document.getElementById('addUserForm').setAttribute('data-user-id', userId);
        document.getElementById('addUserModalLabel').textContent = 'Edit User';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
        modal.show();
    })
    .catch(error => {
        console.error('Error fetching user details:', error);
        showToast('Error fetching user details. Please try again.', 'error');
    });
}

/**
 * Load users from the backend
 */
function loadUsers() {
    fetch('/api/admin/users', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        return response.json();
    })
    .then(data => {
        // Populate users table
        const usersTableBody = document.querySelector('#usersTable tbody');
        usersTableBody.innerHTML = '';
        
        data.forEach((user, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${user.role === 'admin' ? 'primary' : 'info'}">${user.role}</span></td>
                <td>${user.lastLogin || 'Never'}</td>
                <td><span class="badge bg-${user.active ? 'success' : 'danger'}">${user.active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-user-btn" data-user-id="${user.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${user.id}"><i class="bi bi-trash"></i></button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
        
        // Reattach event listeners
        attachUserEventListeners();
    })
    .catch(error => {
        console.error('Error loading users:', error);
        showToast('Error loading users. Please refresh the page.', 'error');
    });
}

/**
 * Attach event listeners to user table buttons
 */
function attachUserEventListeners() {
    // Delete User Buttons
    const deleteUserBtns = document.querySelectorAll('.delete-user-btn');
    deleteUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            if (confirm('Are you sure you want to delete this user?')) {
                deleteUser(userId);
            }
        });
    });

    // Edit User Buttons
    const editUserBtns = document.querySelectorAll('.edit-user-btn');
    editUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            fetchUserDetails(userId);
        });
    });
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}
