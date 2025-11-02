const router = require('express').Router();
const {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  listUsers,
} = require('../services/firestoreService');

// Create/merge user profile
router.post('/:uid/profile', async (req, res) => {
  try {
    await createUserProfile(req.params.uid, req.body);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get profile
router.get('/:uid/profile', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.uid);
    if (!profile) return res.status(404).json({ error: 'Not found' });
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update profile
router.patch('/:uid/profile', async (req, res) => {
  try {
    await updateUserProfile(req.params.uid, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List users (admin)
router.get('/', async (_req, res) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;


