const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedule', require('./routes/schedules'));
app.use('/api/calendar', require('./routes/calendar'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces
app.listen(PORT, HOST, () => {
  console.log(`Backend server listening on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://98.90.205.107:${PORT}`);
});


