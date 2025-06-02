/**
 * API Test Script for Baklovah Admin Panel
 * This script tests the settings and user management API endpoints
 */

const axios = require('axios');
require('dotenv').config();

// Base URL for API requests
const BASE_URL = 'http://localhost:3001';

// Sample JWT token for authentication (you would get this after login)
let token = '';

// Sample test data
const testSettings = {
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
  }
};

const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Test123!',
  role: 'cashier',
  active: true
};

// Login function to get JWT token
async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',  // Use your admin credentials
      password: 'admin'
    });
    
    token = response.data.token;
    console.log('Login successful! Token acquired.');
    return token;
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

// Test settings API
async function testSettingsAPI() {
  try {
    console.log('\n--- Testing Settings API ---');
    
    // Get all settings
    console.log('\nGetting all settings...');
    const allSettings = await axios.get(`${BASE_URL}/api/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('All settings:', allSettings.data);
    
    // Get system settings
    console.log('\nGetting system settings...');
    const systemSettings = await axios.get(`${BASE_URL}/api/admin/settings/system`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('System settings:', systemSettings.data);
    
    // Save system settings
    console.log('\nSaving system settings...');
    const saveSystem = await axios.post(`${BASE_URL}/api/admin/settings/system`, testSettings.system, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Save response:', saveSystem.data);
    
    // Save order settings
    console.log('\nSaving order settings...');
    const saveOrder = await axios.post(`${BASE_URL}/api/admin/settings/order`, testSettings.order, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Save response:', saveOrder.data);
    
    console.log('\nSettings API tests completed successfully!');
  } catch (error) {
    console.error('Settings API test failed:', error.response ? error.response.data : error.message);
  }
}

// Test users API
async function testUsersAPI() {
  try {
    console.log('\n--- Testing Users API ---');
    
    // Get all users
    console.log('\nGetting all users...');
    const allUsers = await axios.get(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${allUsers.data.length} users`);
    
    // Create a new user
    console.log('\nCreating a new user...');
    const createUser = await axios.post(`${BASE_URL}/api/admin/users`, testUser, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Create response:', createUser.data);
    
    // Get the created user
    const userId = createUser.data.id || 2; // Fallback to ID 2 if not returned
    console.log(`\nGetting user with ID ${userId}...`);
    const getUser = await axios.get(`${BASE_URL}/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('User details:', getUser.data);
    
    // Update the user
    console.log('\nUpdating user...');
    const updateUser = await axios.put(`${BASE_URL}/api/admin/users/${userId}`, {
      ...testUser,
      name: 'Updated Test User'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Update response:', updateUser.data);
    
    // Delete the user
    console.log('\nDeleting user...');
    const deleteUser = await axios.delete(`${BASE_URL}/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Delete response:', deleteUser.data);
    
    console.log('\nUsers API tests completed successfully!');
  } catch (error) {
    console.error('Users API test failed:', error.response ? error.response.data : error.message);
  }
}

// Test profile API
async function testProfileAPI() {
  try {
    console.log('\n--- Testing Profile API ---');
    
    // Update profile
    console.log('\nUpdating profile...');
    const updateProfile = await axios.put(`${BASE_URL}/api/admin/users/profile`, {
      name: 'Admin User',
      email: 'admin@baklovah.com'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Update profile response:', updateProfile.data);
    
    // Save preferences
    console.log('\nSaving preferences...');
    const savePreferences = await axios.put(`${BASE_URL}/api/admin/users/preferences`, {
      theme: 'dark',
      language: 'en',
      emailNotifications: true,
      desktopNotifications: true
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Save preferences response:', savePreferences.data);
    
    console.log('\nProfile API tests completed successfully!');
  } catch (error) {
    console.error('Profile API test failed:', error.response ? error.response.data : error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    await login();
    await testSettingsAPI();
    await testUsersAPI();
    await testProfileAPI();
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

runTests();
