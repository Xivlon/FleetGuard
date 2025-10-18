# Fleet Navigation Backend

This is the Express.js backend server for the Fleet Navigation System.

## Configuration

### GraphHopper API Key

The backend uses GraphHopper for route calculation. To enable real road routing instead of straight-line fallback routes:

#### Local Development

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get a free API key from [GraphHopper](https://www.graphhopper.com/)

3. Edit `.env` and add your API key:
   ```
   GRAPHHOPPER_API_KEY=your_actual_key_here
   ```

4. Start the server:
   ```bash
   npm start
   ```

#### Deployment on Render

1. Go to your Render dashboard
2. Select your backend service
3. Navigate to "Environment" tab
4. Add a new environment variable:
   - Key: `GRAPHHOPPER_API_KEY`
   - Value: your actual GraphHopper API key
5. Save changes and redeploy

#### Deployment on Replit

1. Open your Replit project
2. Click on "Secrets" (lock icon in the left sidebar)
3. Add a new secret:
   - Key: `GRAPHHOPPER_API_KEY`
   - Value: your actual GraphHopper API key
4. Restart your Replit

## Testing GraphHopper Configuration

### Check Routing Status

Test if GraphHopper is properly configured and reachable:

```bash
curl http://localhost:5000/api/routing-status
```

Expected responses:

**When key is not configured:**
```json
{
  "configured": false,
  "provider": "graphhopper",
  "reachable": false,
  "message": "No GRAPHHOPPER_API_KEY configured"
}
```

**When key is configured and valid:**
```json
{
  "configured": true,
  "provider": "graphhopper",
  "reachable": true,
  "points": 42
}
```

**When key is configured but invalid or service unreachable:**
```json
{
  "configured": true,
  "provider": "graphhopper",
  "reachable": false,
  "error": "Request failed with status code 401"
}
```

### Test Route Calculation

Calculate a route between two points:

```bash
curl -X POST http://localhost:5000/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "start": {"latitude": 37.7749, "longitude": -122.4194},
    "end": {"latitude": 37.7849, "longitude": -122.4094}
  }'
```

Check the response:
- `fallback: false` - Using GraphHopper (good!)
- `fallback: true` - Using straight-line routing (API key needed)
- Many coordinates in the `coordinates` array indicates real road routing

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/routing-status` - Check GraphHopper configuration and reachability
- `POST /api/routes/calculate` - Calculate a route between two points
- `GET /api/hazards` - Get all hazards
- `POST /api/hazards` - Report a new hazard
- `DELETE /api/hazards/:id` - Remove a hazard
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Add a new vehicle

## Running the Server

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 5000 (or the PORT environment variable if set).

## Environment Variables

- `GRAPHHOPPER_API_KEY` - GraphHopper API key for route calculation (optional, falls back to straight-line routing)
- `PORT` - Server port (default: 5000)
