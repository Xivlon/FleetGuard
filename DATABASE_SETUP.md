# Database Setup Guide

## Prerequisites

- PostgreSQL 12 or higher installed
- Node.js 18 or higher

## Setup Steps

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Access PostgreSQL
psql postgres

# Create database
CREATE DATABASE fleetguard;

# Create user (if needed)
CREATE USER fleetguard_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE fleetguard TO fleetguard_user;

# Exit
\q
```

### 3. Configure Backend

1. Copy `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```

2. Update database credentials in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fleetguard
DB_USER=fleetguard_user
DB_PASSWORD=your_password
```

3. Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add it to `.env`:
```
JWT_SECRET=your_generated_secret_here
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Start Backend

The database tables will be created automatically on first run:

```bash
npm start
```

You should see:
```
Testing database connection...
Database connection established successfully
Synchronizing database...
Database synchronized successfully
Fleet Navigation Backend running on port 5000
```

## Database Schema

The following tables will be created automatically:

### `users`
- User accounts (drivers, fleet managers, admins)
- Stores: email, password (hashed), name, role, push token

### `fleets`
- Fleet organizations
- Stores: name, organization code, settings

### `trips`
- Trip history
- Stores: start/end location, route, metrics, hazards encountered

### `notifications`
- Push notification history
- Stores: type, title, body, read status

### `offline_queue`
- Offline message queue for sync
- Stores: message type, payload, sync status

## Verifying Setup

### Check Database Connection

```bash
psql fleetguard -c "\dt"
```

You should see all the tables listed.

### Check Data

```bash
psql fleetguard -c "SELECT * FROM users;"
```

### API Health Check

```bash
curl http://localhost:5000/api/health
```

## Creating First User

### Via API

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fleetguard.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### Via Database

```bash
# Note: Password will need to be hashed
psql fleetguard -c "
INSERT INTO users (id, email, password, first_name, last_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@fleetguard.com',
  '\$2b\$10\$hashedpassword',
  'Admin',
  'User',
  'admin',
  true
);"
```

## Troubleshooting

### Connection Refused

- Ensure PostgreSQL is running: `pg_isready`
- Check port: `lsof -i :5432`
- Verify credentials in `.env`

### Permission Denied

```bash
# Grant all privileges
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE fleetguard TO fleetguard_user;"
```

### Tables Not Created

- Check backend logs for errors
- Manually sync: The app will auto-sync on startup
- Check Sequelize logs (set `LOG_LEVEL=debug` in `.env`)

## Migration

The app uses Sequelize's `sync()` method in development. For production:

1. Use Sequelize migrations
2. Create migration files for schema changes
3. Run migrations before deployment

## Backup

```bash
# Backup database
pg_dump fleetguard > backup.sql

# Restore database
psql fleetguard < backup.sql
```

## Production Considerations

1. Use connection pooling (already configured)
2. Set `NODE_ENV=production`
3. Use strong passwords
4. Enable SSL for database connections
5. Regular backups
6. Monitor query performance
