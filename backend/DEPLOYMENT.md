# FleetGuard Backend Deployment Guide

This guide covers deploying the FleetGuard backend to Fly.io.

## Prerequisites

1. Install the Fly.io CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Sign up or log in to Fly.io:
   ```bash
   fly auth signup
   # or
   fly auth login
   ```

3. Have your API keys ready:
   - GraphHopper API key (get from https://www.graphhopper.com/)
   - JWT secret (generate a secure random string)

## Initial Deployment

### 1. Navigate to the backend directory

```bash
cd backend
```

### 2. Launch your Fly.io app

```bash
fly launch
```

This will:
- Detect your Dockerfile
- Ask you to choose an app name (e.g., `fleetguard-backend`)
- Ask you to select a region (choose closest to your users)
- Ask if you want to deploy now (say **no** for now)

### 3. Create a PostgreSQL database

Fly.io offers managed PostgreSQL databases:

```bash
fly postgres create
```

Choose:
- Database name (e.g., `fleetguard-db`)
- Region (same as your app)
- Configuration (Development or Production)

After creation, attach the database to your app:

```bash
fly postgres attach <database-name> --app <your-app-name>
```

This will automatically set the `DATABASE_URL` environment variable.

### 4. Set environment variables

Set all required environment variables:

```bash
# Required: GraphHopper API Key
fly secrets set GRAPHHOPPER_API_KEY="your_graphhopper_api_key_here"

# Required: JWT Secret (generate a secure random string)
fly secrets set JWT_SECRET="your_super_secure_jwt_secret_here"

# Optional: CORS origins (comma-separated, include your mobile app domain)
fly secrets set CORS_ORIGINS="https://your-mobile-app.com,https://your-website.com"

# Optional: Traffic API keys (if using TomTom or HERE Maps)
fly secrets set TOMTOM_API_KEY="your_tomtom_api_key"
fly secrets set HERE_API_KEY="your_here_api_key"
```

### 5. Deploy the application

```bash
fly deploy
```

This will:
- Build the Docker image
- Push it to Fly.io
- Deploy it across the selected region(s)
- Run health checks
- Start accepting traffic

### 6. Check deployment status

```bash
fly status
```

View logs:

```bash
fly logs
```

### 7. Open your application

```bash
fly open
```

This will open your app in a browser. Your API will be available at:
- `https://your-app-name.fly.dev`

## Database Management

### Run migrations

The backend automatically syncs the database schema on startup using Sequelize. If you need to run migrations manually:

```bash
fly ssh console
cd /app
node -e "require('./models').syncDatabase()"
exit
```

### Access PostgreSQL directly

```bash
fly postgres connect -a <database-name>
```

## Scaling

### Vertical scaling (increase resources)

Edit `fly.toml`:

```toml
[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 1024
```

Then deploy:

```bash
fly deploy
```

### Horizontal scaling (add more instances)

```bash
fly scale count 2
```

### Auto-scaling

Fly.io supports auto-scaling. Edit `fly.toml`:

```toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
```

## Monitoring

### View metrics

```bash
fly dashboard
```

### View logs

```bash
# Tail logs
fly logs

# View specific timeframe
fly logs --since 1h
```

### Health checks

The app includes a health endpoint at `/api/health`. Fly.io automatically monitors it.

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | Auto-set | Server port | `8080` |
| `DATABASE_URL` | Auto-set | PostgreSQL connection URL | Set by `fly postgres attach` |
| `GRAPHHOPPER_API_KEY` | Yes | GraphHopper routing API key | Get from graphhopper.com |
| `JWT_SECRET` | Yes | Secret for JWT tokens | Random secure string |
| `JWT_EXPIRES_IN` | No | JWT expiration time | `7d` |
| `CORS_ORIGINS` | No | Allowed CORS origins | `https://app.com,https://api.com` |
| `TOMTOM_API_KEY` | No | TomTom traffic API key | For traffic integration |
| `HERE_API_KEY` | No | HERE Maps API key | For traffic integration |
| `LOG_LEVEL` | No | Logging level | `info` |

## Troubleshooting

### App won't start

Check logs:
```bash
fly logs
```

Common issues:
- Missing environment variables (especially `GRAPHHOPPER_API_KEY` or `JWT_SECRET`)
- Database connection issues
- Port binding issues

### Database connection errors

Verify database is attached:
```bash
fly postgres db list -a <database-name>
```

Check `DATABASE_URL` is set:
```bash
fly secrets list
```

### Health check failures

Test the health endpoint:
```bash
curl https://your-app-name.fly.dev/api/health
```

### WebSocket connection issues

Fly.io supports WebSockets by default. Ensure your client connects to:
```
wss://your-app-name.fly.dev/ws
```

## Updating the Application

1. Make your code changes
2. Commit to git
3. Deploy:
   ```bash
   fly deploy
   ```

## Backup and Restore

### Backup PostgreSQL database

```bash
fly postgres db backup -a <database-name>
```

### List backups

```bash
fly postgres db list-backups -a <database-name>
```

### Restore from backup

```bash
fly postgres db restore -a <database-name> <backup-id>
```

## Cost Optimization

Fly.io offers a generous free tier:
- 3 shared-cpu-1x VMs with 256MB RAM
- 3GB persistent volume storage
- 160GB outbound data transfer

For production:
- Use auto-scaling to reduce costs during low traffic
- Monitor usage in the Fly.io dashboard
- Consider using Fly.io's edge caching

## Security Best Practices

1. **Use secrets for sensitive data:**
   ```bash
   fly secrets set SECRET_NAME="value"
   ```

2. **Enable HTTPS only** (configured in `fly.toml`)

3. **Rotate JWT secrets periodically:**
   ```bash
   fly secrets set JWT_SECRET="new_secret"
   fly deploy
   ```

4. **Keep dependencies updated:**
   ```bash
   npm audit
   npm update
   ```

5. **Monitor logs for security issues:**
   ```bash
   fly logs | grep -i "error\|warn\|unauthorized"
   ```

## Support

- Fly.io Documentation: https://fly.io/docs/
- Fly.io Community: https://community.fly.io/
- FleetGuard Issues: https://github.com/your-repo/issues
