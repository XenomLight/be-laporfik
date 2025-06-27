const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');

// Get all feedback (admin only)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, u.username as user_name 
       FROM feedback f 
       LEFT JOIN users u ON f.user_id = u.id 
       ORDER BY f.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get recent feedback (public)
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await pool.query(
      `SELECT f.id, f.category, f.title, f.description, f.status, f.created_at, u.username as user_name
       FROM feedback f 
       LEFT JOIN users u ON f.user_id = u.id 
       ORDER BY f.created_at DESC 
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get recent feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get feedback by user
router.get('/my-feedback', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get user feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single feedback by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT f.*, u.username as user_name 
       FROM feedback f 
       LEFT JOIN users u ON f.user_id = u.id 
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get feedback by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new feedback
router.post('/', verifyToken, async (req, res) => {
  try {
    const { category, title, description, priority = 'medium' } = req.body;

    // Validation
    if (!category || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category, title, and description are required'
      });
    }

    // Create feedback
    const result = await pool.query(
      `INSERT INTO feedback (user_id, category, title, description, priority, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') 
       RETURNING *`,
      [req.user.id, category, title, description, priority]
    );

    const feedback = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update feedback status (admin only)
router.patch('/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    // Validation
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update feedback
    const result = await pool.query(
      `UPDATE feedback 
       SET status = $1, admin_response = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [status, admin_response, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback status updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete feedback (admin or owner)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin or owner
    const feedback = await pool.query(
      'SELECT user_id FROM feedback WHERE id = $1',
      [id]
    );

    if (feedback.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (req.user.role !== 'admin' && feedback.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete feedback
    await pool.query('DELETE FROM feedback WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 