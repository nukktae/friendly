/**
 * Daily Backup Job
 * Runs Google Drive backup at 3 AM every day
 */
const cron = require('node-cron');
const config = require('../config/app');

function setupBackupJob() {
  if (!config.enableDriveBackup) {
    console.log('⚠️  Drive backup cron job disabled (ENABLE_DRIVE_BACKUP=false)');
    return;
  }

  const { runBackup } = require('../../scripts/backupToDrive');
  
  // Schedule backup at 3 AM daily
  cron.schedule('0 3 * * *', async () => {
    console.log('\n⏰ Scheduled backup triggered at 3 AM');
    try {
      await runBackup();
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error);
    }
  });
  
  console.log('✅ Daily backup scheduled (3 AM)');
  console.log('   Set ENABLE_DRIVE_BACKUP=false to disable');
}

module.exports = { setupBackupJob };

