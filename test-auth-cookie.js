/**
 * Test script to verify JWT cookie authentication
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const cookieParser = require('cookie-parser');
const { authenticate } = require('./src/middleware/auth');

// Create a small test Express app
const app = express();
app.use(cookieParser());

// Route that sets a test JWT token in a cookie
app.get('/set-cookie', (req, res) => {
  const user = { userId: 1, username: 'admin', role: 'admin' };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  console.log('Generated test token:', token);
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });
  
  res.send(`
    <html>
      <body>
        <h1>Test cookie set!</h1>
        <p>Token has been set in cookie. Now try accessing the protected route.</p>
        <a href="/protected">Access Protected Route</a>
      </body>
    </html>
  `);
});

// Protected route that uses our actual authentication middleware
app.get('/protected', authenticate, (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Protected Route Access Successful!</h1>
        <p>User: ${JSON.stringify(req.user)}</p>
        <p>This means the authentication middleware is working correctly.</p>
      </body>
    </html>
  `);
});

// Start the test server
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Test authentication server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/set-cookie to set a test cookie`);
});
