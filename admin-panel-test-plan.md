# Baklovah Admin Panel Test Plan

## Overview
This test plan outlines the steps to verify the functionality of the Baklovah restaurant admin panel, with a focus on the settings and user profile management features.

## Prerequisites
- Node.js server running on port 3001
- Mock data implementation for testing without database connection

## Test Environment
- Browser: Chrome/Firefox/Safari
- URL: http://localhost:3001/admin

## Test Cases

### 1. Admin Login
- **Objective**: Verify admin login functionality
- **Steps**:
  1. Navigate to http://localhost:3001/admin
  2. Enter username: "admin"
  3. Enter password: "admin"
  4. Click "Sign In"
- **Expected Result**: Successfully logged in and redirected to dashboard

### 2. Navigation
- **Objective**: Verify all navigation links in the admin panel
- **Steps**:
  1. Click on each navigation item in the sidebar:
     - Dashboard
     - Menu Management
     - Orders
     - Analytics
     - Customize Website
     - Settings
  2. Click on user dropdown and select "Profile"
- **Expected Result**: Each page loads correctly with appropriate content

### 3. Settings Page

#### 3.1 System Settings
- **Objective**: Verify system settings can be viewed and updated
- **Steps**:
  1. Navigate to Settings page
  2. Modify the following in System Settings:
     - Site Name
     - Time Zone
     - Date Format
     - Currency Symbol
     - Toggle Maintenance Mode
  3. Click "Save System Settings"
- **Expected Result**: Success toast notification appears, settings are saved

#### 3.2 Order Settings
- **Objective**: Verify order settings can be viewed and updated
- **Steps**:
  1. Navigate to Settings page
  2. Modify the following in Order Settings:
     - Tax Rate
     - Minimum Order Amount
     - Delivery Fee
     - Free Delivery Threshold
     - Toggle Online Ordering
  3. Click "Save Order Settings"
- **Expected Result**: Success toast notification appears, settings are saved

#### 3.3 User Management
- **Objective**: Verify user management functionality
- **Steps**:
  1. Navigate to Settings page and click "Users" tab
  2. View list of users
  3. Click "Add User" button
  4. Fill in user details and click "Add User"
  5. Edit an existing user
  6. Delete a user
- **Expected Result**: Users can be added, edited, and deleted with appropriate notifications

#### 3.4 Payment Settings
- **Objective**: Verify payment settings can be viewed and updated
- **Steps**:
  1. Navigate to Settings page and click "Payment" tab
  2. Modify Stripe settings
  3. Click "Save Stripe Settings"
- **Expected Result**: Success toast notification appears, settings are saved

#### 3.5 Notification Settings
- **Objective**: Verify notification settings can be viewed and updated
- **Steps**:
  1. Navigate to Settings page and click "Notifications" tab
  2. Modify email and notification settings
  3. Click "Save Email Settings" and "Save Notification Settings"
- **Expected Result**: Success toast notification appears, settings are saved

### 4. Profile Page

#### 4.1 Profile Information
- **Objective**: Verify profile information can be viewed and updated
- **Steps**:
  1. Navigate to Profile page
  2. Modify name and email
  3. Click "Update Profile"
- **Expected Result**: Success toast notification appears, profile is updated

#### 4.2 Password Change
- **Objective**: Verify password can be changed
- **Steps**:
  1. Navigate to Profile page
  2. Enter current password
  3. Enter new password (meeting requirements)
  4. Confirm new password
  5. Click "Change Password"
- **Expected Result**: Success toast notification appears, password is changed

#### 4.3 User Preferences
- **Objective**: Verify user preferences can be viewed and updated
- **Steps**:
  1. Navigate to Profile page
  2. Modify theme, language, and notification preferences
  3. Click "Save Preferences"
- **Expected Result**: Success toast notification appears, preferences are saved

#### 4.4 Two-Factor Authentication
- **Objective**: Verify two-factor authentication setup
- **Steps**:
  1. Navigate to Profile page
  2. Click "Enable Two-Factor Authentication"
  3. Scan QR code with authenticator app
  4. Enter verification code
  5. Click "Verify & Enable"
- **Expected Result**: Success toast notification appears, 2FA is enabled

#### 4.5 Session Management
- **Objective**: Verify active sessions can be viewed and terminated
- **Steps**:
  1. Navigate to Profile page
  2. View list of active sessions
  3. Click "Terminate" on a non-current session
- **Expected Result**: Success toast notification appears, session is terminated

### 5. Logout
- **Objective**: Verify logout functionality
- **Steps**:
  1. Click on user dropdown
  2. Click "Sign out"
- **Expected Result**: Successfully logged out and redirected to login page

## Test Execution

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Admin Login | | |
| 2. Navigation | | |
| 3.1 System Settings | | |
| 3.2 Order Settings | | |
| 3.3 User Management | | |
| 3.4 Payment Settings | | |
| 3.5 Notification Settings | | |
| 4.1 Profile Information | | |
| 4.2 Password Change | | |
| 4.3 User Preferences | | |
| 4.4 Two-Factor Authentication | | |
| 4.5 Session Management | | |
| 5. Logout | | |

## Issues and Recommendations

| Issue | Description | Recommendation |
|-------|-------------|----------------|
| | | |

## Conclusion

This test plan provides a comprehensive approach to verify the functionality of the Baklovah admin panel, with a focus on the settings and user profile management features. The mock data implementation allows for testing without a database connection, which is useful for UI and client-side validation testing.
