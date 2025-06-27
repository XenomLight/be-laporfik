#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 LaporFIK Backend Setup');
console.log('========================\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    // Check if .env already exists
    if (fs.existsSync('.env')) {
      const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ Setup cancelled.');
        rl.close();
        return;
      }
    }

    console.log('📝 Please provide the following information:\n');

    // Get Neon PostgreSQL URL
    const databaseUrl = await question('🗄️  Neon PostgreSQL URL (postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/database_name?sslmode=require): ');
    
    if (!databaseUrl.includes('neon.tech')) {
      console.log('⚠️  Warning: This doesn\'t look like a Neon PostgreSQL URL.');
    }

    // Generate JWT secret
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    console.log(`🔐 Generated JWT secret: ${jwtSecret}`);

    // Get CORS origins
    const corsOrigins = await question('🌐 CORS Origins (use * for development, or comma-separated domains for production): ');
    
    // Get port
    const port = await question('🔌 Port (default: 5000): ') || '5000';

    // Get environment
    const environment = await question('🌍 Environment (development/production, default: development): ') || 'development';

    // Create .env content
    const envContent = `# Server Configuration
NODE_ENV=${environment}
PORT=${port}

# Database Configuration (Neon PostgreSQL)
DATABASE_URL=${databaseUrl}

# JWT Configuration
JWT_SECRET=${jwtSecret}

# CORS Configuration (Allowed Origins)
ALLOWED_ORIGINS=${corsOrigins}

# Optional: Logging
LOG_LEVEL=info
`;

    // Write .env file
    fs.writeFileSync('.env', envContent);

    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the database schema:');
    console.log(`   psql "${databaseUrl}" -f database/schema.sql`);
    console.log('\n2. Install dependencies:');
    console.log('   npm install');
    console.log('\n3. Start the server:');
    console.log('   npm run dev');
    console.log('\n4. Test the API:');
    console.log('   curl http://localhost:5000/health');
    console.log('\n🔐 Default admin account:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n⚠️  Remember to change the admin password after first login!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setup(); 