const fs = require('fs');
const path = require('path');

// Use local file storage instead of Firebase Storage
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE !== 'false'; // Default to true

/**
 * Get the base URL for serving files
 */
function getBaseUrl() {
  const port = process.env.PORT || 4000;
  const host = process.env.HOST || 'localhost';
  return `http://${host}:${port}`;
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Upload PDF to local file storage
 * @param {string} filePath - Local file path (already uploaded via multer)
 * @param {string} userId - User ID
 * @param {string} fileId - Unique file ID
 * @param {string} classId - Optional class ID
 * @returns {Promise<{storagePath: string, downloadUrl: string}>}
 */
async function uploadPDF(filePath, userId, fileId, classId = null) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create organized directory structure: uploads/pdfs/{userId}/{classId?}/
    const baseDir = path.join(__dirname, '../uploads/pdfs');
    const userDir = path.join(baseDir, userId);
    const finalDir = classId ? path.join(userDir, classId) : userDir;
    
    ensureDirectoryExists(finalDir);

    // Move file to final location
    const fileName = `${fileId}.pdf`;
    const finalPath = path.join(finalDir, fileName);
    
    // Copy file to final location (keep original for now, will be cleaned up by route handler)
    fs.copyFileSync(filePath, finalPath);
    
    // Create relative path for storage (used in database)
    const storagePath = classId 
      ? `pdfs/${userId}/${classId}/${fileName}`
      : `pdfs/${userId}/${fileName}`;
    
    // Generate download URL pointing to Express static file server
    const baseUrl = getBaseUrl();
    const downloadUrl = `${baseUrl}/uploads/${storagePath}`;

    console.log(`✅ PDF stored locally at ${storagePath}`);
    console.log(`📄 Download URL: ${downloadUrl}`);

    return {
      storagePath,
      downloadUrl,
    };
  } catch (error) {
    console.error('❌ Error storing PDF locally:', error);
    throw new Error(`Failed to store PDF: ${error.message}`);
  }
}

/**
 * Get download URL for PDF
 * @param {string} storagePath - Storage path
 * @returns {Promise<string>}
 */
async function getDownloadURL(storagePath) {
  try {
    const filePath = path.join(__dirname, '../uploads', storagePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage');
    }

    // Generate URL pointing to Express static file server
    const baseUrl = getBaseUrl();
    return `${baseUrl}/uploads/${storagePath}`;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw new Error(`Failed to get download URL: ${error.message}`);
  }
}

/**
 * Get signed URL for PDF (temporary access) - same as regular URL for local storage
 * @param {string} storagePath - Storage path
 * @param {number} expiresInMinutes - Expiration time in minutes (default: 60) - ignored for local storage
 * @returns {Promise<string>}
 */
async function getSignedURL(storagePath, expiresInMinutes = 60) {
  // For local storage, signed URLs are the same as regular URLs
  return getDownloadURL(storagePath);
}

/**
 * Delete PDF from local storage
 * @param {string} storagePath - Storage path
 * @returns {Promise<void>}
 */
async function deletePDF(storagePath) {
  try {
    const filePath = path.join(__dirname, '../uploads', storagePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found in storage: ${storagePath}`);
      return; // Don't throw error if file doesn't exist
    }

    fs.unlinkSync(filePath);
    console.log(`✅ Deleted PDF from local storage: ${storagePath}`);
    
    // Try to clean up empty directories
    const dirPath = path.dirname(filePath);
    try {
      const files = fs.readdirSync(dirPath);
      if (files.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`🗑️  Removed empty directory: ${dirPath}`);
      }
    } catch (dirError) {
      // Ignore directory cleanup errors
    }
  } catch (error) {
    console.error('Error deleting PDF from local storage:', error);
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}

/**
 * Get file metadata from local storage
 * @param {string} storagePath - Storage path
 * @returns {Promise<Object>}
 */
async function getFileMetadata(storagePath) {
  try {
    const filePath = path.join(__dirname, '../uploads', storagePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    
    const stats = fs.statSync(filePath);
    
    return {
      size: stats.size,
      contentType: 'application/pdf',
      timeCreated: stats.birthtime.toISOString(),
      updated: stats.mtime.toISOString(),
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

module.exports = {
  uploadPDF,
  getDownloadURL,
  getSignedURL,
  deletePDF,
  getFileMetadata,
};

