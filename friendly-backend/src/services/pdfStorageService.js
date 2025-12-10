const {
  uploadPDF: uploadPDFToFirebase,
  deleteFile: deleteFileFromFirebase,
  getDownloadURL: getDownloadURLFromFirebase,
  getFileMetadata: getFileMetadataFromFirebase,
} = require('./firebaseStorageService');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

/**
 * Upload PDF to Firebase Storage
 * @param {string} filePath - Local file path (already uploaded via multer)
 * @param {string} userId - User ID
 * @param {string} fileId - Unique file ID
 * @param {string} classId - Optional class ID
 * @returns {Promise<{storagePath: string, downloadUrl: string}>}
 */
async function uploadPDF(filePath, userId, fileId, classId = null) {
  try {
    const result = await uploadPDFToFirebase(filePath, userId, fileId, classId);
    
    // Return in the format expected by existing code
    return {
      storagePath: result.storagePath,
      downloadUrl: result.downloadUrl, // Use signed URL for better security
    };
  } catch (error) {
    console.error('❌ Error storing PDF in Firebase Storage:', error);
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
    return await getDownloadURLFromFirebase(storagePath, 60); // 60 minutes expiration
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw new Error(`Failed to get download URL: ${error.message}`);
  }
}

/**
 * Get signed URL for PDF (temporary access)
 * @param {string} storagePath - Storage path
 * @param {number} expiresInMinutes - Expiration time in minutes (default: 60)
 * @returns {Promise<string>}
 */
async function getSignedURL(storagePath, expiresInMinutes = 60) {
  try {
    return await getDownloadURLFromFirebase(storagePath, expiresInMinutes);
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
}

/**
 * Delete PDF from Firebase Storage
 * @param {string} storagePath - Storage path
 * @returns {Promise<void>}
 */
async function deletePDF(storagePath) {
  try {
    await deleteFileFromFirebase(storagePath);
    console.log(`✅ Deleted PDF from Firebase Storage: ${storagePath}`);
  } catch (error) {
    console.error('Error deleting PDF from Firebase Storage:', error);
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}

/**
 * Get file metadata from Firebase Storage
 * @param {string} storagePath - Storage path
 * @returns {Promise<Object>}
 */
async function getFileMetadata(storagePath) {
  try {
    return await getFileMetadataFromFirebase(storagePath);
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**
 * Download PDF from Firebase Storage to temporary local file
 * Used for operations that need local file access (e.g., text extraction, analysis)
 * @param {string} storagePath - Storage path in Firebase
 * @param {number} expiresInMinutes - URL expiration time (default: 60)
 * @returns {Promise<string>} - Path to temporary local file
 */
async function downloadPDFToTemp(storagePath, expiresInMinutes = 60) {
  try {
    // Get download URL from Firebase Storage
    const downloadUrl = await getDownloadURLFromFirebase(storagePath, expiresInMinutes);
    
    // Create temp file path
    const tempDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${path.basename(storagePath)}`);
    
    // Download file
    return new Promise((resolve, reject) => {
      const protocol = downloadUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(tempFilePath);
      
      protocol.get(downloadUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(tempFilePath);
        });
        
        file.on('error', (err) => {
          fs.unlinkSync(tempFilePath); // Delete temp file on error
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading PDF from Firebase Storage:', error);
    throw new Error(`Failed to download PDF: ${error.message}`);
  }
}

module.exports = {
  uploadPDF,
  getDownloadURL,
  getSignedURL,
  deletePDF,
  getFileMetadata,
  downloadPDFToTemp,
};

