/**
 * User API Routes
 * Handles all API routes for user management
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    // Get all users from database (excluding passwords)
    const [users] = await pool.query(
      'SELECT id, name, email, role, active, last_login FROM users ORDER BY id ASC'
    );

    // Format last_login date
    const formattedUsers = users.map(user => {
      return {
        ...user,
        lastLogin: user.last_login ? new Date(user.last_login).toLocaleString() : null
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user from database (excluding password)
    const [users] = await pool.query(
      'SELECT id, name, email, role, active, last_login FROM users WHERE id = ? LIMIT 1',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format last_login date
    const user = {
      ...users[0],
      lastLogin: users[0].last_login ? new Date(users[0].last_login).toLocaleString() : null
    };

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create or update user
 * @access  Private (Admin only)
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { id, name, email, password, role, active } = req.body;
    
    // Validate input
    if (!name || !email || (!id && !password) || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate role
    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if we're updating an existing user
    if (id) {
      // Check if user exists
      const [existingUser] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If password is provided, hash it
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await pool.query(
          'UPDATE users SET name = ?, email = ?, password = ?, role = ?, active = ?, updated_at = NOW() WHERE id = ?',
          [name, email, hashedPassword, role, active ? 1 : 0, id]
        );
      } else {
        // Update without changing password
        await pool.query(
          'UPDATE users SET name = ?, email = ?, role = ?, active = ?, updated_at = NOW() WHERE id = ?',
          [name, email, role, active ? 1 : 0, id]
        );
      }

      return res.json({ message: 'User updated successfully', id });
    } else {
      // Creating a new user
      // Check if email already exists
      const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Insert new user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [name, email, hashedPassword, role, active ? 1 : 0]
      );

      return res.status(201).json({ message: 'User created successfully', id: result.insertId });
    }
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const [existingUser] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting the last admin user
    if (existingUser[0].role === 'admin') {
      const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      
      if (adminCount[0].count <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user' });
      }
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
