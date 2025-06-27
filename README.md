# LaporFIK Backend API

A production-ready Node.js backend for the LaporFIK Android application, built with Express.js and PostgreSQL (Neon).

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: User registration, login, profile management
- **Feedback System**: Submit, view, and manage feedback with status tracking
- **Admin Panel**: Admin-only endpoints for managing users and feedback
- **Security**: Password hashing, rate limiting, CORS protection, helmet security
- **Production Ready**: Optimized for VPS deployment with proper error handling
- **Neon PostgreSQL**: Cloud-hosted database with automatic scaling

## 📋 Prerequisites

- Node.js 16+ 
- Neon PostgreSQL account (free tier available)
- PM2 (for production deployment)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd backend_node
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration (Neon PostgreSQL)
# Get this from your Neon dashboard: https://console.neon.tech
DATABASE_URL=postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/database_name?sslmode=require

# JWT Configuration
# Generate a random string (at least 32 characters) for security
# You can use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-at-least-32-characters

# CORS Configuration (Allowed Origins)
# For development: ALLOWED_ORIGINS=*
# For production: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=*
```

## 🗄️ Neon PostgreSQL Setup

### 1. Create Neon Account
1. Go to [Neon Console](https://console.neon.tech)
2. Sign up for a free account
3. Create a new project

### 2. Get Connection String
1. In your Neon dashboard, go to your project
2. Click on "Connection Details"
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your actual password

### 3. Run Database Schema
```bash
# Connect to your Neon database
psql "postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/database_name?sslmode=require"

# Run the schema
\i database/schema.sql
```

## 🔐 Understanding JWT (JSON Web Tokens)

JWT is a secure way to handle user authentication. Here's how it works:

### JWT Flow:
1. **User Login** → Server verifies credentials
2. **Server Creates JWT** → Contains user info + expiration
3. **Client Stores JWT** → Android app saves the token
4. **Client Uses JWT** → Sends token with each request
5. **Server Validates JWT** → Checks if token is valid

### JWT Structure:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMzE2ODAwMCwiZXhwIjoxNzA1NzYwMDAwfQ.signature
```

**Parts:**
- **Header**: Algorithm info
- **Payload**: User data (ID, username, role, expiration)
- **Signature**: Security hash to prevent tampering

### Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 CORS Configuration

CORS (Cross-Origin Resource Sharing) controls which domains can access your API.

### Development:
```env
ALLOWED_ORIGINS=*
```

### Production:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### For Android Apps:
- Use `ALLOWED_ORIGINS=*` for development
- For production, you can specify your domain or keep `*` for mobile apps

## 🚀 VPS Deployment

### 1. Upload to VPS

```bash
# Upload your backend_node folder to your VPS
scp -r backend_node/ user@your-vps:/home/user/
```

### 2. Install Dependencies on VPS

```bash
ssh user@your-vps
cd backend_node
npm install --production
```

### 3. Configure Environment

```bash
cp env.example .env
nano .env  # Edit with your production values
```

### 4. Install PM2

```bash
npm install -g pm2
```

### 5. Start with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 6. Setup Nginx (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### POST /api/auth/login
Login user.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "role": "user",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Feedback Endpoints

#### GET /api/feedback/recent
Get recent feedback (public).

**Query Parameters:**
- `limit` (optional): Number of feedback items to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category": "Infrastructure",
      "title": "Broken Chair",
      "description": "Chair in room 101 is broken",
      "status": "pending",
      "created_at": "2024-01-01T10:00:00Z",
      "user_name": "john_doe"
    }
  ]
}
```

#### POST /api/feedback
Create new feedback (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "category": "Infrastructure",
  "title": "Broken Chair",
  "description": "Chair in room 101 is broken",
  "priority": "medium"
}
```

### User Endpoints

#### GET /api/user/profile
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

## 🔧 Development

### Running in Development Mode

```bash
npm run dev
```

### Testing the API

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable allowed origins
- **Helmet Security**: Various HTTP security headers
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries

## 📊 Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email
- `password`: Hashed password
- `role`: User role (user/admin)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Feedback Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `category`: Feedback category
- `title`: Feedback title
- `description`: Feedback description
- `priority`: Priority level
- `status`: Current status
- `admin_response`: Admin response
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL in .env
   - Ensure Neon database is active
   - Verify database credentials

2. **JWT Token Issues**
   - Check JWT_SECRET in .env
   - Ensure token is being sent in Authorization header
   - Verify token hasn't expired

3. **CORS Errors**
   - Update ALLOWED_ORIGINS in .env
   - Use `*` for development
   - Check if your domain is included

### Logs

```bash
# View PM2 logs
pm2 logs laporfik-backend

# View real-time logs
pm2 logs laporfik-backend --lines 100
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support, please contact the development team or create an issue in the repository. 