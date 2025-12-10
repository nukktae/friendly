/**
 * Application Configuration
 */
const path = require('path');

const config = {
  port: process.env.PORT || 4000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Paths
  rootPath: path.join(__dirname, '..', '..'),
  uploadsPath: path.join(__dirname, '..', '..', 'uploads'),
  backupPath: path.join(__dirname, '..', '..', 'backup'),
  
  // Feature flags
  enableLocalUploads: process.env.ENABLE_LOCAL_UPLOADS === 'true',
  enableDriveBackup: process.env.ENABLE_DRIVE_BACKUP !== 'false',
};

module.exports = config;

