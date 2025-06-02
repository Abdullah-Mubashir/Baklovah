/**
 * Baklovah Restaurant - About Page JavaScript
 * Handles about page functionality for the customer-facing website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize timeline animation
    initTimelineAnimation();
});

/**
 * Initialize timeline animation
 * Adds animation to timeline items as they come into view
 */
function initTimelineAnimation() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    if (timelineItems.length === 0) return;
    
    // Create an intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                // Unobserve after animation is triggered
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2 // Trigger when 20% of the item is visible
    });
    
    // Observe each timeline item
    timelineItems.forEach(item => {
        observer.observe(item);
    });
}

/**
 * Add CSS for timeline animation
 * This adds the necessary CSS for the timeline animation to work
 */
function addTimelineStyles() {
    // Check if styles already exist
    if (document.getElementById('timeline-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'timeline-styles';
    
    // Add CSS for timeline animation
    styleElement.textContent = `
        .timeline {
            position: relative;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .timeline::after {
            content: '';
            position: absolute;
            width: 6px;
            background-color: rgba(255, 255, 255, 0.3);
            top: 0;
            bottom: 0;
            left: 50%;
            margin-left: -3px;
        }
        
        .timeline-item {
            padding: 10px 40px;
            position: relative;
            width: 50%;
            opacity: 0;
            transform: translateX(-50px);
            transition: all 0.5s ease;
        }
        
        .timeline-item.animate {
            opacity: 1;
            transform: translateX(0);
        }
        
        .timeline-item:nth-child(odd) {
            left: 0;
        }
        
        .timeline-item:nth-child(even) {
            left: 50%;
            transform: translateX(50px);
        }
        
        .timeline-item:nth-child(even).animate {
            transform: translateX(0);
        }
        
        .timeline-year {
            position: absolute;
            width: 80px;
            height: 80px;
            right: -40px;
            background-color: white;
            border: 4px solid #0d6efd;
            top: 15px;
            border-radius: 50%;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #0d6efd;
        }
        
        .timeline-item:nth-child(even) .timeline-year {
            left: -40px;
        }
        
        .timeline-content {
            padding: 20px 30px;
            background-color: rgba(255, 255, 255, 0.2);
            position: relative;
            border-radius: 6px;
        }
        
        @media screen and (max-width: 768px) {
            .timeline::after {
                left: 31px;
            }
            
            .timeline-item {
                width: 100%;
                padding-left: 70px;
                padding-right: 25px;
            }
            
            .timeline-item:nth-child(even) {
                left: 0%;
            }
            
            .timeline-year {
                left: 0;
                right: auto;
                width: 60px;
                height: 60px;
            }
            
            .timeline-item:nth-child(even) .timeline-year {
                left: 0;
            }
        }
    `;
    
    // Add style element to head
    document.head.appendChild(styleElement);
}

// Add timeline styles when the script loads
addTimelineStyles();
