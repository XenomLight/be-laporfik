#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { pool } = require('./config/database');

async function setupDatabase() {
  try {
    console.log('🗄️  Setting up LaporFIK database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 Executing database schema...');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database schema executed successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - reports');
    console.log('   - report_messages');
    console.log('   - Indexes and triggers');
    console.log('\n🔐 Default admin account:');
    console.log('   NIM: 0000000000');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Your DATABASE_URL is correct in .env file');
    console.error('   2. Your database is accessible');
    console.error('   3. You have permission to create tables');
  } finally {
    await pool.end();
  }
}

setupDatabase(); 