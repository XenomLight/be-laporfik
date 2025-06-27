const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { uploadProfilePicture } = require('../middleware/upload');
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

// Register user
router.post('/register', async (req, res) => {
  try {
    const { nama, nim, password, jurusan = 'Teknik Informatika', gmail = null } = req.body;

    // Validation
    if (!nama || !nim || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, NIM, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE nim = $1',
      [nim]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'NIM already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (nama, nim, jurusan, password, gmail, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nama, nim, jurusan, gmail, role',
      [nama, nim, jurusan, hashedPassword, gmail, 'user']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, nim: user.nim, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        jurusan: user.jurusan,
        gmail: user.gmail,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { nim, password } = req.body;

    // Validation
    if (!nim || !password) {
      return res.status(400).json({
        success: false,
        message: 'NIM and password are required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, nama, nim, jurusan, gmail, password, role FROM users WHERE nim = $1',
      [nim]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, nim: user.nim, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      role: user.role,
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        jurusan: user.jurusan,
        gmail: user.gmail,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, nama, nim, jurusan, gmail, profile_url, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        jurusan: user.jurusan,
        gmail: user.gmail,
        profile_url: user.profile_url,
        role: user.role
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile by NIM (for admin or public access)
router.get('/user/profile', async (req, res) => {
  try {
    const { nim } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!nim) {
      return res.status(400).json({
        success: false,
        message: 'NIM is required'
      });
    }

    // Verify token if provided
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (error) {
        // Token is invalid, but we can still get public profile
      }
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, nama, nim, jurusan, gmail, profile_url, role FROM users WHERE nim = $1',
      [nim]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        jurusan: user.jurusan,
        gmail: user.gmail,
        profile_url: user.profile_url,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nama, jurusan, gmail, profile_url } = req.body;

    // Validation
    if (!nama) {
      return res.status(400).json({
        success: false,
        message: 'Nama is required'
      });
    }

    // Update user profile
    const result = await pool.query(
      'UPDATE users SET nama = $1, jurusan = $2, gmail = $3, profile_url = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, nama, nim, jurusan, gmail, profile_url, role',
      [nama, jurusan || 'Teknik Informatika', gmail, profile_url, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        jurusan: user.jurusan,
        gmail: user.gmail,
        profile_url: user.profile_url,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update profile picture
router.post('/profile/picture', authenticateToken, uploadProfilePicture, async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Generate the file URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const profileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    // Update user's profile_url in database
    const result = await pool.query(
      'UPDATE users SET profile_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nama, nim, jurusan, gmail, profile_url, role',
      [profileUrl, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profile_url: profileUrl,
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        jurusan: user.jurusan,
        gmail: user.gmail,
        profile_url: user.profile_url,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 