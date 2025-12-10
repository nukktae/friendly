/**
 * Static File Serving Middleware
 * DEPRECATED: Files are now stored in Firebase Storage
 */
const express = require('express');
const path = require('path');
const config = require('../config/app');

function setupStaticFiles(app) {
  if (config.enableLocalUploads) {
    console.warn('⚠️  WARNING: Local uploads directory serving is enabled. This should be disabled in production.');
    app.use('/uploads', express.static(config.uploadsPath, {
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
  } else {
    // Return 404 for old upload URLs (files are now in Firebase Storage)
    app.use('/uploads', (req, res) => {
      res.status(404).json({
        error: 'File not found',
        message: 'Files are now stored in Firebase Storage. Please use the download URL from the API.',
      });
    });
  }
}

module.exports = { setupStaticFiles };

