const { Pool } = require('pg');
require('dotenv').config();

// Database configuration for Neon PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Test connection function
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection test successful');
    console.log('📊 Database:', client.connectionParameters.database);
    console.log('🌐 Host:', client.connectionParameters.host);
    client.release();
  } catch (err) {
    console.error('❌ Database connection test failed:', err.message);
    console.error('💡 Make sure your DATABASE_URL is correct in .env file');
    console.error('💡 Check if your Neon database is active');
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = {
  pool,
  testConnection
}; 