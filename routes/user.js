const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { username, email } = req.body;

    // Validation
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username and email are required'
      });
    }

    // Check if username or email already exists (excluding current user)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.user.id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Update user
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING id, username, email, role',
      [username, email, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current user with password
    const user = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.rows[0].password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all users (admin only)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user by ID (admin only)
router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user role (admin only)
router.patch('/:id/role', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validation
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Update user role
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete user
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 