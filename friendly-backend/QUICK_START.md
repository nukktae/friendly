# Quick Start Guide

## 🚀 Start the Server

### Development (Auto-restart on file changes):
```bash
npm run dev
```

### Production:
```bash
npm start
```

### Production with PM2 (Keeps running 24/7):
```bash
# Install PM2 globally (first time only)
npm install -g pm2

# Start the server
npm run pm2:start

# Save PM2 config (so it persists after reboot)
pm2 save

# Setup auto-start on system boot (run the command PM2 provides)
# Or use the setup script:
./setup-auto-start.sh
```

## 📋 Common Commands

```bash
# Development
npm run dev              # Start with auto-restart

# Production
npm start                # Start normally
npm run pm2:start        # Start with PM2
npm run pm2:stop         # Stop PM2
npm run pm2:restart      # Restart PM2
npm run pm2:logs         # View logs

# Health Check
curl http://localhost:4000/health
```

## 🔍 Check if Server is Running

```bash
# Check PM2 status
pm2 status

# Check if port is in use
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Test health endpoint
curl http://localhost:4000/health
```

## 📚 Full Documentation

See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for complete setup instructions.

