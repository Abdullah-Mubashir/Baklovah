/**
 * Test Routes for Debugging Authentication
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Route to manually set a valid JWT token in a cookie
router.get('/set-token', (req, res) => {
  try {
    // Create a token for admin user
    const user = { userId: 1, username: 'admin', role: 'admin' };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('Debug: Generated test token:', token.substring(0, 20) + '...');
    
    // Set the token in a cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    // Display confirmation and provide links
    res.send(`
      <html>
        <head>
          <title>Test Token Set</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="bg-light">
          <div class="container mt-5">
            <div class="card">
              <div class="card-header bg-success text-white">
                <h2>Test Token Set Successfully</h2>
              </div>
              <div class="card-body">
                <p>A valid JWT token for the admin user has been set in your browser's cookies.</p>
                <p>The token will expire in 1 hour.</p>
                
                <div class="mt-4">
                  <h4>Test Links:</h4>
                  <ul>
                    <li><a href="/admin/dashboard" class="btn btn-primary mt-2">Try accessing Dashboard</a></li>
                    <li><a href="/admin/menu" class="btn btn-primary mt-2">Try accessing Menu Management</a></li>
                    <li><a href="/admin/auth-test" class="btn btn-info mt-2">Check Authentication Status</a></li>
                    <li><a href="/admin" class="btn btn-secondary mt-2">Go to Admin Login</a></li>
                  </ul>
                </div>
                
                <div class="mt-4">
                  <h4>Debug Information:</h4>
                  <pre>Token: ${token.substring(0, 20)}...</pre>
                  <pre>User: ${JSON.stringify(user, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error setting test token:', error);
    res.status(500).send('Error setting test token');
  }
});

// Export the router
module.exports = router;
