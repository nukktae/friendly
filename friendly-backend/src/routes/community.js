const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createCommunityPost,
  getCommunityPost,
  listCommunityPosts,
  updateCommunityPost,
  deleteCommunityPost,
  togglePostLike,
  addPostComment,
  getUserProfile,
} = require('../services/firestoreService');
const {
  uploadPostImage,
  deleteFile: deleteFileFromFirebase,
} = require('../services/firebaseStorageService');

// Configure multer for post image uploads
const postImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'posts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId || 'temp';
    const ext = path.extname(file.originalname);
    cb(null, `post_${userId}_${Date.now()}${ext}`);
  },
});

const postImageUpload = multer({
  storage: postImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files (jpg, jpeg, png, gif, webp) are allowed.'));
    }
  },
});

/**
 * Middleware to check if user is school verified
 */
async function checkSchoolVerification(req, res, next) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    if (!userProfile.schoolVerified) {
      return res.status(403).json({ 
        error: 'School verification required',
        message: 'Only school-verified students can create posts and interact with the community',
      });
    }
    
    req.userProfile = userProfile;
    next();
  } catch (error) {
    console.error('Error checking school verification:', error);
    res.status(500).json({ error: error.message || 'Failed to verify user' });
  }
}

/**
 * GET /api/community/verify/:userId
 * Check if user is school verified
 */
router.get('/verify/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.json({
      success: true,
      schoolVerified: userProfile.schoolVerified || false,
      university: userProfile.university || null,
    });
  } catch (error) {
    console.error('Error checking verification:', error);
    res.status(500).json({ error: error.message || 'Failed to check verification' });
  }
});

/**
 * POST /api/community/verify-school-email
 * Verify school email and mark user as verified
 * Body: { userId, schoolEmail, university? }
 */
router.post('/verify-school-email', async (req, res) => {
  try {
    const { userId, schoolEmail, university } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!schoolEmail) {
      return res.status(400).json({ error: 'schoolEmail is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(schoolEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    // Extract domain from email
    const emailDomain = schoolEmail.split('@')[1]?.toLowerCase();
    
    // List of known school email domains (you can expand this)
    // For now, we'll accept any .edu domain or common school domains
    const schoolDomains = [
      'edu', // Any .edu domain
      'ac.kr', // Korean universities
      'ac.uk', // UK universities
      // Add more as needed
    ];
    
    const isSchoolDomain = schoolDomains.some(domain => 
      emailDomain.endsWith(domain)
    );
    
    if (!isSchoolDomain) {
      return res.status(400).json({ 
        error: 'Invalid school email domain',
        message: 'Please use your official school email address (.edu, .ac.kr, .ac.uk, etc.)',
      });
    }
    
    // Update user profile with verification
    const { updateUserProfile } = require('../services/firestoreService');
    await updateUserProfile(userId, {
      schoolEmail: schoolEmail,
      schoolVerified: true,
      university: university || userProfile.university || emailDomain.split('.')[0],
      schoolEmailVerifiedAt: new Date(),
    });
    
    // Get updated profile
    const updatedProfile = await getUserProfile(userId);
    
    res.json({
      success: true,
      message: 'School email verified successfully',
      schoolVerified: true,
      schoolEmail: schoolEmail,
      university: updatedProfile.university,
    });
  } catch (error) {
    console.error('Error verifying school email:', error);
    res.status(500).json({ error: error.message || 'Failed to verify school email' });
  }
});

/**
 * POST /api/community/posts
 * Create a new community post (requires school verification)
 * Supports both JSON (text only) and multipart/form-data (with image)
 */
router.post('/posts', checkSchoolVerification, postImageUpload.single('image'), async (req, res) => {
  let imagePath = null;
  
  try {
    const { userId, content, category } = req.body;
    const userProfile = req.userProfile;
    
    if (!content || !content.trim()) {
      // Clean up uploaded image if content is missing
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Post content is required' });
    }
    
    // Handle image upload if present
    let imageUrl = null;
    if (req.file) {
      imagePath = req.file.path;
      // Upload to Firebase Storage
      const filename = req.file.filename || path.basename(req.file.path);
      const { publicUrl, downloadUrl } = await uploadPostImage(
        req.file.path,
        userId,
        filename
      );
      
      // Use public URL if available, otherwise use signed URL
      imageUrl = publicUrl || downloadUrl;
      
      // Clean up local temp file
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.warn('Failed to delete temp file:', unlinkError);
        }
      }
    }
    
    const postData = {
      author: {
        userId: userId,
        name: userProfile.fullName || userProfile.nickname || 'Anonymous',
        avatar: userProfile.avatar || null,
        university: userProfile.university || '',
        country: userProfile.country || '',
      },
      content: content.trim(),
      category: category || 'General',
      imageUrl: imageUrl, // null if no image
    };
    
    const postId = await createCommunityPost(postData);
    const post = await getCommunityPost(postId);
    
    res.status(201).json({
      success: true,
      postId,
      post,
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Error creating post:', error);
    
    // Clean up uploaded image on error
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    res.status(500).json({ error: error.message || 'Failed to create post' });
  }
});

/**
 * GET /api/community/posts
 * List community posts with optional filters
 * Query params: category?, university?, userId?, limit?
 */
router.get('/posts', async (req, res) => {
  try {
    const { category, university, userId, limit } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (university) filters.university = university;
    if (userId) filters.userId = userId;
    if (limit) filters.limit = parseInt(limit);
    
    const posts = await listCommunityPosts(filters);
    
    res.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch posts' });
  }
});

/**
 * GET /api/community/posts/:postId
 * Get a specific post by ID
 */
router.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await getCommunityPost(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch post' });
  }
});

/**
 * PATCH /api/community/posts/:postId
 * Update a post (only by author, requires school verification)
 * Supports both JSON (text only) and multipart/form-data (with image)
 */
router.patch('/posts/:postId', checkSchoolVerification, postImageUpload.single('image'), async (req, res) => {
  let imagePath = null;
  
  try {
    const { postId } = req.params;
    const { userId, content, category, removeImage } = req.body;
    
    const post = await getCommunityPost(postId);
    if (!post) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (post.author.userId !== userId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: 'Unauthorized: You can only edit your own posts' });
    }
    
    const updates = {};
    if (content !== undefined) updates.content = content.trim();
    if (category !== undefined) updates.category = category;
    
    // Handle image update
    if (req.file) {
      imagePath = req.file.path;
      // Delete old image from Firebase Storage if exists
      if (post.imageUrl) {
        // Extract storage path from URL
        const urlMatch = post.imageUrl.match(/posts\/([^?]+)/);
        if (urlMatch) {
          const oldStoragePath = `posts/${urlMatch[1]}`;
          try {
            await deleteFileFromFirebase(oldStoragePath);
          } catch (error) {
            console.error('Error deleting old post image:', error);
            // Continue even if deletion fails
          }
        }
      }
      
      // Upload new image to Firebase Storage
      const filename = req.file.filename || path.basename(req.file.path);
      const { publicUrl, downloadUrl } = await uploadPostImage(
        req.file.path,
        userId,
        filename
      );
      
      // Use public URL if available, otherwise use signed URL
      updates.imageUrl = publicUrl || downloadUrl;
      
      // Clean up local temp file
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.warn('Failed to delete temp file:', unlinkError);
        }
      }
    } else if (removeImage === 'true' || removeImage === true) {
      // Remove image if requested
      if (post.imageUrl) {
        // Extract storage path from URL
        const urlMatch = post.imageUrl.match(/posts\/([^?]+)/);
        if (urlMatch) {
          const oldStoragePath = `posts/${urlMatch[1]}`;
          try {
            await deleteFileFromFirebase(oldStoragePath);
          } catch (error) {
            console.error('Error deleting post image:', error);
            // Continue even if deletion fails
          }
        }
      }
      updates.imageUrl = null;
    }
    
    await updateCommunityPost(postId, updates);
    const updatedPost = await getCommunityPost(postId);
    
    res.json({
      success: true,
      postId,
      post: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating post:', error);
    
    // Clean up uploaded image on error
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    res.status(500).json({ error: error.message || 'Failed to update post' });
  }
});

/**
 * DELETE /api/community/posts/:postId
 * Delete a post (only by author, requires school verification)
 */
router.delete('/posts/:postId', checkSchoolVerification, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required as query parameter' });
    }
    
    await deleteCommunityPost(postId, userId);
    
    res.json({
      success: true,
      postId,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

/**
 * POST /api/community/posts/:postId/like
 * Toggle like on a post (requires school verification)
 */
router.post('/posts/:postId/like', checkSchoolVerification, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    
    const result = await togglePostLike(postId, userId);
    
    res.json({
      success: true,
      postId,
      ...result,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to toggle like' });
  }
});

/**
 * POST /api/community/posts/:postId/comments
 * Add a comment to a post (requires school verification)
 */
router.post('/posts/:postId/comments', checkSchoolVerification, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content } = req.body;
    const userProfile = req.userProfile;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const commentData = {
      author: {
        userId: userId,
        name: userProfile.fullName || userProfile.nickname || 'Anonymous',
        avatar: userProfile.avatar || null,
        university: userProfile.university || '',
      },
      content: content.trim(),
    };
    
    const comment = await addPostComment(postId, commentData);
    
    res.status(201).json({
      success: true,
      postId,
      comment,
      message: 'Comment added successfully',
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to add comment' });
  }
});

module.exports = router;

