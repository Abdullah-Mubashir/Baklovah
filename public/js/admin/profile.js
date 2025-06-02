/**
 * Baklovah Admin - Profile Page JavaScript
 * Handles all profile page functionality including form submissions,
 * password changes, and preference management
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Profile Form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value
            };
            
            updateProfile(formData);
        });
    }

    // Password Form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate password
            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match', 'error');
                return;
            }
            
            // Validate password strength
            if (!validatePassword(newPassword)) {
                showToast('Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number', 'error');
                return;
            }
            
            changePassword(currentPassword, newPassword);
        });
    }

    // Preferences Form
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                theme: document.getElementById('theme').value,
                language: document.getElementById('language').value,
                emailNotifications: document.getElementById('emailNotifications').checked,
                desktopNotifications: document.getElementById('desktopNotifications').checked
            };
            
            savePreferences(formData);
        });
    }

    // Two-Factor Authentication
    const enable2FA = document.getElementById('enable2FA');
    const twoFASetup = document.getElementById('2faSetup');
    if (enable2FA && twoFASetup) {
        enable2FA.addEventListener('change', function() {
            if (this.checked) {
                twoFASetup.classList.remove('d-none');
            } else {
                twoFASetup.classList.add('d-none');
            }
        });
    }

    // Verify 2FA Button
    const verify2FABtn = document.getElementById('verify2FABtn');
    if (verify2FABtn) {
        verify2FABtn.addEventListener('click', function() {
            const verificationCode = document.getElementById('verificationCode').value;
            
            if (!verificationCode) {
                showToast('Please enter the verification code', 'error');
                return;
            }
            
            verify2FA(verificationCode);
        });
    }

    // Terminate All Sessions Button
    const terminateAllBtn = document.getElementById('terminateAllBtn');
    if (terminateAllBtn) {
        terminateAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to terminate all other sessions? You will remain logged in on this device.')) {
                terminateAllSessions();
            }
        });
    }

    // Terminate Individual Session Buttons
    const terminateSessionBtns = document.querySelectorAll('button.btn-outline-danger');
    terminateSessionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-session-id');
            if (confirm('Are you sure you want to terminate this session?')) {
                terminateSession(sessionId);
            }
        });
    });

    // Load preferences from localStorage
    loadPreferences();
});

/**
 * Update user profile
 * @param {object} profileData - Profile data to update
 */
function updateProfile(profileData) {
    // Show loading state
    showToast('Updating profile...', 'info');
    
    fetch('/api/admin/users/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        return response.json();
    })
    .then(data => {
        showToast('Profile updated successfully!', 'success');
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showToast('Error updating profile. Please try again.', 'error');
    });
}

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 */
function changePassword(currentPassword, newPassword) {
    // Show loading state
    showToast('Changing password...', 'info');
    
    fetch('/api/admin/users/password', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to change password');
        }
        return response.json();
    })
    .then(data => {
        showToast('Password changed successfully!', 'success');
        document.getElementById('passwordForm').reset();
    })
    .catch(error => {
        console.error('Error changing password:', error);
        showToast('Error changing password. Please check your current password and try again.', 'error');
    });
}

/**
 * Save user preferences
 * @param {object} preferences - User preferences
 */
function savePreferences(preferences) {
    // Save to localStorage
    localStorage.setItem('baklovah_preferences', JSON.stringify(preferences));
    
    // Apply theme
    applyTheme(preferences.theme);
    
    // Show success message
    showToast('Preferences saved successfully!', 'success');
    
    // Save to server (if needed)
    fetch('/api/admin/users/preferences', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save preferences to server');
        }
        return response.json();
    })
    .catch(error => {
        console.error('Error saving preferences to server:', error);
        // Not showing an error toast here since preferences are saved locally
    });
}

/**
 * Load user preferences from localStorage
 */
function loadPreferences() {
    const preferences = JSON.parse(localStorage.getItem('baklovah_preferences')) || {
        theme: 'light',
        language: 'en',
        emailNotifications: true,
        desktopNotifications: true
    };
    
    // Set form values
    document.getElementById('theme').value = preferences.theme;
    document.getElementById('language').value = preferences.language;
    document.getElementById('emailNotifications').checked = preferences.emailNotifications;
    document.getElementById('desktopNotifications').checked = preferences.desktopNotifications;
    
    // Apply theme
    applyTheme(preferences.theme);
}

/**
 * Apply theme to the page
 * @param {string} theme - Theme to apply (light, dark, system)
 */
function applyTheme(theme) {
    if (theme === 'system') {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }
    }
    
    // Apply theme class to body
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    
    // Store the applied theme
    localStorage.setItem('baklovah_applied_theme', theme);
}

/**
 * Verify two-factor authentication
 * @param {string} verificationCode - Verification code from authenticator app
 */
function verify2FA(verificationCode) {
    // Show loading state
    showToast('Verifying code...', 'info');
    
    fetch('/api/admin/users/2fa/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ verificationCode })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to verify code');
        }
        return response.json();
    })
    .then(data => {
        showToast('Two-factor authentication enabled successfully!', 'success');
        document.getElementById('verificationCode').value = '';
    })
    .catch(error => {
        console.error('Error verifying code:', error);
        showToast('Error verifying code. Please check the code and try again.', 'error');
    });
}

/**
 * Terminate all sessions except current one
 */
function terminateAllSessions() {
    // Show loading state
    showToast('Terminating all sessions...', 'info');
    
    fetch('/api/admin/users/sessions/terminate-all', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to terminate sessions');
        }
        return response.json();
    })
    .then(data => {
        showToast('All other sessions terminated successfully!', 'success');
        // Refresh sessions list
        // This would be implemented if we had a real sessions API
    })
    .catch(error => {
        console.error('Error terminating sessions:', error);
        showToast('Error terminating sessions. Please try again.', 'error');
    });
}

/**
 * Terminate a specific session
 * @param {string} sessionId - ID of the session to terminate
 */
function terminateSession(sessionId) {
    // Show loading state
    showToast('Terminating session...', 'info');
    
    fetch(`/api/admin/users/sessions/${sessionId}/terminate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to terminate session');
        }
        return response.json();
    })
    .then(data => {
        showToast('Session terminated successfully!', 'success');
        // Refresh sessions list
        // This would be implemented if we had a real sessions API
    })
    .catch(error => {
        console.error('Error terminating session:', error);
        showToast('Error terminating session. Please try again.', 'error');
    });
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - Whether the password is valid
 */
function validatePassword(password) {
    // Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
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
