/**
 * Baklovah Restaurant - Contact Page JavaScript
 * Handles contact page functionality for the customer-facing website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form validation
    initFormValidation();
    
    // Handle contact form submission
    handleContactFormSubmission();
});

/**
 * Initialize form validation
 */
function initFormValidation() {
    // Fetch all forms with the 'needs-validation' class
    const forms = document.querySelectorAll('.needs-validation');
    
    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            form.classList.add('was-validated');
        }, false);
    });
    
    // Add phone number validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            // Format phone number as (XXX) XXX-XXXX
            let value = this.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value.length <= 3) {
                    this.value = '(' + value;
                } else if (value.length <= 6) {
                    this.value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
                } else {
                    this.value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6, 10);
                }
            }
        });
    }
}

/**
 * Handle contact form submission
 */
function handleContactFormSubmission() {
    const contactForm = document.getElementById('contact-form');
    const submitButton = document.getElementById('submit-contact-form');
    
    if (contactForm && submitButton) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            if (!contactForm.checkValidity()) {
                return;
            }
            
            // Disable submit button and show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value,
                newsletter: document.getElementById('newsletter').checked
            };
            
            // Simulate API call to send form data
            setTimeout(() => {
                // In a real implementation, this would be an API call
                console.log('Form data:', formData);
                
                // Show success message
                window.showToast('Your message has been sent successfully! We will get back to you soon.', 'success');
                
                // Reset form
                contactForm.reset();
                contactForm.classList.remove('was-validated');
                
                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Message';
            }, 1500);
        });
    }
}

/**
 * Initialize Google Maps (placeholder for future implementation)
 */
function initMap() {
    // This function would be called by the Google Maps API
    // For now, we're using an iframe embed
    console.log('Google Maps initialization ready for implementation');
}

/**
 * Handle reservation requests (placeholder for future implementation)
 */
function handleReservationRequests() {
    // This will be implemented when reservation functionality is added
    console.log('Reservation handling ready for implementation');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid, false otherwise
 */
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
