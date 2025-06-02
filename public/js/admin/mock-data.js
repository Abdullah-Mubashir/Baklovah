/**
 * Mock Data for Baklovah Admin Panel
 * This file provides mock data for testing the admin panel UI
 * when the database connection is not available
 */

// Mock settings data
const mockSettings = {
  system: {
    siteName: 'Baklovah Restaurant',
    timeZone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currencySymbol: '$',
    maintenanceMode: false
  },
  order: {
    taxRate: 8.5,
    minimumOrderAmount: 15.00,
    deliveryFee: 4.99,
    freeDeliveryThreshold: 35.00,
    enableOnlineOrdering: true
  },
  payment: {
    stripe: {
      publicKey: 'pk_test_mockStripePublicKey',
      secretKey: 'sk_test_mockStripeSecretKey',
      testMode: true,
      enabled: true
    }
  },
  notifications: {
    admin: {
      newOrder: true,
      lowStock: true,
      customerFeedback: true
    },
    customer: {
      orderConfirmation: true,
      orderStatusUpdate: true,
      specialOffers: true
    },
    email: {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'notifications@baklovah.com',
      smtpPassword: 'mockPassword',
      fromEmail: 'no-reply@baklovah.com',
      fromName: 'Baklovah Restaurant'
    }
  }
};

// Mock users data
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    name: 'Admin User',
    email: 'admin@baklovah.com',
    role: 'admin',
    active: true,
    lastLogin: '2025-06-01 10:30:45'
  },
  {
    id: 2,
    username: 'cashier1',
    name: 'John Doe',
    email: 'john@baklovah.com',
    role: 'cashier',
    active: true,
    lastLogin: '2025-06-01 09:15:22'
  },
  {
    id: 3,
    username: 'cashier2',
    name: 'Jane Smith',
    email: 'jane@baklovah.com',
    role: 'cashier',
    active: false,
    lastLogin: '2025-05-28 14:45:10'
  }
];

// Mock user preferences
const mockUserPreferences = {
  theme: 'light',
  language: 'en',
  notifications: {
    email: true,
    browser: true,
    mobile: false
  },
  dashboard: {
    showSales: true,
    showOrders: true,
    showPopularItems: true
  }
};

// Mock sessions data
const mockSessions = [
  {
    id: 'sess_1',
    device: 'Chrome on macOS',
    ipAddress: '192.168.1.1',
    lastActive: '2025-06-02 11:45:22',
    current: true
  },
  {
    id: 'sess_2',
    device: 'Safari on iOS',
    ipAddress: '192.168.1.100',
    lastActive: '2025-06-01 18:30:15',
    current: false
  },
  {
    id: 'sess_3',
    device: 'Firefox on Windows',
    ipAddress: '192.168.1.50',
    lastActive: '2025-05-30 09:15:40',
    current: false
  }
];

// Mock API response handler
function mockApiResponse(endpoint, method, data = null) {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      switch (endpoint) {
        case '/api/admin/settings':
          if (method === 'GET') {
            resolve({ success: true, data: mockSettings });
          } else if (method === 'POST') {
            resolve({ success: true, message: 'Settings saved successfully' });
          }
          break;
          
        case '/api/admin/settings/system':
          if (method === 'GET') {
            resolve({ success: true, data: mockSettings.system });
          } else if (method === 'POST') {
            resolve({ success: true, message: 'System settings saved successfully' });
          }
          break;
          
        case '/api/admin/settings/order':
          if (method === 'GET') {
            resolve({ success: true, data: mockSettings.order });
          } else if (method === 'POST') {
            resolve({ success: true, message: 'Order settings saved successfully' });
          }
          break;
          
        case '/api/admin/users':
          if (method === 'GET') {
            resolve({ success: true, data: mockUsers });
          } else if (method === 'POST') {
            const newUser = { id: mockUsers.length + 1, ...data };
            resolve({ success: true, data: newUser, message: 'User created successfully' });
          }
          break;
          
        case '/api/admin/users/profile':
          if (method === 'GET') {
            resolve({ success: true, data: mockUsers[0] });
          } else if (method === 'PUT') {
            resolve({ success: true, message: 'Profile updated successfully' });
          }
          break;
          
        case '/api/admin/users/preferences':
          if (method === 'GET') {
            resolve({ success: true, data: mockUserPreferences });
          } else if (method === 'PUT') {
            resolve({ success: true, message: 'Preferences saved successfully' });
          }
          break;
          
        case '/api/admin/users/sessions':
          if (method === 'GET') {
            resolve({ success: true, data: mockSessions });
          } else if (method === 'DELETE') {
            resolve({ success: true, message: 'Session terminated successfully' });
          }
          break;
          
        default:
          if (endpoint.startsWith('/api/admin/users/') && method === 'GET') {
            const userId = parseInt(endpoint.split('/').pop());
            const user = mockUsers.find(u => u.id === userId);
            if (user) {
              resolve({ success: true, data: user });
            } else {
              resolve({ success: false, message: 'User not found' });
            }
          } else if (endpoint.startsWith('/api/admin/users/') && method === 'PUT') {
            resolve({ success: true, message: 'User updated successfully' });
          } else if (endpoint.startsWith('/api/admin/users/') && method === 'DELETE') {
            resolve({ success: true, message: 'User deleted successfully' });
          } else {
            resolve({ success: false, message: 'Endpoint not found' });
          }
      }
    }, 300); // 300ms delay to simulate network
  });
}

// Override fetch for API calls to use mock data
window.originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  // Only intercept API calls to our backend
  if (url.startsWith('/api/admin/')) {
    const method = options.method || 'GET';
    let data = null;
    
    if (options.body) {
      try {
        data = JSON.parse(options.body);
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }
    
    return mockApiResponse(url, method, data).then(response => {
      return {
        ok: response.success,
        status: response.success ? 200 : 400,
        json: () => Promise.resolve(response)
      };
    });
  }
  
  // Pass through all other requests to the original fetch
  return window.originalFetch(url, options);
};

console.log('Mock data loaded for Baklovah Admin Panel testing');
