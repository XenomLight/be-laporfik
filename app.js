const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, role, email FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (result.rows.length === 1) {
      const user = result.rows[0];
      const token = uuidv4();
      return res.json({ 
        success: true, 
        token: token, 
        role: user.role,
        message: 'Login successful'
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        token: null, 
        role: null,
        message: 'Invalid credentials' 
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      success: false, 
      token: null, 
      role: null,
      message: 'Server error' 
    });
  }
});

// Get user profile (requires authentication)
app.get('/user/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // In a real app, you would validate the token against a sessions table
    // For now, we'll just return a mock user profile
    const result = await pool.query(
      'SELECT id, username, role, email FROM users WHERE username = $1',
      [req.query.username || 'admin']
    );
    
    if (result.rows.length === 1) {
      const user = result.rows[0];
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get recent feedback (public endpoint - no authentication required)
app.get('/feedback/recent', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, category, title, date, description, status FROM feedback ORDER BY date DESC LIMIT 10'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 