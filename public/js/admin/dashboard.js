/**
 * Admin Dashboard JavaScript
 * Handles client-side functionality for the main admin dashboard page
 */

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the dashboard
  initializeDashboard();
  
  // Set up real-time order updates
  setupRealTimeUpdates();
});

/**
 * Initialize the dashboard
 */
async function initializeDashboard() {
  try {
    // Fetch dashboard data
    const response = await fetchDashboardData();
    
    // Check if we have valid data
    if (!response || !response.success || !response.data) {
      console.warn('Invalid dashboard data structure received:', response);
      showToast('Dashboard data could not be loaded correctly', 'warning');
      return;
    }
    
    const data = response.data;
    
    // Update dashboard components with data fallbacks
    updateSummaryCards(data.summary || {});
    
    // Only initialize charts if we have ordersByDate and ordersByStatus data
    if (data.summary && (data.summary.ordersByDate || data.summary.ordersByStatus)) {
      initializeCharts(data);
    } else {
      console.warn('No chart data available, skipping chart initialization');
      // Display empty state messages in chart containers
      document.querySelectorAll('.chart-container').forEach(container => {
        container.innerHTML = '<div class="no-data-message">No data available for charts</div>';
      });
    }
    
    // Only populate tables if we have the data
    if (data.mostViewed || data.mostPurchased || data.mostLiked) {
      populateTopItemsTables(data);
    } else {
      console.warn('No item data available, skipping table population');
      // Display empty state messages in tables
      document.querySelectorAll('.items-table tbody').forEach(tableBody => {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">No data available</td>';
        tableBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showToast('Error loading dashboard data: ' + error.message, 'error');
    
    // Display error messages in all dashboard components
    document.querySelectorAll('.chart-container').forEach(container => {
      container.innerHTML = '<div class="error-message">Could not load chart data</div>';
    });
    
    document.querySelectorAll('.items-table tbody').forEach(tableBody => {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="4" class="text-center text-danger">Data loading error</td>';
      tableBody.appendChild(row);
    });
  }
}

/**
 * Fetch dashboard data from API
 */
async function fetchDashboardData() {
  try {
    const response = await fetch('/api/analytics/summary?timeRange=week');
    
    if (!response.ok) {
      // If we get a 500 error, return default empty data structure instead of failing
      if (response.status === 500) {
        console.warn('Analytics API returned 500, using default empty data');
        return {
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
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch analytics summary');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

/**
 * Update summary metric cards with fetched data
 */
function updateSummaryCards(summary = {}) {
  // Set default values for missing data
  const data = {
    totalOrders: summary.totalOrders || 0,
    totalRevenue: summary.totalRevenue || 0,
    menuItems: summary.menuItems || 0,
    totalViews: summary.totalViews || 0
  };
  
  // Update total orders
  const ordersElement = document.getElementById('total-orders');
  if (ordersElement) {
    ordersElement.textContent = formatNumber(data.totalOrders);
  }
  
  // Update total revenue
  const revenueElement = document.getElementById('total-revenue');
  if (revenueElement) {
    revenueElement.textContent = formatCurrency(data.totalRevenue);
  }
  
  // Update menu items count
  const menuItemsElement = document.getElementById('menu-items-count');
  if (menuItemsElement) {
    menuItemsElement.textContent = formatNumber(data.menuItems);
  }
  
  // Update total views
  const viewsElement = document.getElementById('total-views');
  if (viewsElement) {
    viewsElement.textContent = formatNumber(data.totalViews);
  }
}

/**
 * Initialize dashboard charts
 */
function initializeCharts(data) {
  try {
    // Get chart data with fallbacks
    const summary = data.summary || {};
    const statusData = summary.ordersByStatus || [];
    const orderDateData = summary.ordersByDate || [];
    
    // Create default data if empty
    if (statusData.length === 0) {
      console.warn('No order status data available, using placeholder data');
      // Add placeholder data for visualization
      statusData.push({status: 'No Orders', count: 1});
    }
    
    if (orderDateData.length === 0) {
      console.warn('No order date data available, using placeholder data');
      // Generate last 7 days for empty chart
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        orderDateData.push({
          date: dateStr,
          orders: 0,
          revenue: 0
        });
      }
    }
    
    // Initialize charts with data or placeholders
    initializeOrderStatusChart(statusData);
    initializeRevenueTrendChart(orderDateData);
  } catch (error) {
    console.error('Error initializing charts:', error);
    // Display error in chart containers
    document.querySelectorAll('.chart-container').forEach(container => {
      container.innerHTML = `<div class="error-message">Chart initialization error: ${error.message}</div>`;
    });
  }
}

/**
 * Initialize the order status distribution chart
 * @param {Array} statusData - Order status distribution data
 */
function initializeOrderStatusChart(statusData) {
  const ctx = document.getElementById('statusDistributionChart');
  if (!ctx) return;
  
  try {
    // Extract labels and data from the status distribution
    const labels = statusData.map(item => item.status);
    const data = statusData.map(item => item.count);
    
    // Define colors based on status or use defaults for placeholder data
    const getStatusColor = (status) => {
      const colorMap = {
        'completed': '#4CAF50',
        'in_progress': '#2196F3',
        'ready': '#FFC107',
        'delivery': '#9C27B0',
        'cancelled': '#F44336',
        'No Orders': '#CCCCCC'  // Gray for placeholder
      };
      
      // Case insensitive match or partial match
      const statusLower = status.toLowerCase();
      for (const [key, color] of Object.entries(colorMap)) {
        if (statusLower.includes(key.toLowerCase())) {
          return color;
        }
      }
      
      // Return a default color if no match
      return '#CCCCCC';
    };
    
    // Generate colors based on status names
    const backgroundColor = labels.map(label => getStatusColor(label));
    
    // Create chart
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: statusData[0].status === 'No Orders' ? 'No Order Data Available' : 'Order Status Distribution'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating order status chart:', error);
    ctx.parentElement.innerHTML = `<div class="error-message">Could not create order status chart: ${error.message}</div>`;
  }
}

/**
 * Initialize the revenue trend chart
 * @param {Array} orderData - Order and revenue data by date
 */
function initializeRevenueTrendChart(orderData) {
  const ctx = document.getElementById('revenueTrendChart');
  if (!ctx) return;
  
  try {
    // Extract dates, order counts, and revenue from the data
    const dates = orderData.map(item => item.date);
    const orders = orderData.map(item => item.orders);
    const revenue = orderData.map(item => item.revenue);
    
    // Format dates for better display
    const formattedDates = dates.map(date => {
      const parts = date.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`;  // MM/DD format
      }
      return date;
    });
    
    // Check if we have any actual data
    const hasData = orders.some(val => val > 0) || revenue.some(val => val > 0);
    
    // Create chart
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedDates,
        datasets: [
          {
            label: 'Orders',
            data: orders,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderWidth: 2,
            fill: true,
            yAxisID: 'y',
          },
          {
            label: 'Revenue ($)',
            data: revenue,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderWidth: 2,
            fill: true,
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Orders'
            },
            min: 0  // Always start from zero
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Revenue ($)'
            },
            grid: {
              drawOnChartArea: false
            },
            min: 0  // Always start from zero
          }
        },
        plugins: {
          title: {
            display: true,
            text: hasData ? 'Orders & Revenue Trend' : 'No Order Data Available'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating revenue trend chart:', error);
    ctx.parentElement.innerHTML = `<div class="error-message">Could not create revenue chart: ${error.message}</div>`;
  }
}

/**
 * Populate top items tables with data
 */
function populateTopItemsTables(data) {
  // Most Viewed Items
  populateItemsTable('most-viewed-table', data.mostViewedItems || [], 'view_count');
  
  // Most Purchased Items
  populateItemsTable('most-purchased-table', data.mostPurchasedItems || [], 'purchase_count');
  
  // Most Liked Items
  populateItemsTable('most-liked-table', data.mostLikedItems || [], 'like_count');
}

/**
 * Populate a specific items table
 * @param {string} tableId - ID of the table to populate
 * @param {Array} items - Array of items to display
 * @param {string} countField - Field name for the count value
 */
function populateItemsTable(tableId, items, countField) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  if (!tableBody) return;
  
  // Clear table
  tableBody.innerHTML = '';
  
  // Show message if no items
  if (items.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4" class="text-center">No data available</td>`;
    tableBody.appendChild(row);
    return;
  }
  
  // Add items to table (limit to 5)
  const displayItems = items.slice(0, 5);
  displayItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="d-flex align-items-center">
          <img src="${item.image_url || '/img/placeholder-food.jpg'}" alt="${item.name}" class="me-2 rounded" width="40" height="40">
          <div>${item.name}</div>
        </div>
      </td>
      <td>${formatCurrency(item.price)}</td>
      <td>${item[countField]}</td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Set up real-time order updates via Socket.io
 */
function setupRealTimeUpdates() {
  try {
    // Check if Socket.io is available
    if (typeof io === 'undefined') {
      console.warn('Socket.io not found. Real-time updates will not be available.');
      // Add a notification to the user about missing socket.io
      const notificationArea = document.querySelector('.notifications-area') || document.createElement('div');
      if (!document.querySelector('.notifications-area')) {
        notificationArea.className = 'notifications-area';
        notificationArea.style.position = 'fixed';
        notificationArea.style.bottom = '20px';
        notificationArea.style.right = '20px';
        notificationArea.style.zIndex = '1050';
        document.body.appendChild(notificationArea);
      }
      
      const socketWarning = document.createElement('div');
      socketWarning.className = 'toast socket-warning show';
      socketWarning.setAttribute('role', 'alert');
      socketWarning.setAttribute('aria-live', 'assertive');
      socketWarning.setAttribute('aria-atomic', 'true');
      socketWarning.innerHTML = `
        <div class="toast-header bg-warning text-white">
          <strong class="me-auto">Connection Warning</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          Real-time updates are not available. Socket.io could not be loaded.
        </div>
      `;
      notificationArea.appendChild(socketWarning);
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        socketWarning.classList.remove('show');
        setTimeout(() => socketWarning.remove(), 500);
      }, 10000);
      
      return;
    }
    
    // Connect to Socket.io server
    const socket = io();
    
    // Connection error handling
    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      showToast('Real-time updates disconnected. Check server connection.', 'warning');
    });
    
    // Successful connection
    socket.on('connect', () => {
      console.log('Socket.io connected successfully');
      showToast('Real-time updates connected', 'success');
    });
    
    // Listen for new orders
    socket.on('new_order', function(order) {
      // Update order count
      const ordersCard = document.getElementById('total-orders');
      if (ordersCard) {
        const currentCount = parseInt(ordersCard.textContent, 10) || 0;
        ordersCard.textContent = currentCount + 1;
      }
      
      // Update revenue
      const revenueCard = document.getElementById('total-revenue');
      if (revenueCard) {
        const currentRevenue = parseFloat(revenueCard.textContent.replace(/[^0-9.-]+/g, '')) || 0;
        revenueCard.textContent = formatCurrency(currentRevenue + parseFloat(order.total_amount));
      }
      
      // Show notification
      showToast(`New order received! Order #${order.id} for ${formatCurrency(order.total_amount)}`, 'success');
    });
    
    // Listen for order status updates
    socket.on('order_status_update', function(update) {
      // Show notification
      showToast(`Order #${update.orderId} status changed to ${update.status}`, 'info');
      
      // If we have the order status chart, we could update it here
    });
  } catch (error) {
    console.error('Error setting up real-time updates:', error);
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
