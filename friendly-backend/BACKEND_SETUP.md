# Backend Server Setup Guide

This guide covers how to start and keep your backend server running for both development and production environments.

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- Firebase credentials configured (see `.env` file)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd friendly-backend
npm install
```

### 2. Configure Environment Variables

Make sure your `.env` file is set up with:
- `PORT` (optional, defaults to 4000)
- `HOST` (optional, defaults to 0.0.0.0)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (required for Firestore)

### 3. Start the Server

**Development (with auto-restart):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

---

## 💻 Local Development Setup

### Option 1: Using Nodemon (Recommended for Development)

Nodemon automatically restarts the server when you make code changes.

```bash
# Start with auto-restart
npm run dev

# The server will restart automatically when you save files
```

**Benefits:**
- ✅ Auto-restarts on file changes
- ✅ Great for development
- ✅ No additional setup needed

**Limitations:**
- ❌ Stops when you close the terminal
- ❌ Not suitable for production

### Option 2: Using PM2 (Development + Production)

PM2 keeps your server running even after closing the terminal and can auto-restart on crashes.

#### Install PM2 globally:
```bash
npm install -g pm2
```

#### Start the server with PM2:
```bash
# Start the server
pm2 start server.js --name friendly-backend

# Or use the npm script
npm run pm2:start
```

#### Useful PM2 Commands:
```bash
# View running processes
pm2 list

# View logs
pm2 logs friendly-backend

# Stop the server
pm2 stop friendly-backend

# Restart the server
pm2 restart friendly-backend

# Delete the process
pm2 delete friendly-backend

# Monitor CPU/Memory usage
pm2 monit

# Save PM2 process list (so it auto-starts on reboot)
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### Auto-restart on file changes (Development):
```bash
pm2 start server.js --name friendly-backend --watch
```

---

## 🌐 Production Deployment Setup

### Option 1: PM2 (Recommended for VPS/Cloud Servers)

PM2 is perfect for production as it:
- Keeps the server running 24/7
- Auto-restarts on crashes
- Handles multiple processes
- Provides monitoring and logging

#### Setup Steps:

1. **Install PM2 globally:**
```bash
npm install -g pm2
```

2. **Start with PM2 ecosystem file:**
```bash
pm2 start ecosystem.config.js
```

3. **Save PM2 configuration:**
```bash
pm2 save
```

4. **Setup PM2 to start on system reboot:**
```bash
pm2 startup
# Follow the instructions it provides
```

5. **Monitor your server:**
```bash
pm2 status
pm2 logs friendly-backend
pm2 monit
```

#### PM2 Ecosystem Configuration

The `ecosystem.config.js` file is already configured with:
- Production environment variables
- Auto-restart on crashes
- Log file management
- Memory limits

### Option 2: Docker (Alternative)

If you prefer Docker, create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

Then run:
```bash
docker build -t friendly-backend .
docker run -d -p 4000:4000 --name friendly-backend --restart always friendly-backend
```

### Option 3: Hosting Services

#### Heroku:
```bash
# Install Heroku CLI, then:
heroku create your-app-name
git push heroku main
```

#### Railway:
1. Connect your GitHub repo
2. Railway auto-detects Node.js
3. Set environment variables in dashboard
4. Deploy automatically on push

#### Render:
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables

#### DigitalOcean App Platform:
1. Create new app from GitHub
2. Select Node.js
3. Configure environment variables
4. Deploy

---

## 📝 Available NPM Scripts

```bash
# Development (with auto-restart via nodemon)
npm run dev

# Production (standard Node.js)
npm start

# PM2 - Start server
npm run pm2:start

# PM2 - Stop server
npm run pm2:stop

# PM2 - Restart server
npm run pm2:restart

# PM2 - View logs
npm run pm2:logs

# PM2 - Delete process
npm run pm2:delete
```

---

## 🔧 Troubleshooting

### Server won't start

1. **Check if port is already in use:**
```bash
# macOS/Linux
lsof -i :4000
# Kill the process if needed
kill -9 <PID>

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

2. **Check environment variables:**
```bash
# Make sure .env file exists and has required variables
cat .env
```

3. **Check Firebase credentials:**
```bash
# Verify FIREBASE_SERVICE_ACCOUNT_JSON is set
echo $FIREBASE_SERVICE_ACCOUNT_JSON
```

### PM2 issues

1. **PM2 process not starting:**
```bash
pm2 logs friendly-backend --lines 50
```

2. **PM2 not persisting after reboot:**
```bash
pm2 startup
pm2 save
```

3. **Clear PM2 logs:**
```bash
pm2 flush
```

### Port already in use

Change the port in `.env`:
```
PORT=4001
```

Or kill the process using the port (see above).

---

## 📊 Monitoring & Logs

### PM2 Monitoring:
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs friendly-backend

# View specific number of lines
pm2 logs friendly-backend --lines 100
```

### Health Check:
```bash
# Test if server is running
curl http://localhost:4000/health

# Should return: {"status":"ok"}
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Keep dependencies updated:**
```bash
npm audit
npm audit fix
```
4. **Use HTTPS in production** (via reverse proxy like Nginx)
5. **Set up firewall rules** on your server
6. **Use PM2 in production** for process management

---

## 🚀 Quick Reference

### Development:
```bash
npm run dev
```

### Production (PM2):
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Check Status:
```bash
pm2 status
curl http://localhost:4000/health
```

### View Logs:
```bash
pm2 logs friendly-backend
```

### Restart:
```bash
pm2 restart friendly-backend
```

---

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)

