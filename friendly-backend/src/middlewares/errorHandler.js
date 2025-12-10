/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Global error handler:', err);
  console.error('Error stack:', err.stack);
  
  // Don't send HTML error pages, always send JSON
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;

