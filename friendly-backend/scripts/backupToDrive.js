const { google } = require('googleapis');
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Google Drive Backup Script
 * 
 * Compresses the uploads/ folder and uploads it to Google Drive
 * Keeps only the latest 7 backups
 */

// Configuration
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const BACKUP_DIR = path.join(__dirname, '..', 'backup');
const DRIVE_FOLDER_NAME = 'friendly_upload_backups';
const MAX_BACKUPS = 7;

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
 * Find or create the backup folder in Google Drive
 */
async function getOrCreateBackupFolder(drive) {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (response.data.files.length > 0) {
      console.log(`✅ Found existing backup folder: ${response.data.files[0].id}`);
      return response.data.files[0].id;
    }

    // Create new folder
    const folderResponse = await drive.files.create({
      requestBody: {
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    console.log(`✅ Created backup folder: ${folderResponse.data.id}`);
    return folderResponse.data.id;
  } catch (error) {
    console.error('❌ Error getting/creating backup folder:', error);
    throw error;
  }
}

/**
 * Compress uploads folder to ZIP
 */
async function compressUploadsFolder() {
  return new Promise((resolve, reject) => {
    // Ensure backup directory exists
    fs.ensureDirSync(BACKUP_DIR);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const zipFileName = `uploads_${timestamp}.zip`;
    const zipFilePath = path.join(BACKUP_DIR, zipFileName);

    console.log(`📦 Compressing uploads folder to ${zipFileName}...`);

    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Compression complete: ${sizeMB} MB`);
      resolve({ zipFilePath, zipFileName, size: archive.pointer() });
    });

    archive.on('error', (err) => {
      console.error('❌ Compression error:', err);
      reject(err);
    });

    archive.pipe(output);

    // Check if uploads directory exists and has content
    if (!fs.existsSync(UPLOADS_DIR)) {
      console.warn('⚠️  Uploads directory does not exist, creating empty backup...');
      fs.ensureDirSync(UPLOADS_DIR);
    }

    // Add entire uploads directory to archive
    // The 'uploads' folder name will be preserved in the ZIP
    archive.directory(UPLOADS_DIR, 'uploads');

    archive.finalize();
  });
}

/**
 * Upload ZIP file to Google Drive
 */
async function uploadToDrive(drive, folderId, zipFilePath, zipFileName) {
  try {
    console.log(`📤 Uploading ${zipFileName} to Google Drive...`);

    const fileMetadata = {
      name: zipFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(zipFilePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, size, createdTime',
    });

    const sizeMB = (parseInt(response.data.size || 0) / 1024 / 1024).toFixed(2);
    console.log(`✅ Upload complete: ${response.data.name} (${sizeMB} MB)`);
    console.log(`   File ID: ${response.data.id}`);
    console.log(`   Created: ${response.data.createdTime}`);

    return response.data;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

/**
 * Delete old backups, keeping only the latest N
 */
async function cleanupOldBackups(drive, folderId) {
  try {
    console.log(`🧹 Cleaning up old backups (keeping latest ${MAX_BACKUPS})...`);

    // List all files in backup folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/zip' and trashed=false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
    });

    const files = response.data.files || [];

    if (files.length <= MAX_BACKUPS) {
      console.log(`✅ No cleanup needed (${files.length} backups, max: ${MAX_BACKUPS})`);
      return;
    }

    // Delete files beyond the limit
    const filesToDelete = files.slice(MAX_BACKUPS);
    console.log(`🗑️  Deleting ${filesToDelete.length} old backup(s)...`);

    for (const file of filesToDelete) {
      try {
        await drive.files.delete({ fileId: file.id });
        console.log(`   ✅ Deleted: ${file.name}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete ${file.name}:`, error.message);
      }
    }

    console.log(`✅ Cleanup complete. ${MAX_BACKUPS} backups retained.`);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    // Don't throw - cleanup failure shouldn't fail the backup
  }
}

/**
 * Main backup function
 */
async function runBackup() {
  const startTime = Date.now();
  console.log('\n🚀 Starting Google Drive backup...');
  console.log(`📁 Source: ${UPLOADS_DIR}`);
  console.log(`📦 Backup dir: ${BACKUP_DIR}`);

  try {
    // Initialize Drive client
    const drive = getDriveClient();

    // Get or create backup folder
    const folderId = await getOrCreateBackupFolder(drive);

    // Compress uploads folder
    const { zipFilePath, zipFileName } = await compressUploadsFolder();

    // Upload to Drive
    await uploadToDrive(drive, folderId, zipFilePath, zipFileName);

    // Clean up old backups
    await cleanupOldBackups(drive, folderId);

    // Clean up local ZIP file (optional - comment out if you want to keep local copies)
    try {
      fs.unlinkSync(zipFilePath);
      console.log(`🗑️  Cleaned up local ZIP file: ${zipFileName}`);
    } catch (error) {
      console.warn(`⚠️  Could not delete local ZIP: ${error.message}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Backup completed successfully in ${duration}s\n`);

    return { success: true, zipFileName };
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBackup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runBackup };

