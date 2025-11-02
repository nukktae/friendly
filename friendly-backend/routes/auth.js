const router = require('express').Router();
const {
  signup,
  login,
  verifyToken,
  getUserById,
  updateUser,
  deleteUser,
} = require('../services/authService');

/**
 * POST /api/auth/signup
 * Create a new user account
 * Body: { email, password, name? }
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    const result = await signup(email, password, name);
    res.status(201).json({
      success: true,
      user: {
        uid: result.uid,
        email: result.email,
        name: result.name,
      },
      token: result.token, // Custom token for client to exchange for ID token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ 
      error: error.message || 'Signup failed' 
    });
  }
});

/**
 * POST /api/auth/login
 * Login with Firebase ID token (from client-side Firebase Auth)
 * Body: { idToken }
 * OR
 * Login with email/password (creates custom token)
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { idToken, email, password } = req.body;
    
    if (idToken) {
      // Verify ID token from client-side Firebase Auth
      const user = await login(idToken);
      return res.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
      });
    }
    
    if (email && password) {
      // Login with email/password
      const user = await login(null, email, password);
      return res.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
        idToken: user.idToken,
        refreshToken: user.refreshToken,
      });
    }
    
    return res.status(400).json({ 
      error: 'Either idToken or email/password is required' 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      error: error.message || 'Login failed' 
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify Firebase ID token
 * Body: { idToken }
 */
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ 
        error: 'idToken is required' 
      });
    }

    const user = await verifyToken(idToken);
    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      error: error.message || 'Token verification failed' 
    });
  }
});

/**
 * GET /api/auth/user/:uid
 * Get user by UID
 */
router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await getUserById(uid);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(404).json({ 
      error: error.message || 'User not found' 
    });
  }
});

/**
 * PATCH /api/auth/user/:uid
 * Update user account
 * Body: { email?, password?, displayName? }
 */
router.patch('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    const user = await updateUser(uid, updates);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({ 
      error: error.message || 'Update failed' 
    });
  }
});

/**
 * DELETE /api/auth/user/:uid
 * Delete user account
 */
router.delete('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    await deleteUser(uid);
    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(400).json({ 
      error: error.message || 'Delete failed' 
    });
  }
});

module.exports = router;

