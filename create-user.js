#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createUser() {
  try {
    console.log('=== LaporFIK User Creation Tool ===\n');

    // Get user input
    const nama = await question('Nama Lengkap: ');
    const nim = await question('NIM: ');
    const jurusan = await question('Jurusan (default: Teknik Informatika): ') || 'Teknik Informatika';
    const gmail = await question('Gmail (optional): ') || null;
    const password = await question('Password: ');
    const confirmPassword = await question('Confirm Password: ');
    const role = await question('Role (user/admin, default: user): ') || 'user';

    // Validation
    if (!nama || !nim || !password) {
      console.error('Error: Nama, NIM, and password are required!');
      rl.close();
      return;
    }

    if (password !== confirmPassword) {
      console.error('Error: Passwords do not match!');
      rl.close();
      return;
    }

    if (password.length < 6) {
      console.error('Error: Password must be at least 6 characters long!');
      rl.close();
      return;
    }

    if (!['user', 'admin'].includes(role)) {
      console.error('Error: Role must be either "user" or "admin"!');
      rl.close();
      return;
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE nim = $1',
      [nim]
    );

    if (existingUser.rows.length > 0) {
      console.error('Error: User with this NIM already exists!');
      rl.close();
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (nama, nim, jurusan, password, gmail, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nama, nim, jurusan, gmail, role',
      [nama, nim, jurusan, hashedPassword, gmail, role]
    );

    const user = result.rows[0];

    console.log('\n✅ User created successfully!');
    console.log('User Details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Nama: ${user.nama}`);
    console.log(`  NIM: ${user.nim}`);
    console.log(`  Jurusan: ${user.jurusan}`);
    console.log(`  Gmail: ${user.gmail || 'Not provided'}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created at: ${new Date().toLocaleString()}`);

  } catch (error) {
    console.error('Error creating user:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
LaporFIK User Creation Tool

Usage:
  node create-user.js                    # Interactive mode
  node create-user.js --help            # Show this help

Interactive mode will prompt you for:
  - Nama Lengkap (required)
  - NIM (required, must be unique)
  - Jurusan (optional, default: Teknik Informatika)
  - Gmail (optional)
  - Password (required, min 6 characters)
  - Confirm Password (required)
  - Role (optional, default: user)

Examples:
  node create-user.js                   # Create user interactively
  `);
  process.exit(0);
}

// Run the user creation
createUser(); 