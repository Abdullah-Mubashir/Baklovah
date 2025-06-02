/**
 * Analytics Dashboard JavaScript
 * Handles client-side functionality for the admin analytics dashboard
 */

// Global variables
let analyticsData = null;
let timeRangeFilter = 'week'; // Default time range filter
let charts = {}; // Store chart instances for updating

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the dashboard
  initializeDashboard();
  
  // Set up event listeners
  setupEventListeners();
});

/**
 * Initialize the analytics dashboard
 */
async function initializeDashboard() {
  try {
    // Show loading state
    document.querySelectorAll('.metrics-card .card-value').forEach(el => {
      el.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
    });
    
    // Fetch analytics data
    await fetchAnalyticsData();
    
    // Check if we have valid data structure
    if (!analyticsData || !analyticsData.success || !analyticsData.data) {
      console.warn('Invalid analytics data structure received:', analyticsData);
      showToast('Analytics data could not be loaded correctly', 'warning');
      displayEmptyStates();
      return;
    }
    
    // Update dashboard components with data fallbacks
    updateSummaryCards();
    initializeCharts();
    populateTopItemsTables();
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showToast('Error loading analytics data: ' + error.message, 'error');
    displayEmptyStates();
  }
}

/**
 * Display empty states when data is missing
 */
function displayEmptyStates() {
  // Clear loading indicators and show zeros in summary cards
  document.querySelectorAll('.metrics-card .card-value').forEach(el => {
    const isRevenue = el.id && el.id.includes('revenue');
    el.textContent = isRevenue ? '$0.00' : '0';
  });
  
  // Show empty state for percentage indicators
  document.querySelectorAll('.change-indicator').forEach(el => {
    el.innerHTML = '<span class="text-muted">No data</span>';
  });
  
  // Show empty state messages in chart containers
  document.querySelectorAll('.chart-container').forEach(container => {
    container.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><p class="text-muted">No data available for chart</p></div>';
  });
  
  // Show empty state messages in tables
  document.querySelectorAll('.items-table tbody').forEach(tableBody => {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4" class="text-center">No data available</td>';
    tableBody.innerHTML = '';  // Clear any existing rows
    tableBody.appendChild(row);
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Time range filters
  document.querySelectorAll('.time-range-filter').forEach(button => {
    button.addEventListener('click', async function() {
      const range = this.getAttribute('data-range');
      
      // Update active button
      document.querySelectorAll('.time-range-filter').forEach(btn => {
        btn.classList.remove('active');
      });
      this.classList.add('active');
      
      // Update time range and refresh data
      timeRangeFilter = range;
      await fetchAnalyticsData();
      updateSummaryCards();
      updateCharts();
      populateTopItemsTables();
    });
  });
  
  // Set current date in header
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-US', options);
  }
}

/**
 * Fetch analytics data from API
 */
async function fetchAnalyticsData() {
  try {
    const response = await fetch(`/api/analytics/summary?timeRange=${timeRangeFilter}`);
    
    if (!response.ok) {
      // If we get a 500 error, return default empty data structure instead of failing
      if (response.status === 500) {
        console.warn('Analytics API returned 500, using default empty data');
        analyticsData = {
          success: true,
          data: {
            summary: {
              totalOrders: 0,
              totalRevenue: 0,
              menuItems: 0,
              totalViews: 0,
              ordersByStatus: [],
              ordersByDate: []
            },
            mostViewed: [],
            mostPurchased: [],
            mostLiked: []
          }
        };
        return analyticsData;
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch analytics summary');
    }
    
    analyticsData = await response.json();
    return analyticsData;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    showToast('Error fetching analytics data: ' + error.message, 'error');
    
    // Create fallback data so the UI doesn't break
    analyticsData = {
      success: true,
      data: {
        summary: {
          totalOrders: 0,
          totalRevenue: 0,
          menuItems: 0,
          totalViews: 0,
          ordersByStatus: [],
          ordersByDate: []
        },
        mostViewed: [],
        mostPurchased: [],
        mostLiked: []
      }
    };
    return analyticsData;
  }
}

/**
 * Update summary metric cards with fetched data
 */
function updateSummaryCards() {
  if (!analyticsData || !analyticsData.data) return;
  
  const data = analyticsData.data.summary || {};
  
  // Set default values for missing data
  const summary = {
    totalOrders: data.totalOrders || 0,
    totalRevenue: data.totalRevenue || 0,
    menuItems: data.menuItems || 0,
    totalViews: data.totalViews || 0
  };
  
  // Update total orders card
  const ordersElement = document.getElementById('total-orders');
  if (ordersElement) {
    ordersElement.textContent = formatNumber(summary.totalOrders);
  }
  
  // Update total revenue card
  const revenueElement = document.getElementById('total-revenue');
  if (revenueElement) {
    revenueElement.textContent = formatCurrency(summary.totalRevenue);
  }
  
  // Update menu items card
  const menuItemsElement = document.getElementById('menu-items-count');
  if (menuItemsElement) {
    menuItemsElement.textContent = formatNumber(summary.menuItems);
  }
  
  // Update total views card
  const viewsElement = document.getElementById('total-views');
  if (viewsElement) {
    viewsElement.textContent = formatNumber(summary.totalViews);
  }
  
  // Update time range display
  const rangeElement = document.getElementById('time-range-display');
  if (rangeElement) {
    rangeElement.textContent = formatTimeRange(timeRangeFilter);
  }
  
  // Clear any loading indicators that might still be present
  document.querySelectorAll('.metrics-card .card-value .spinner-border').forEach(spinner => {
    const parentElement = spinner.parentElement;
    if (parentElement && parentElement.classList.contains('card-value')) {
      // Check which metric this is and set appropriate value
      if (parentElement.id && parentElement.id.includes('revenue')) {
        parentElement.textContent = formatCurrency(summary.totalRevenue);
      } else if (parentElement.id && parentElement.id.includes('orders')) {
        parentElement.textContent = formatNumber(summary.totalOrders);
      } else if (parentElement.id && parentElement.id.includes('menu-items')) {
        parentElement.textContent = formatNumber(summary.menuItems);
      } else if (parentElement.id && parentElement.id.includes('views')) {
        parentElement.textContent = formatNumber(summary.totalViews);
      } else {
        parentElement.textContent = '0'; // Default fallback
      }
    }
  });
}

/**
 * Update percentage change indicator
 * @param {string} elementId - ID of the element to update
 * @param {number} change - Percentage change value
 */
function updatePercentageChange(elementId, change) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  let icon, textClass;
  if (change > 0) {
    icon = '<i class="bi bi-arrow-up-short"></i>';
    textClass = 'text-success';
  } else if (change < 0) {
    icon = '<i class="bi bi-arrow-down-short"></i>';
    textClass = 'text-danger';
  } else {
    icon = '<i class="bi bi-dash"></i>';
    textClass = 'text-muted';
  }
  
  element.innerHTML = `${icon} ${Math.abs(change)}%`;
  element.className = `ms-2 ${textClass}`;
}

/**
 * Initialize dashboard charts
 */
function initializeCharts() {
  if (!analyticsData || !analyticsData.data) {
    console.warn('No analytics data available for charts');
    return;
  }
  
  try {
    // Initialize Order Status Chart
    initializeOrderStatusChart();
    
    // Initialize Revenue Trend Chart
    initializeRevenueTrendChart();
    
    // Initialize Category Performance Chart
    initializeCategoryPerformanceChart();
  } catch (error) {
    console.error('Error initializing charts:', error);
    showToast('Error initializing charts: ' + error.message, 'error');
    
    // Clear chart containers and show error message
    document.querySelectorAll('.chart-container canvas').forEach(canvas => {
      const container = canvas.parentElement;
      if (container) {
        container.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><p class="text-muted">Could not load chart data</p></div>';
      }
    });
  }
}

/**
 * Initialize the order status chart
 */
function initializeOrderStatusChart() {
  const ctx = document.getElementById('orderStatusChart');
  if (!ctx) return;
  
  // Get data with fallback for empty data
  const ordersByStatus = analyticsData?.data?.summary?.ordersByStatus || [];
  
  // Default status categories
  const defaultLabels = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
  
  // Create data structure from API data or use empty defaults
  let labels = [];
  let data = [];
  
  if (ordersByStatus && ordersByStatus.length > 0) {
    // Use actual data
    ordersByStatus.forEach(status => {
      labels.push(status.status);
      data.push(status.count);
    });
  } else {
    // Use defaults with zeros for empty state
    labels = defaultLabels;
    data = defaultLabels.map(() => 0);
  }
  
  charts.orderStatus = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#FFC107', // Pending
          '#17A2B8', // Confirmed
          '#6610F2', // Preparing
          '#20C997', // Ready
          '#28A745', // Completed
          '#DC3545'  // Cancelled
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Order Status Distribution'
        }
      }
    }
  });
}

/**
 * Initialize the revenue trend chart
 */
function initializeRevenueTrendChart() {
  const ctx = document.getElementById('revenueTrendChart');
  if (!ctx) return;
  
  // Get data with fallback for empty data
  const ordersByDate = analyticsData?.data?.summary?.ordersByDate || [];
  
  // Generate date labels based on time range
  const dateLabels = [];
  const revenueData = [];
  
  if (ordersByDate && ordersByDate.length > 0) {
    // Use actual data
    ordersByDate.forEach(item => {
      dateLabels.push(item.date);
      revenueData.push(item.revenue || 0);
    });
  } else {
    // Use empty defaults based on time range
    const today = new Date();
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    if (timeRangeFilter === 'day') {
      // Last 24 hours, in 3-hour intervals
      for (let i = 0; i < 8; i++) {
        dateLabels.push(`${i * 3}:00`);
        revenueData.push(0);
      }
    } else if (timeRangeFilter === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dateLabels.push(dayLabels[date.getDay()]);
        revenueData.push(0);
      }
    } else if (timeRangeFilter === 'month') {
      // Last 30 days, in weekly intervals
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        dateLabels.push(`Week ${4-i+1}`);
        revenueData.push(0);
      }
    } else {
      // Last 12 months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        dateLabels.push(monthNames[date.getMonth()]);
        revenueData.push(0);
      }
    }
  }
  
  charts.revenueTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dateLabels,
      datasets: [{
        label: 'Revenue',
        data: revenueData,
        borderColor: '#4361ee',
        backgroundColor: 'rgba(67, 97, 238, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#4361ee',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return '$' + context.raw;
            }
          }
        },
        title: {
          display: true,
          text: `Revenue Trend (${formatTimeRange(timeRangeFilter)})`
        }
      }
    }
  });
}

/**
 * Initialize the category performance chart
 */
function initializeCategoryPerformanceChart() {
  const ctx = document.getElementById('categoryPerformanceChart');
  if (!ctx) return;
  
  const categoryData = analyticsData.categoryPerformanceData || {
    labels: ['Appetizers', 'Mains', 'Desserts', 'Beverages', 'Specials'],
    data: [3200, 4500, 2800, 1900, 3000]
  };
  
  charts.categoryPerformance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categoryData.labels,
      datasets: [{
        label: 'Revenue',
        data: categoryData.data,
        backgroundColor: 'rgba(0, 123, 255, 0.7)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return '$' + context.raw;
            }
          }
        },
        title: {
          display: true,
          text: 'Revenue by Category'
        }
      }
    }
  });
}

/**
 * Update charts with new data
 */
function updateCharts() {
  if (!analyticsData || !analyticsData.data) return;

  try {
    // Update Order Status Chart
    if (charts.orderStatus && analyticsData.data.summary && analyticsData.data.summary.ordersByStatus) {
      const ordersByStatus = analyticsData.data.summary.ordersByStatus;
      const labels = ordersByStatus.map(item => item.status);
      const data = ordersByStatus.map(item => item.count);

      charts.orderStatus.data.labels = labels;
      charts.orderStatus.data.datasets[0].data = data;
      charts.orderStatus.update();
    }

    // Update Revenue Trend Chart
    if (charts.revenueTrend && analyticsData.data.summary && analyticsData.data.summary.ordersByDate) {
      const ordersByDate = analyticsData.data.summary.ordersByDate;
      const labels = ordersByDate.map(item => item.date);
      const data = ordersByDate.map(item => item.revenue || 0);

      charts.revenueTrend.data.labels = labels;
      charts.revenueTrend.data.datasets[0].data = data;
      charts.revenueTrend.options.plugins.title.text = `Revenue Trend (${formatTimeRange(timeRangeFilter)})`;
      charts.revenueTrend.update();
    }

    // Update Category Performance Chart
    if (charts.categoryPerformance && analyticsData.data.categoryPerformance) {
      const categoryData = analyticsData.data.categoryPerformance;
      const labels = categoryData.map(item => item.category);
      const data = categoryData.map(item => item.count);

      charts.categoryPerformance.data.labels = labels;
      charts.categoryPerformance.data.datasets[0].data = data;
      charts.categoryPerformance.update();
    }
  } catch (error) {
    console.error('Error updating charts:', error);
    showToast('Error updating chart data', 'error');
  }
}

/**
 * Populate top items tables
 */
function populateTopItemsTables() {
  if (!analyticsData || !analyticsData.data) {
    console.warn('No analytics data available for top items tables');
    displayEmptyTables();
    return;
  }

  const data = analyticsData.data;

  try {
    // Populate Most Viewed Items table
    populateItemsTable('most-viewed-items', data.mostViewedItems || [], 'view_count', 'Views');

    // Populate Most Purchased Items table
    populateItemsTable('most-purchased-items', data.mostPurchasedItems || [], 'purchase_count', 'Orders');

    // Populate Most Liked Items table
    populateItemsTable('most-liked-items', data.mostLikedItems || [], 'like_count', 'Likes');
  } catch (error) {
    console.error('Error populating top items tables:', error);
    showToast('Error loading top items data', 'error');
    displayEmptyTables();
  }
}

/**
 * Display empty state for all tables
 */
function displayEmptyTables() {
  // Show empty state for all item tables
  ['most-viewed-items', 'most-purchased-items', 'most-liked-items'].forEach(tableId => {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    if (tableBody) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="4" class="text-center">No data available</td>';
      tableBody.innerHTML = '';  // Clear any existing rows
      tableBody.appendChild(row);
    }
  });
}

/**
 * Populate a specific items table
 * @param {string} tableId - ID of the table to populate
 * @param {Array} items - Array of items to display
 * @param {string} countField - Field name for the count value
 * @param {string} countLabel - Label for the count column
 */
function populateItemsTable(tableId, items, countField, countLabel) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  if (!tableBody) return;

  // Clear existing rows
  tableBody.innerHTML = '';

  // Check if items array is empty
  if (!items || items.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4" class="text-center">No data available</td>`;
    tableBody.appendChild(row);
    return;
  }

  // Populate with new data
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="d-flex align-items-center">
          <div class="menu-item-img me-2">
            <img src="${item.image || '/img/placeholder.jpg'}" alt="${item.title}" width="40" height="40" class="rounded">
          </div>
          <div>${item.title || 'Unknown Item'}</div>
        </div>
      </td>
      <td>${item.category || 'Uncategorized'}</td>
      <td>${item[countField] || 0} ${countLabel}</td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Format time range for display
 * @param {string} range - Time range ('day', 'week', 'month', 'year')
 * @returns {string} Formatted time range
 */
function formatTimeRange(range) {
  switch (range) {
    case 'day':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'year':
      return 'This Year';
    default:
      return 'This Week';
  }
}

/**
 * Format currency value
 * @param {number} value - The currency value to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}

/**
 * Format number with thousands separator
 * @param {number} value - The number to format
 * @returns {string} Formatted number string
 */
function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
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
