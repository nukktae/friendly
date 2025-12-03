const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config();
const app = express();

// Configure CORS to allow requests from frontend
// In development, allow all origins for mobile device access via QR code
const corsOptions = process.env.NODE_ENV === 'production' 
  ? {
      origin: ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }
  : {
      origin: true, // Allow all origins in development (for QR code access)
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory with proper headers for mobile access
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper Content-Type for PDFs
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
    // Allow CORS for static files (needed for mobile access)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Cache control for better performance
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

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
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  console.error('Error stack:', err.stack);
  
  // Don't send HTML error pages, always send JSON
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 4000;
// Listen on all network interfaces (0.0.0.0) to allow access from mobile devices
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server accessible on network at http://192.168.219.101:${PORT}`);
});
