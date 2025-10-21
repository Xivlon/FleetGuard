# FleetGuard Backend - Validation, Security, and Health Features

## Overview

This document describes the validation, security headers, CORS configuration, and health/version endpoints implemented in the FleetGuard backend.

## Features

### 1. Request Validation

All API endpoints that accept user input now include strict validation using Zod schemas:

- **Route Calculations** (`POST /api/routes/calculate`)
  - Validates start/end coordinates (latitude: -90 to 90, longitude: -180 to 180)
  - Rejects NaN, null, or invalid coordinate values
  - Returns 400 status with helpful error messages
  
- **Hazard Creation** (`POST /api/hazards`)
  - Validates hazard type, location coordinates, and severity
  - Ensures proper data types and ranges

- **Vehicle Position Updates** (WebSocket `vehicle:position`)
  - Validates vehicleId (UUID format)
  - Validates coordinates and heading (0-360 degrees)
  - Sends error messages back to client on validation failure

#### Example Validation Errors

```bash
# Invalid latitude
curl -X POST http://localhost:5555/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{"start": {"latitude": 200, "longitude": -122}, "end": {"latitude": 37, "longitude": -122}}'

# Response:
{
  "error": "Validation failed",
  "details": "start.latitude: Latitude must be between -90 and 90 degrees"
}
```

### 2. Security Headers

Helmet middleware is enabled with the following security headers:

- `Strict-Transport-Security`: Enforces HTTPS
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-Frame-Options`: Prevents clickjacking
- `X-DNS-Prefetch-Control`: Controls DNS prefetching
- `X-Download-Options`: Prevents file downloads in IE
- `X-Permitted-Cross-Domain-Policies`: Controls Flash/PDF cross-domain policies
- `Content-Security-Policy`: Restricts resource loading (enabled in production)

**Note**: CSP is disabled in development mode (`NODE_ENV=development`) to avoid conflicts with dev tools.

### 3. Rate Limiting

Route calculation endpoints are rate-limited to prevent abuse:

- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Standard RateLimit headers included in responses
- **Response**: 429 status code when limit exceeded

```bash
# Rate limit headers
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 900
```

### 4. CORS Configuration

CORS is configurable via the `CORS_ORIGINS` environment variable:

```bash
# .env example
CORS_ORIGINS=http://localhost:3000,http://localhost:19006,exp://localhost:19000
```

- Unknown origins are blocked with 500 error in production
- Configured origins receive proper `Access-Control-Allow-Origin` header
- Credentials are supported for allowed origins

### 5. Health and Version Endpoints

#### `/healthz` - Fast Health Check

Quick liveness check with no dependency verification.

```bash
curl http://localhost:5555/healthz

# Response:
{
  "status": "ok",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

#### `/readyz` - Readiness Check

Comprehensive check including external dependencies:

```bash
curl http://localhost:5555/readyz

# Response:
{
  "status": "ok",
  "timestamp": "2025-10-21T12:00:00.000Z",
  "checks": {
    "server": "ok",
    "websocket": "ok",
    "graphhopper": "ok" | "not_configured" | "degraded"
  }
}
```

Returns 503 status if any check fails.

#### `/version` - Version Metadata

Displays build and version information:

```bash
curl http://localhost:5555/version

# Response:
{
  "version": "1.0.0",
  "commitSha": "abc123def456",
  "buildTime": "2025-10-21T10:00:00.000Z",
  "nodeVersion": "v20.19.5"
}
```

### 6. Environment Variables

All sensitive configuration is managed via environment variables:

```bash
# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:19006,exp://localhost:19000

# Version metadata (set by build process)
COMMIT_SHA=abc123def456
BUILD_TIME=2025-10-21T10:00:00.000Z

# Node environment
NODE_ENV=production  # or development
```

## Testing

Run the test script to verify all features:

```bash
cd backend
PORT=5555 node index.js &
bash test-features.sh
```

## Security Considerations

1. **No secrets in code**: All configuration via environment variables
2. **Input validation**: All user inputs validated and sanitized
3. **Rate limiting**: Prevents abuse of route calculation endpoints
4. **CORS**: Strict origin allowlisting in production
5. **Security headers**: Comprehensive security headers via Helmet
6. **Graceful degradation**: Health checks report degraded state rather than failing completely

## Dependencies Added

- `zod` (v3.24.1): Schema validation
- `helmet` (v8.0.0): Security headers
- `express-rate-limit` (v7.5.0): Rate limiting

All dependencies checked for vulnerabilities via GitHub Advisory Database.
