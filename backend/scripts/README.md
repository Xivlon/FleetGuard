# Database Seed Scripts

This directory contains scripts to populate the database with test/mock data.

## Danger Zone Seeding

The `seedDangerZones.js` script populates the database with mock danger zone waypoints across various US cities and highways.

### Features:
- Creates 25 danger zone waypoints
- Each waypoint has a 250-meter notification radius
- Covers major cities: San Francisco, Los Angeles, New York, Chicago, Houston, Seattle, Phoenix, Miami
- Includes interstate highway danger zones
- Creates a system user for data ownership

### Usage:

1. Ensure your database is configured (set `DATABASE_URL` or individual DB environment variables in `.env`)

2. Run the seed script:
   ```bash
   npm run seed:danger-zones
   ```

3. The script will:
   - Connect to the database
   - Create tables if they don't exist
   - Delete existing danger zone waypoints
   - Create new danger zone waypoints
   - Display a summary of created waypoints

### Database Connection:

The script supports two connection methods:

**Option 1: Using DATABASE_URL (recommended for Neon/Fly.io)**
```bash
export DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
npm run seed:danger-zones
```

**Option 2: Using individual environment variables**
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=fleetguard
export DB_USER=postgres
export DB_PASSWORD=postgres
npm run seed:danger-zones
```

### For Neon Database:

```bash
# Set the Neon connection string
export DATABASE_URL="postgresql://neondb_owner:npg_oAN2MKn3yfsr@ep-billowing-resonance-aegg6fic-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Run the seed script
cd backend
npm run seed:danger-zones
```

### Notes:
- The script is idempotent - it deletes existing danger zone waypoints before creating new ones
- A system user (`system@fleetguard.internal`) is created to own the waypoints
- All waypoints are marked as public and visible to all users
- Each waypoint includes metadata about when it was seeded
