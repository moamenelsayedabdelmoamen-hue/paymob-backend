/**
 * Configuration Module
 * Centralized configuration for the application
 * Loads from environment variables using dotenv
 */

require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production'
  },

  // Paymob API Configuration
  paymob: {
    apiUrl: process.env.PAYMOB_API_URL || 'https://accept.paymobsolutions.com/api',
    apiKey: process.env.PAYMOB_API_KEY,
    merchantId: process.env.PAYMOB_MERCHANT_ID,
    iframeId: process.env.PAYMOB_IFRAME_ID,
    
    // Validate required Paymob settings
    validate() {
      if (!this.apiKey) {
        throw new Error('PAYMOB_API_KEY is not configured');
      }
      if (!this.merchantId) {
        console.warn('⚠️ Warning: PAYMOB_MERCHANT_ID is not configured');
      }
      if (!this.iframeId) {
        throw new Error('PAYMOB_IFRAME_ID is not configured');
      }
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
  },

  // API Configuration
  api: {
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 1000 // 1 second
  }
};

// Validate configuration on load
try {
  config.paymob.validate();
  console.log('✅ Configuration validated successfully');
} catch (error) {
  console.error('❌ Configuration Error:', error.message);
  if (config.server.isProduction) {
    process.exit(1);
  }
}

module.exports = config;
