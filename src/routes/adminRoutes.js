/**
 * Admin Routes
 * Handles all routes for the admin panel interface
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const db = require('../database/adapter');
const jwt = require('jsonwebtoken');

// Public admin routes
// Login page
router.get('/', (req, res) => {
  res.render('admin/login', { error: null });
});

// Handle login form submission
router.post('/login', async (req, res) => {
  console.log('Login form submitted with username:', req.body.username);
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.render('admin/login', { error: 'Username and password are required' });
    }
    
    // Query the database for the user with admin role
    const users = await db.query('SELECT * FROM users WHERE username = ? AND role = ?', [username, 'admin']);
    
    if (users.length === 0) {
      console.log('Admin user not found');
      return res.render('admin/login', { error: 'Invalid username or password' });
    }
    
    const user = users[0];
    
    // Check password using bcrypt
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('Password does not match');
      return res.render('admin/login', { error: 'Invalid username or password' });
    }
    
    // If username and password are correct, generate a token
    const jwt = require('jsonwebtoken');
    console.log('Using JWT_SECRET:', process.env.JWT_SECRET ? 'Secret is defined' : 'SECRET IS MISSING');
    
    const userData = { userId: user.id, username: user.username, role: user.role };
    console.log('User data for token:', userData);
    
    const token = jwt.sign(
      userData,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    
    console.log('Login successful, token generated');
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    // Set token in a cookie with more permissive settings for development
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Allow non-HTTPS for development
      sameSite: 'lax', // Helps with CSRF
      path: '/', // Make sure cookie is available for all paths
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    console.log('Token cookie set, redirecting to auth-test for verification');
    
    // Redirect to auth-test first to verify the cookie is working
    return res.send(`
      <html>
        <head>
          <title>Authenticating...</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
          <h2>Login successful!</h2>
          <p>Verifying authentication...</p>
          <div id="debug"></div>
          
          <script>
            // Log cookies to the page for debugging
            document.getElementById('debug').innerHTML = 
              '<p>Cookies: ' + document.cookie + '</p>';
            
            // Wait longer before redirecting to give cookie time to be set
            setTimeout(() => {
              window.location.href = '/admin/auth-test-new';
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('admin/login', { error: 'An error occurred during login' });
  }
});

// Diagnostic route for authentication testing
router.get('/auth-test', (req, res) => {
  console.log('Auth test page requested');
  console.log('Cookies present:', req.cookies ? Object.keys(req.cookies) : 'none');
  
  // Check if we have a token in the cookies
  let tokenStatus = 'No token found';
  let user = null;
  
  if (req.cookies && req.cookies.token) {
    try {
      // Try to decode the token
      user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      tokenStatus = 'Valid token found';
    } catch (error) {
      tokenStatus = `Invalid token: ${error.message}`;
    }
  }
  
  console.log('Token status:', tokenStatus);
  
  res.render('admin/auth-test', {
    user: user,
    tokenStatus: tokenStatus
  });
});

// New diagnostic route for authentication testing with more details
router.get('/auth-test-new', (req, res) => {
  console.log('Auth test new page requested');
  console.log('Cookies received:', req.cookies ? JSON.stringify(req.cookies) : 'none');
  
  // Check if we have a token in the cookies
  let tokenStatus = 'No token found';
  let user = null;
  let verifyError = null;
  
  if (req.cookies && req.cookies.token) {
    try {
      console.log('JWT_SECRET used for verification:', process.env.JWT_SECRET ? 'Secret is defined' : 'SECRET IS MISSING');
      // Try to decode the token
      user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      tokenStatus = 'Valid token found';
      console.log('Token verified successfully for user:', user.username);
      
      // Re-issue the token to ensure it's fresh
      const token = jwt.sign(
        { userId: user.userId, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );
      
      // Set cookie with same properties to refresh it
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,  // Set to true in production with HTTPS
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      console.log('Token refreshed in auth-test-new route');
    } catch (error) {
      tokenStatus = `Invalid token: ${error.message}`;
      verifyError = error;
      console.error('Token verification error:', error.message);
    }
  }
  
  let nextAction = null;
  if (user) {
    nextAction = `<a href="/admin/dashboard" class="btn btn-success">Continue to Dashboard</a>`;
  } else {
    nextAction = `<a href="/admin" class="btn btn-primary">Back to Login</a>`;
  }
  
  res.render('admin/auth-test-new', {
    user: user,
    tokenStatus: tokenStatus,
    verifyError: verifyError,
    nextAction: nextAction,
    req: req  // Pass the request object to the template
  });
});

// Admin-only protected routes (require authentication)

// Dashboard with more explicit authentication handling
router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
  console.log('Dashboard access attempt by user:', req.user);
  console.log('User authentication successful, proceeding to render dashboard');
  try {
    // Set the token cookie again to ensure it's fresh
    if (req.user) {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: req.user.userId, username: req.user.username, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      console.log('Token refreshed on dashboard access');
    }
    
    res.render('admin/dashboard', {
      title: 'Dashboard',
      currentPath: '/admin/dashboard',
      user: req.user,
      actionButtons: ''
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Menu Management
router.get('/menu', authenticate, isAdmin, async (req, res) => {
  try {
    res.render('admin/menu', {
      title: 'Menu Management',
      currentPath: '/admin/menu',
      user: req.user,
      actionButtons: '<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addItemModal"><i class="bi bi-plus"></i> Add New Item</button>'
    });
  } catch (error) {
    console.error('Error loading menu management:', error);
    res.status(500).send('Error loading menu management');
  }
});

// Orders Management
router.get('/orders', authenticate, isAdmin, async (req, res) => {
  try {
    res.render('admin/orders', {
      title: 'Orders Management',
      currentPath: '/admin/orders',
      user: req.user,
      actionButtons: ''
    });
  } catch (error) {
    console.error('Error loading orders management:', error);
    res.status(500).send('Error loading orders management');
  }
});

// Analytics
router.get('/analytics', authenticate, isAdmin, async (req, res) => {
  try {
    res.render('admin/analytics', {
      title: 'Analytics',
      currentPath: '/admin/analytics',
      user: req.user,
      actionButtons: ''
    });
  } catch (error) {
    console.error('Error loading analytics:', error);
    res.status(500).send('Error loading analytics');
  }
});

// Website Customization
router.get('/customize', authenticate, isAdmin, async (req, res) => {
  try {
    res.render('admin/customize', {
      title: 'Customize Website',
      currentPath: '/admin/customize',
      user: req.user,
      actionButtons: '<button class="btn btn-success" id="saveCustomizationsBtn"><i class="bi bi-save"></i> Save Changes</button>'
    });
  } catch (error) {
    console.error('Error loading customization page:', error);
    res.status(500).send('Error loading customization page');
  }
});

// Settings
router.get('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    res.render('admin/settings', {
      title: 'Settings',
      currentPath: '/admin/settings',
      user: req.user,
      actionButtons: ''
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).send('Error loading settings');
  }
});

// Profile
router.get('/profile', authenticate, isAdmin, async (req, res) => {
  try {
    res.render('admin/profile', {
      title: 'User Profile',
      currentPath: '/admin/profile',
      user: req.user,
      actionButtons: ''
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Error loading profile');
  }
});

// Logout
router.get('/logout', (req, res) => {
  // Client-side will handle clearing of token
  res.redirect('/admin');
});

module.exports = router;
