/**
 * Baklovah Restaurant - Careers Page JavaScript
 * Handles careers page functionality for the customer-facing website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form validation
    initFormValidation();
    
    // Handle application form submission
    handleApplicationSubmission();
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
 * Handle application form submission
 */
function handleApplicationSubmission() {
    const applicationForm = document.getElementById('job-application-form');
    const submitButton = document.getElementById('submit-application');
    
    if (applicationForm && submitButton) {
        applicationForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            if (!applicationForm.checkValidity()) {
                return;
            }
            
            // Disable submit button and show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
            
            // Get form data
            const formData = new FormData(applicationForm);
            
            // Simulate API call to send form data
            setTimeout(() => {
                // In a real implementation, this would be an API call
                console.log('Application submitted');
                
                // Show success message
                window.showToast('Your application has been submitted successfully! We will review it and contact you soon.', 'success');
                
                // Reset form
                applicationForm.reset();
                applicationForm.classList.remove('was-validated');
                
                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Application';
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 2000);
        });
    }
}

/**
 * Filter job listings by type
 * @param {string} type - Job type to filter by (full-time, part-time, all)
 */
function filterJobs(type) {
    const jobItems = document.querySelectorAll('.accordion-item');
    
    jobItems.forEach(item => {
        const badge = item.querySelector('.badge');
        
        if (type === 'all' || (badge && badge.textContent.toLowerCase().includes(type.toLowerCase()))) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Scroll to application form
 */
function scrollToApplicationForm() {
    const applicationForm = document.getElementById('application-form');
    
    if (applicationForm) {
        window.scrollTo({
            top: applicationForm.offsetTop - 100,
            behavior: 'smooth'
        });
    }
}
