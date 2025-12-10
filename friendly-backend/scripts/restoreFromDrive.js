const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Google Drive Restore Script
 * 
 * Downloads the latest backup from Google Drive and restores it to uploads/
 */

// Configuration
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const BACKUP_DIR = path.join(__dirname, '..', 'backup');
const DRIVE_FOLDER_NAME = 'friendly_upload_backups';
const RESTORE_ZIP_PATH = path.join(BACKUP_DIR, 'latest.zip');

/**
 * Initialize Google Drive API client
 */
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('Missing Google Drive credentials. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_PROJECT_ID in .env');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Find the backup folder in Google Drive
 */
async function findBackupFolder(drive) {
  try {
    const response = await drive.files.list({
      q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (response.data.files.length === 0) {
      throw new Error(`Backup folder '${DRIVE_FOLDER_NAME}' not found in Google Drive`);
    }

    return response.data.files[0].id;
  } catch (error) {
    console.error('❌ Error finding backup folder:', error);
    throw error;
  }
}

/**
 * Get the latest backup file from Google Drive
 */
async function getLatestBackup(drive, folderId) {
  try {
    console.log('🔍 Searching for latest backup...');

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/zip' and trashed=false`,
      fields: 'files(id, name, createdTime, size)',
      orderBy: 'createdTime desc',
      pageSize: 1,
    });

    const files = response.data.files || [];

    if (files.length === 0) {
      throw new Error('No backup files found in Google Drive');
    }

    const latestBackup = files[0];
    const sizeMB = (parseInt(latestBackup.size || 0) / 1024 / 1024).toFixed(2);
    
    console.log(`✅ Found latest backup: ${latestBackup.name}`);
    console.log(`   Created: ${latestBackup.createdTime}`);
    console.log(`   Size: ${sizeMB} MB`);

    return latestBackup;
  } catch (error) {
    console.error('❌ Error getting latest backup:', error);
    throw error;
  }
}

/**
 * Download file from Google Drive
 */
async function downloadFromDrive(drive, fileId, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading backup file...`);

    // Ensure backup directory exists
    fs.ensureDirSync(BACKUP_DIR);

    const dest = fs.createWriteStream(outputPath);

    drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )
      .then((response) => {
        let downloadedBytes = 0;
        const totalBytes = parseInt(response.headers['content-length'] || 0);

        response.data
          .on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
              process.stdout.write(`\r   Progress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
            }
          })
          .on('end', () => {
            console.log('\n✅ Download complete');
            resolve();
          })
          .on('error', (err) => {
            console.error('\n❌ Download error:', err);
            reject(err);
          })
          .pipe(dest);
      })
      .catch((error) => {
        console.error('❌ Error starting download:', error);
        reject(error);
      });
  });
}

/**
 * Extract ZIP file to uploads directory
 */
async function extractZip(zipPath, extractTo) {
  return new Promise((resolve, reject) => {
    console.log(`📂 Extracting to ${extractTo}...`);

    // Backup existing uploads directory if it exists
    const backupPath = `${extractTo}.backup.${Date.now()}`;
    if (fs.existsSync(extractTo)) {
      console.log(`💾 Backing up existing uploads to ${backupPath}...`);
      fs.moveSync(extractTo, backupPath);
    }

    // Extract to parent directory (ZIP contains 'uploads' folder)
    const extractParent = path.dirname(extractTo);
    fs.ensureDirSync(extractParent);

    // Extract ZIP (contains uploads/ folder structure)
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractParent }))
      .on('close', () => {
        // Verify extraction was successful
        if (!fs.existsSync(extractTo)) {
          // If uploads folder doesn't exist after extraction, something went wrong
          // Try to restore backup
          if (fs.existsSync(backupPath)) {
            console.log(`⚠️  Extraction may have failed, restoring backup...`);
            fs.moveSync(backupPath, extractTo);
            return reject(new Error('Extraction failed: uploads folder not found after extraction'));
          }
          return reject(new Error('Extraction failed: uploads folder not found'));
        }

        console.log('✅ Extraction complete');
        
        // Remove backup after successful extraction
        if (fs.existsSync(backupPath)) {
          console.log(`🗑️  Removing old backup: ${backupPath}`);
          fs.removeSync(backupPath);
        }
        
        resolve();
      })
      .on('error', (err) => {
        console.error('❌ Extraction error:', err);
        
        // Restore backup if extraction failed
        if (fs.existsSync(backupPath)) {
          console.log(`⚠️  Restoring previous uploads from backup...`);
          if (fs.existsSync(extractTo)) {
            fs.removeSync(extractTo);
          }
          fs.moveSync(backupPath, extractTo);
        }
        
        reject(err);
      });
  });
}

/**
 * Main restore function
 */
async function runRestore() {
  const startTime = Date.now();
  console.log('\n🔄 Starting restore from Google Drive...');

  try {
    // Initialize Drive client
    const drive = getDriveClient();

    // Find backup folder
    const folderId = await findBackupFolder(drive);

    // Get latest backup
    const latestBackup = await getLatestBackup(drive, folderId);

    // Download backup
    await downloadFromDrive(drive, latestBackup.id, RESTORE_ZIP_PATH);

    // Extract to uploads directory
    await extractZip(RESTORE_ZIP_PATH, UPLOADS_DIR);

    // Clean up downloaded ZIP (optional)
    try {
      fs.unlinkSync(RESTORE_ZIP_PATH);
      console.log(`🗑️  Cleaned up downloaded ZIP file`);
    } catch (error) {
      console.warn(`⚠️  Could not delete downloaded ZIP: ${error.message}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Restore completed successfully in ${duration}s\n`);

    return { success: true, backupName: latestBackup.name };
  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runRestore()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runRestore };

