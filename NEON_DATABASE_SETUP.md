# Neon Database Setup Guide

This guide explains how to connect FleetGuard to your Neon PostgreSQL database and populate it with danger zone waypoints.

## Prerequisites

1. A Neon PostgreSQL database account
2. Your Neon connection string (provided in the format below)

## Connection String Format

The Neon connection string should be in this format:
```
postgresql://neondb_owner:npg_oAN2MKn3yfsr@ep-billowing-resonance-aegg6fic-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Note:** The connection string provided in the issue has been configured in the backend. If your actual connection string differs, update it in the steps below.

## Setup Steps

### 1. Configure Backend Database Connection

Navigate to the backend directory and set your DATABASE_URL:

```bash
cd backend
export DATABASE_URL="postgresql://neondb_owner:npg_oAN2MKn3yfsr@ep-billowing-resonance-aegg6fic-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

Or create a `.env` file in the backend directory:

```bash
echo 'DATABASE_URL=postgresql://neondb_owner:npg_oAN2MKn3yfsr@ep-billowing-resonance-aegg6fic-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require' > .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Seed Danger Zone Waypoints

Run the seed script to populate the database with 25 mock danger zone waypoints (each with 250m radius):

```bash
npm run seed:danger-zones
```

This will:
- Connect to your Neon database
- Create all necessary tables (users, waypoints, etc.)
- Create a system user for data ownership
- Delete any existing danger zone waypoints
- Create 25 new danger zone waypoints across major US cities and highways

### 4. Verify the Setup

You should see output like:
```
=== Danger Zone Waypoints Summary ===
Total waypoints created: 25
Notification radius: 250 meters
System user ID: <uuid>

Sample waypoints:
  1. Golden Gate Bridge Construction (37.7749, -122.4194)
  2. Oakland Port Hazard (37.8044, -122.2712)
  3. San Jose Industrial Zone (37.3541, -121.9552)
  ...
=====================================
```

## Danger Zone Locations

The seed script creates waypoints in the following areas:

### Major Cities
- **San Francisco Bay Area**: 5 waypoints (Golden Gate, Oakland Port, San Jose, Fremont, Richmond)
- **Los Angeles**: 3 waypoints (Downtown, LAX, Pasadena)
- **New York**: 3 waypoints (Manhattan, Times Square, Brooklyn Bridge)
- **Chicago**: 2 waypoints (Loop, O'Hare Airport)
- **Houston**: 2 waypoints (Ship Channel, Warehouse District)
- **Seattle**: 2 waypoints (Waterfront, SeaTac Airport)
- **Phoenix**: 2 waypoints (Downtown, Tempe)
- **Miami**: 2 waypoints (Beach, Port)

### Interstate Highways
- Denver I-70 Mountain Pass
- Las Vegas Desert Route
- Charlotte I-85 Construction
- Dallas I-35 Zone
- Austin I-35 Expansion

## Backend Configuration

The backend has been configured to:
1. Support both `DATABASE_URL` (recommended) and individual DB environment variables
2. Automatically enable SSL for Neon connections (when URL contains `neon.tech`)
3. Use connection pooling for better performance
4. Log database queries in debug mode

## Starting the Backend

Once the database is seeded, start the backend server:

```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend will:
- Connect to your Neon database
- Load all waypoints and make them available via WebSocket
- Serve them to connected mobile clients

## Mobile App Integration

The mobile app will automatically receive the danger zone waypoints when:
1. It connects to the backend via WebSocket
2. The backend sends initial data including waypoints
3. Waypoints are displayed on the map with their 250m notification radius

When a user navigates within 250 meters of a danger zone, they will receive a notification alert.

## Troubleshooting

### Connection Issues

If you get a connection error:
1. Verify your Neon connection string is correct
2. Check that your Neon database is active (not paused)
3. Ensure SSL is enabled (`sslmode=require` in the connection string)
4. Verify network connectivity to `*.neon.tech` domains

### Running the Seed Script Again

The seed script is idempotent - you can run it multiple times. It will:
1. Delete existing danger zone waypoints
2. Create fresh waypoints

This is useful if you want to reset the data.

### Viewing Data in Neon Dashboard

You can view the seeded data in your Neon dashboard:
1. Go to your Neon project
2. Open the SQL Editor
3. Run: `SELECT * FROM waypoints WHERE type = 'danger';`

## Alternative: Local PostgreSQL

If you prefer to test locally first, you can use a local PostgreSQL instance:

```bash
# In .env file
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fleetguard
DB_USER=postgres
DB_PASSWORD=postgres

# Then run the seed script
npm run seed:danger-zones
```

## Next Steps

After seeding the database:
1. Start the backend server: `npm start`
2. Start the mobile app: `cd ../mobile && npm start`
3. The app will start in Navigation mode immediately
4. Danger zones will be visible on the map
5. Users will receive notifications when approaching danger zones (within 250m)
