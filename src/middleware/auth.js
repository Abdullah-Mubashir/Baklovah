/**
 * Authentication Middleware
 * Verifies JWT tokens for protected routes
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = (req, res, next) => {
  try {
    console.log('=====================================================');
    console.log('Auth middleware called for path:', req.path);
    console.log('AUTHENTICATION BYPASS ENABLED - Granting access for development');
    
    // TEMPORARY: Create a mock admin user for development
    req.user = {
      userId: 1,
      username: 'admin',
      role: 'admin'
    };
    
    console.log('Auto-authenticated as admin user');
    console.log('User data:', JSON.stringify(req.user));
    
    next();
    
    /* AUTHENTICATION DISABLED TEMPORARILY
    let token;
    
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract token without 'Bearer ' prefix
      token = authHeader.split(' ')[1];
      console.log('Token found in Authorization header');
    } 
    // Then check cookies for token
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookies, token preview:', token.substring(0, 20) + '...');
    }
    
    // If no token found, check for JWT in query string (for testing)
    else if (req.query && req.query.token) {
      token = req.query.token;
      console.log('Token found in query string');
    }
    
    if (!token) {
      console.log('No token found, authentication failed');
      // For API requests, return JSON
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Authentication required. No token provided.' });
      }
      // For web routes, redirect to login page
      console.log('Redirecting to login page due to missing token');
      return res.redirect('/admin');
    }
    
    console.log('Token found, attempting to verify with JWT_SECRET:', process.env.JWT_SECRET ? 'Secret is defined' : 'SECRET IS MISSING');
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    console.log('Token verified successfully for user:', decoded.username);
    console.log('User data:', JSON.stringify(decoded));
    
    // Set a fresh cookie in case the existing one is close to expiration
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Allow non-HTTPS for development
      sameSite: 'lax', // Helps with CSRF
      path: '/', // Make sure cookie is available for all paths
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    */
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // TEMPORARY: Even on error, create a mock admin user for development
    req.user = {
      userId: 1,
      username: 'admin',
      role: 'admin'
    };
    
    console.log('Error occurred but auto-authenticated as admin user anyway');
    console.log('User data:', JSON.stringify(req.user));
    
    next();
    
    /* AUTHENTICATION ERROR HANDLING DISABLED TEMPORARILY
    console.error('Token verification error:', error);
    console.error('JWT_SECRET used for verification:', process.env.JWT_SECRET ? 'Secret is defined' : 'SECRET IS MISSING');
    
    // For API requests, return JSON
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // For web routes, redirect to login page
    console.log('Redirecting to login page due to token verification error');
    return res.redirect('/admin');
    */
  }
};

/**
 * Middleware to check if user has admin role
 * Must be used after authenticate middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdmin = (req, res, next) => {
  console.log('isAdmin middleware called for path:', req.path);
  console.log('User data in isAdmin middleware:', req.user ? JSON.stringify(req.user) : 'No user data');
  
  // TEMPORARY: Always grant admin access for development
  console.log('ADMIN ACCESS BYPASS ENABLED - Granting admin access for development');
  next();
  
  /* ADMIN ROLE CHECK DISABLED TEMPORARILY
  if (req.user && req.user.role === 'admin') {
    console.log('User has admin role, proceeding');
    next();
  } else {
    console.log('User does not have admin role or user data missing');
    
    // For API requests, return JSON
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // For web routes, redirect to login page
    console.log('Redirecting to login page due to missing admin privileges');
    return res.redirect('/admin');
  }
  */
};

/**
 * Middleware to check if user has cashier role
 * Must be used after authenticate middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isCashier = (req, res, next) => {
  if (req.user && (req.user.role === 'cashier' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Cashier privileges required.' });
  }
};

module.exports = { authenticate, isAdmin, isCashier };
