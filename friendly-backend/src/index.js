const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const config = require('./config/app');
const { getCorsOptions } = require('./config/cors');
const { setupStaticFiles } = require('./middlewares/staticFiles');
const errorHandler = require('./middlewares/errorHandler');
const { setupBackupJob } = require('./jobs/backupJob');

// Load environment variables
dotenv.config();

const app = express();

// CORS
app.use(cors(getCorsOptions()));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files (deprecated - for backward compatibility)
setupStaticFiles(app);

// Health check endpoint (should be before other routes)
app.get('/api/health', (req, res) => {
  const os = require('os');
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime)
    },
    server: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname()
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
    },
    environment: {
      nodeEnv: config.nodeEnv,
      port: config.port,
      host: config.host
    }
  });
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedule', require('./routes/schedules'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/community', require('./routes/community'));
app.use('/api/documents', require('./routes/document'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/pdfs', require('./routes/pdfs'));
app.use('/api/transcribe', require('./routes/transcribe'));
app.use('/api/gpa', require('./routes/gpa'));

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "API key not configured" });

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get reply from OpenAI" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Setup scheduled jobs
setupBackupJob();

// Helper function to get network IPs
function getNetworkIPs() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

// Start server
app.listen(config.port, config.host, () => {
  const networkIPs = getNetworkIPs();
  console.log(`✅ Server running on http://localhost:${config.port}`);
  console.log(`🌐 Server listening on ${config.host}:${config.port}`);
  
  if (networkIPs.length > 0) {
    console.log(`📡 Server accessible on network at:`);
    networkIPs.forEach(ip => {
      console.log(`   - http://${ip}:${config.port}`);
    });
  } else {
    console.log(`⚠️  No network interfaces found`);
  }
});

module.exports = app;

