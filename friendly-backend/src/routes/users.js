const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  listUsers,
} = require('../services/firestoreService');
const {
  uploadProfilePicture,
  deleteFile: deleteFileFromFirebase,
} = require('../services/firebaseStorageService');

// Configure multer for profile picture uploads
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uid = req.params.uid;
    const ext = path.extname(file.originalname);
    cb(null, `profile_${uid}_${Date.now()}${ext}`);
  },
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile pictures
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files (jpg, jpeg, png, gif, webp) are allowed.'));
    }
  },
});

// Create/merge user profile
router.post('/:uid/profile', async (req, res) => {
  try {
    await createUserProfile(req.params.uid, req.body);
    const profile = await getUserProfile(req.params.uid);
    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile,
    });
  } catch (e) {
    console.error('Create profile error:', e);
    res.status(500).json({ error: e.message || 'Failed to create profile' });
  }
});

// Get profile
router.get('/:uid/profile', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.uid);
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile not found' 
      });
    }
    res.json({
      success: true,
      profile,
    });
  } catch (e) {
    console.error('Get profile error:', e);
    res.status(500).json({ 
      success: false,
      error: e.message || 'Failed to get profile' 
    });
  }
});

// Update profile
router.patch('/:uid/profile', async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    // Check if profile exists
    const existingProfile = await getUserProfile(uid);
    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }
    
    await updateUserProfile(uid, updates);
    const updatedProfile = await getUserProfile(uid);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (e) {
    console.error('Update profile error:', e);
    res.status(500).json({ 
      success: false,
      error: e.message || 'Failed to update profile' 
    });
  }
});

// Add/Update nickname
router.post('/:uid/profile/nickname', async (req, res) => {
  try {
    const { uid } = req.params;
    const { nickname } = req.body;
    
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nickname is required and must be a non-empty string',
      });
    }
    
    // Check if profile exists
    const existingProfile = await getUserProfile(uid);
    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Please create a profile first.',
      });
    }
    
    // Update nickname
    await updateUserProfile(uid, {
      nickname: nickname.trim(),
    });
    
    const updatedProfile = await getUserProfile(uid);
    
    res.json({
      success: true,
      message: 'Nickname updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Update nickname error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update nickname',
    });
  }
});

// Upload profile picture
router.post('/:uid/profile/picture', (req, res, next) => {
  // Log request details for debugging
  console.log('Profile picture upload request received');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body));
  console.log('Files:', req.files);
  console.log('File:', req.file);
  
  profilePictureUpload.single('picture')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 5MB.',
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
        });
      }
      // Handle other errors (e.g., file type validation)
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed',
      });
    }
    console.log('Multer processed file:', req.file);
    next();
  });
}, async (req, res) => {
  try {
    const { uid } = req.params;
    
    console.log('After multer - req.file:', req.file);
    console.log('After multer - req.files:', req.files);
    console.log('After multer - req.body:', req.body);
    
    if (!req.file) {
      console.error('No file received in req.file');
      return res.status(400).json({
        success: false,
        error: 'Profile picture file is required',
      });
    }
    
    // Check if profile exists
    const existingProfile = await getUserProfile(uid);
    if (!existingProfile) {
      // Clean up uploaded file if profile doesn't exist
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Please create a profile first.',
      });
    }
    
    // Delete old profile picture if it exists
    if (existingProfile.profilePicture) {
      // Check if it's a Firebase Storage path or old local path
      if (existingProfile.profilePicture.startsWith('profiles/')) {
        // Firebase Storage path
        try {
          await deleteFileFromFirebase(existingProfile.profilePicture);
        } catch (error) {
          console.error('Error deleting old profile picture from Firebase:', error);
          // Continue even if old picture deletion fails
        }
      } else if (existingProfile.profilePicture.startsWith('/uploads/profiles/')) {
        // Old local path - try to delete from Firebase Storage
        const oldStoragePath = existingProfile.profilePicture.replace('/uploads/', '');
        try {
          await deleteFileFromFirebase(oldStoragePath);
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
          // Continue even if old picture deletion fails
        }
      }
    }
    
    // Upload to Firebase Storage
    const filename = req.file.filename || path.basename(req.file.path);
    const { storagePath, downloadUrl, publicUrl } = await uploadProfilePicture(
      req.file.path,
      uid,
      filename
    );
    
    // Use public URL if available, otherwise use signed URL
    const pictureUrl = publicUrl || downloadUrl;
    
    console.log('Updating profile with picture URL:', pictureUrl);
    console.log('File details:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
    
    // Update profile with new picture URL
    try {
      await updateUserProfile(uid, {
        profilePicture: pictureUrl,
      });
      console.log('Profile updated successfully');
    } catch (updateError) {
      console.error('Error updating profile:', updateError);
      console.error('Update error stack:', updateError.stack);
      // Clean up uploaded file if profile update fails
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up uploaded file:', unlinkError);
        }
      }
      throw updateError;
    }
    
    const updatedProfile = await getUserProfile(uid);
    
    if (!updatedProfile) {
      console.error('Profile not found after update');
      throw new Error('Profile not found after update');
    }
    
    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profile: updatedProfile,
      profilePictureUrl: pictureUrl,
      pictureUrl: pictureUrl,
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    // Clean up uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload profile picture',
    });
  }
});

// Get profile picture
router.get('/:uid/profile/picture', async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Get user profile
    const profile = await getUserProfile(uid);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }
    
    // Check if profile has a picture
    if (!profile.profilePicture) {
      return res.status(404).json({
        success: false,
        error: 'Profile picture not found',
      });
    }
    
    // Profile picture is now in Firebase Storage
    // Return the URL from the profile (it's already a Firebase Storage URL)
    if (profile.profilePicture) {
      // Redirect to the Firebase Storage URL
      return res.redirect(profile.profilePicture);
    } else {
      return res.status(404).json({
        success: false,
        error: 'Profile picture not found',
      });
    }
  } catch (error) {
    console.error('Get profile picture error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get profile picture',
    });
  }
});

// List users (admin)
router.get('/', async (_req, res) => {
  try {
    const users = await listUsers();
    res.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (e) {
    console.error('List users error:', e);
    res.status(500).json({ 
      success: false,
      error: e.message || 'Failed to list users' 
    });
  }
});

module.exports = router;
