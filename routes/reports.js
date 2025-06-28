const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { uploadReportImages } = require('../middleware/upload');
const path = require('path');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// Create a new report with images
router.post('/', authenticateToken, uploadReportImages, async (req, res) => {
  try {
    const { kategori, judul, rincian } = req.body;
    const userId = req.user.id;

    // Validation
    if (!kategori || !judul || !rincian) {
      return res.status(400).json({
        success: false,
        message: 'Kategori, judul, and rincian are required'
      });
    }

    // Process uploaded images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      imageUrls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
    }

    // Create report
    const result = await pool.query(
      'INSERT INTO reports (user_id, kategori, judul, rincian, images) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, kategori, judul, rincian, imageUrls]
    );

    const report = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      report
    });

  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all reports (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, kategori, page = 1, limit = 10, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, u.nama as user_nama, u.nim as user_nim, u.jurusan as user_jurusan
      FROM reports r
      JOIN users u ON r.user_id = u.id
    `;
    let countQuery = 'SELECT COUNT(*) FROM reports r JOIN users u ON r.user_id = u.id';
    let queryParams = [];
    let whereConditions = [];

    // Add filters
    if (status) {
      whereConditions.push(`r.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    if (kategori) {
      whereConditions.push(`r.kategori = $${queryParams.length + 1}`);
      queryParams.push(kategori);
    }

    // Add WHERE clause if filters exist
    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Add ordering and pagination
    const validSortFields = ['created_at', 'judul', 'status', 'kategori'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
    
    query += ` ORDER BY r.${sortField} ${sortOrder} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);

    // Execute queries
    const [reportsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const reports = reportsResult.rows;
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's own reports
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM reports WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM reports WHERE user_id = $1';
    let queryParams = [userId];

    // Add status filter if provided
    if (status) {
      query += ' AND status = $2';
      countQuery += ' AND status = $2';
      queryParams.push(status);
    }

    // Add ordering and pagination
    query += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(parseInt(limit), offset);

    // Execute queries
    const [reportsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const reports = reportsResult.rows;
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single report by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT r.*, u.nama as user_nama, u.nim as user_nim, u.jurusan as user_jurusan
       FROM reports r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = result.rows[0];

    // Check if user can access this report (owner or admin)
    if (report.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update report status (admin only)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

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

    // Update report
    const result = await pool.query(
      'UPDATE reports SET status = $1, feedback = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, feedback, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report status updated successfully',
      report: result.rows[0]
    });

  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add message to report
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    // Validation
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Check if report exists and user has access
    const reportResult = await pool.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const isOwner = report.user_id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add message
    const result = await pool.query(
      'INSERT INTO report_messages (report_id, user_id, message, is_admin_message) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, message, isAdmin]
    );

    res.status(201).json({
      success: true,
      message: 'Message added successfully',
      reportMessage: result.rows[0]
    });

  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get messages for a report
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if report exists and user has access
    const reportResult = await pool.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];
    const isOwner = report.user_id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get messages
    const result = await pool.query(
      `SELECT rm.*, u.nama as user_nama, u.nim as user_nim
       FROM report_messages rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.report_id = $1
       ORDER BY rm.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      messages: result.rows
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get latest reports (for notifications)
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const { limit = 2 } = req.query;
    
    console.log('🔍 Latest reports request:', { limit, user: req.user });
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied: User is not admin');
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const query = `
      SELECT r.*, u.nama as user_nama, u.nim as user_nim, u.jurusan as user_jurusan
      FROM reports r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT $1
    `;

    console.log('📝 Executing query:', query);
    const result = await pool.query(query, [parseInt(limit)]);
    console.log('✅ Query result:', result.rows.length, 'reports found');

    res.json({
      success: true,
      reports: result.rows
    });

  } catch (error) {
    console.error('❌ Get latest reports error:', error);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get report statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Stats request from user:', req.user);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied: User is not admin');
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log('📝 Executing stats queries...');

    // Get today's reports
    const todayQuery = `
      SELECT COUNT(*) as count
      FROM reports
      WHERE DATE(created_at) = CURRENT_DATE
    `;

    // Get this week's reports
    const weekQuery = `
      SELECT COUNT(*) as count
      FROM reports
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `;

    // Get all time reports
    const allTimeQuery = `
      SELECT COUNT(*) as count
      FROM reports
    `;

    // Get unread reports (pending status)
    const unreadQuery = `
      SELECT COUNT(*) as count
      FROM reports
      WHERE status = 'pending'
    `;

    const [todayResult, weekResult, allTimeResult, unreadResult] = await Promise.all([
      pool.query(todayQuery),
      pool.query(weekQuery),
      pool.query(allTimeQuery),
      pool.query(unreadQuery)
    ]);

    const stats = {
      today: parseInt(todayResult.rows[0].count),
      this_week: parseInt(weekResult.rows[0].count),
      all_time: parseInt(allTimeResult.rows[0].count),
      unread_count: parseInt(unreadResult.rows[0].count)
    };

    console.log('✅ Stats calculated:', stats);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Get report stats error:', error);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 