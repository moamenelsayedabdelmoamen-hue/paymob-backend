/**
 * Global error handling middleware
 * Catches all errors from routes and controllers
 */
module.exports = (err, req, res, next) => {
  console.error('🚨 Error:', err.message);

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.response) {
    // Axios error response from external API
    statusCode = err.response.status || 500;
    message = err.response.data?.detail || err.message;
  }

  // Log full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
