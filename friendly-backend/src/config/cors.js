/**
 * CORS Configuration
 */
function getCorsOptions() {
  return process.env.NODE_ENV === 'production' 
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
        allowedHeaders: ['Content-Type', 'Content-Type', 'Authorization'],
      };
}

module.exports = { getCorsOptions };

