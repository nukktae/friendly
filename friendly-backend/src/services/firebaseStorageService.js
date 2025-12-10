const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

/**
 * Firebase Storage Service
 * Handles all file uploads to Firebase Storage instead of local disk
 */

/**
 * Get Firebase Storage bucket
 */
function getBucket() {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  const bucket = admin.storage().bucket();
  if (!bucket) {
    throw new Error('Firebase Storage bucket not configured. Set FIREBASE_STORAGE_BUCKET env var.');
  }
  
  return bucket;
}

/**
 * Upload file to Firebase Storage
 * @param {string} filePath - Local file path (temporary file from multer)
 * @param {string} storagePath - Storage path in Firebase (e.g., 'pdfs/userId/fileId.pdf')
 * @param {object} options - Upload options
 * @returns {Promise<{storagePath: string, downloadUrl: string, publicUrl: string}>}
 */
async function uploadFile(filePath, storagePath, options = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const bucket = getBucket();
    const file = bucket.file(storagePath);

    // Determine content type from file extension
    const ext = path.extname(storagePath).toLowerCase();
    const contentTypeMap = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.m4a': 'audio/mp4',
    };
    const contentType = options.contentType || contentTypeMap[ext] || 'application/octet-stream';

    // Upload file to Firebase Storage
    await bucket.upload(filePath, {
      destination: storagePath,
      metadata: {
        contentType,
        metadata: options.metadata || {},
      },
      public: options.public !== false, // Default to public
    });

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    
    // Get signed URL (valid for 1 year by default, or use provided expiration)
    const expirationDate = options.expires 
      ? new Date(Date.now() + (options.expires * 1000)) // If provided in seconds
      : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
    
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expirationDate,
    });

    console.log(`✅ File uploaded to Firebase Storage: ${storagePath}`);
    console.log(`📄 Public URL: ${publicUrl}`);

    return {
      storagePath,
      downloadUrl: signedUrl,
      publicUrl,
    };
  } catch (error) {
    console.error('❌ Error uploading file to Firebase Storage:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete file from Firebase Storage
 * @param {string} storagePath - Storage path in Firebase
 * @returns {Promise<void>}
 */
async function deleteFile(storagePath) {
  try {
    const bucket = getBucket();
    const file = bucket.file(storagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`File not found in Firebase Storage: ${storagePath}`);
      return; // Don't throw error if file doesn't exist
    }

    await file.delete();
    console.log(`✅ Deleted file from Firebase Storage: ${storagePath}`);
  } catch (error) {
    console.error('Error deleting file from Firebase Storage:', error);
    // Don't throw error - file might not exist
    if (error.code !== 404) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

/**
 * Get download URL for a file
 * @param {string} storagePath - Storage path in Firebase
 * @param {number} expiresInMinutes - Expiration time in minutes (default: 60)
 * @returns {Promise<string>}
 */
async function getDownloadURL(storagePath, expiresInMinutes = 60) {
  try {
    const bucket = getBucket();
    const file = bucket.file(storagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('File not found in Firebase Storage');
    }

    // Get signed URL
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expiresInMinutes * 60, // Convert minutes to seconds
    });

    return signedUrl;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw new Error(`Failed to get download URL: ${error.message}`);
  }
}

/**
 * Get public URL for a file (if public)
 * @param {string} storagePath - Storage path in Firebase
 * @returns {string}
 */
function getPublicURL(storagePath) {
  try {
    const bucket = getBucket();
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  } catch (error) {
    console.error('Error getting public URL:', error);
    throw new Error(`Failed to get public URL: ${error.message}`);
  }
}

/**
 * Get file metadata from Firebase Storage
 * @param {string} storagePath - Storage path in Firebase
 * @returns {Promise<Object>}
 */
async function getFileMetadata(storagePath) {
  try {
    const bucket = getBucket();
    const file = bucket.file(storagePath);

    const [metadata] = await file.getMetadata();
    
    return {
      size: parseInt(metadata.size || 0),
      contentType: metadata.contentType || 'application/octet-stream',
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    if (error.code === 404) {
      throw new Error('File not found');
    }
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**
 * Upload PDF to Firebase Storage
 * @param {string} filePath - Local file path
 * @param {string} userId - User ID
 * @param {string} fileId - Unique file ID
 * @param {string} classId - Optional class ID
 * @returns {Promise<{storagePath: string, downloadUrl: string, publicUrl: string}>}
 */
async function uploadPDF(filePath, userId, fileId, classId = null) {
  const fileName = `${fileId}.pdf`;
  const storagePath = classId 
    ? `pdfs/${userId}/${classId}/${fileName}`
    : `pdfs/${userId}/${fileName}`;
  
  return uploadFile(filePath, storagePath, {
    contentType: 'application/pdf',
    public: true,
  });
}

/**
 * Upload profile picture to Firebase Storage
 * @param {string} filePath - Local file path
 * @param {string} userId - User ID
 * @param {string} filename - Filename with extension
 * @returns {Promise<{storagePath: string, downloadUrl: string, publicUrl: string}>}
 */
async function uploadProfilePicture(filePath, userId, filename) {
  const storagePath = `profiles/${userId}/${filename}`;
  
  return uploadFile(filePath, storagePath, {
    public: true,
  });
}

/**
 * Upload post image to Firebase Storage
 * @param {string} filePath - Local file path
 * @param {string} userId - User ID
 * @param {string} filename - Filename with extension
 * @returns {Promise<{storagePath: string, downloadUrl: string, publicUrl: string}>}
 */
async function uploadPostImage(filePath, userId, filename) {
  const storagePath = `posts/${userId}/${filename}`;
  
  return uploadFile(filePath, storagePath, {
    public: true,
  });
}

/**
 * Upload schedule image to Firebase Storage (temporary, but still use cloud storage)
 * @param {string} filePath - Local file path
 * @param {string} userId - User ID
 * @param {string} filename - Filename with extension
 * @returns {Promise<{storagePath: string, downloadUrl: string, publicUrl: string}>}
 */
async function uploadScheduleImage(filePath, userId, filename) {
  const storagePath = `schedules/${userId}/${filename}`;
  
  return uploadFile(filePath, storagePath, {
    public: false, // Temporary files, not public
  });
}

/**
 * Upload GPA requirements image to Firebase Storage (temporary, but still use cloud storage)
 * @param {string} filePath - Local file path
 * @param {string} userId - User ID
 * @param {string} filename - Filename with extension
 * @returns {Promise<{storagePath: string, downloadUrl: string, publicUrl: string}>}
 */
async function uploadGPARequirementImage(filePath, userId, filename) {
  const storagePath = `gpa-requirements/${userId}/${filename}`;
  
  return uploadFile(filePath, storagePath, {
    public: false, // Temporary files, not public
  });
}

/**
 * Upload audio file to Firebase Storage (temporary, but still use cloud storage)
 * @param {string} filePath - Local file path
 * @param {string} userId - User ID
 * @param {string} filename - Filename with extension
 * @returns {Promise<{storagePath: string, downloadUrl: string, publicUrl: string}>}
 */
async function uploadAudioFile(filePath, userId, filename) {
  const storagePath = `audio/${userId}/${filename}`;
  
  return uploadFile(filePath, storagePath, {
    public: false, // Temporary files, not public
  });
}

module.exports = {
  uploadFile,
  deleteFile,
  getDownloadURL,
  getPublicURL,
  getFileMetadata,
  // Specific upload functions
  uploadPDF,
  uploadProfilePicture,
  uploadPostImage,
  uploadScheduleImage,
  uploadGPARequirementImage,
  uploadAudioFile,
};

