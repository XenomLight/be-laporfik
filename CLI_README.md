# LaporFIK Backend CLI Tools

This document explains how to use the command-line tools for managing the LaporFIK backend.

## Prerequisites

1. Make sure you have Node.js installed (version 16 or higher)
2. Install dependencies: `npm install`
3. Set up your environment variables in `.env` file
4. Ensure your database is running and accessible

## Available CLI Commands

### 1. Create User

Creates a new user in the system with NIM-based authentication.

**Usage:**
```bash
npm run create-user
```

**Interactive Mode:**
The tool will prompt you for the following information:
- **Nama Lengkap** (required): Full name of the user
- **NIM** (required): Student ID number (must be unique)
- **Jurusan** (optional): Study program (default: Teknik Informatika)
- **Gmail** (optional): Gmail address
- **Password** (required): Password (minimum 6 characters)
- **Confirm Password** (required): Password confirmation
- **Role** (optional): User role - 'user' or 'admin' (default: user)

**Example Session:**
```bash
$ npm run create-user

=== LaporFIK User Creation Tool ===

Nama Lengkap: John Doe
NIM: 1234567890
Jurusan (default: Teknik Informatika): Sistem Informasi
Gmail (optional): john.doe@student.upn.ac.id
Password: mypassword123
Confirm Password: mypassword123
Role (user/admin, default: user): user

✅ User created successfully!
User Details:
  ID: 2
  Nama: John Doe
  NIM: 1234567890
  Jurusan: Sistem Informasi
  Gmail: john.doe@student.upn.ac.id
  Role: user
  Created at: 12/1/2024, 2:30:45 PM
```

### 2. Database Setup

Sets up the database schema and initial data.

**Usage:**
```bash
npm run setup
```

This will:
- Create all necessary tables (users, reports, report_messages)
- Create indexes for better performance
- Insert default admin user
- Set up triggers for automatic timestamp updates

### 3. Start Development Server

Starts the development server with auto-reload.

**Usage:**
```bash
npm run dev
```

### 4. Start Production Server

Starts the production server.

**Usage:**
```bash
npm start
```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/profile/picture` - Upload profile picture
- `GET /api/auth/user/profile` - Get user profile by NIM

### Reports Endpoints

- `POST /api/reports` - Create new report (with images)
- `GET /api/reports` - Get all reports (admin only)
- `GET /api/reports/my-reports` - Get user's own reports
- `GET /api/reports/:id` - Get single report
- `PATCH /api/reports/:id/status` - Update report status (admin only)
- `POST /api/reports/:id/messages` - Add message to report
- `GET /api/reports/:id/messages` - Get report messages

## File Upload Features

### Profile Picture Upload

Users can upload profile pictures using the `/api/auth/profile/picture` endpoint.

**Features:**
- Supports common image formats (JPEG, PNG, GIF, etc.)
- Maximum file size: 5MB
- Automatic file naming with timestamps
- Files served at `/uploads/` directory

**Example Upload:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profile_picture=@/path/to/image.jpg" \
  http://localhost:5000/api/auth/profile/picture
```

### Report Images Upload

Users can upload multiple images when creating reports.

**Features:**
- Up to 5 images per report
- Maximum file size: 5MB per image
- Automatic file naming with timestamps
- Images stored as URLs in the database

**Example Report Creation with Images:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "kategori=Infrastructure" \
  -F "judul=Broken Chair in Lab" \
  -F "rincian=Chair in lab A is broken and needs repair" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  http://localhost:5000/api/reports
```

## Database Schema

The CLI tools work with the following database structure:

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    nim VARCHAR(20) UNIQUE NOT NULL,
    jurusan VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    gmail VARCHAR(100) DEFAULT NULL,
    profile_url VARCHAR(500) DEFAULT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Reports Table
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    kategori VARCHAR(50) NOT NULL,
    judul VARCHAR(200) NOT NULL,
    rincian TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Report Messages Table
```sql
CREATE TABLE report_messages (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_message BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

Make sure your `.env` file contains:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/laporfik
DATABASE_SSL=false

# JWT
JWT_SECRET=your-secret-key-here

# Server
PORT=5000
NODE_ENV=development

# File Upload (optional)
BASE_URL=http://localhost:5000
```

## File Storage

### Upload Directory Structure
```
backend_node/
├── uploads/
│   ├── profile-1234567890-123456789.jpg
│   ├── profile-1234567890-987654321.png
│   └── report-1234567890-111111111.jpg
```

### File Access
- Profile pictures: `http://localhost:5000/uploads/profile-*.jpg`
- Report images: `http://localhost:5000/uploads/report-*.jpg`

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL in .env file
   - Ensure database exists

2. **Permission Denied**
   - Make sure you have write permissions to the database
   - Check if the database user has proper privileges

3. **NIM Already Exists**
   - Each NIM must be unique
   - Use a different NIM or delete the existing user first

4. **Password Too Short**
   - Password must be at least 6 characters long

5. **File Upload Issues**
   - Check if uploads directory exists and is writable
   - Verify file size is under 5MB
   - Ensure file is an image format
   - Check if BASE_URL is set correctly

### Getting Help

For help with any CLI command:
```bash
node create-user.js --help
```

## Security Notes

- Default admin password is `admin123` - change it immediately after first setup
- JWT_SECRET should be a strong, random string
- Never commit .env files to version control
- Regularly update dependencies for security patches
- Uploaded files are served publicly - consider additional security measures for production
- File uploads are limited to image files only
- Maximum file size is enforced to prevent abuse 