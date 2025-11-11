const router = require('express').Router();
const {
  saveSimpleSchedule,
  getUserSchedules,
  saveSchedule,
  getScheduleById,
  listUserSchedules,
} = require('../services/firestoreService');

/**
 * POST /schedule
 * Save a user's schedule to the database
 * 
 * Request body:
 * {
 *   "userId": "user123",
 *   "title": "Math Class",
 *   "date": "2024-01-15",
 *   "time": "10:00 AM",
 *   "description": "Algebra lesson"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, title, date, time, description } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    if (!time) {
      return res.status(400).json({ error: 'time is required' });
    }

    const scheduleId = await saveSimpleSchedule({
      userId,
      title,
      date,
      time,
      description: description || '',
    });

    res.status(201).json({
      success: true,
      id: scheduleId,
      message: 'Schedule saved successfully',
    });
  } catch (error) {
    console.error('Error saving schedule:', error);
    
    // Provide helpful error message for Firebase issues
    if (error.message && (
      error.message.includes('Firebase Admin SDK not initialized') ||
      error.message.includes('Cannot read properties of null')
    )) {
      return res.status(503).json({ 
        error: 'Firebase not configured. Please set FIREBASE_SERVICE_ACCOUNT_JSON in .env file. See FIREBASE_SETUP.md for instructions.',
        details: 'Firebase Admin SDK is not initialized. Download service account key from Firebase Console and add it to .env file.'
      });
    }
    
    res.status(500).json({ error: error.message || 'Failed to save schedule' });
  }
});

/**
 * GET /schedule/:userId
 * Retrieve all saved schedules for a user
 * 
 * Response:
 * {
 *   "success": true,
 *   "schedules": [...],
 *   "count": 2
 * }
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const schedules = await getUserSchedules(userId);

    res.json({
      success: true,
      schedules: schedules || [],
      count: schedules ? schedules.length : 0,
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    
    // Provide helpful error message for Firebase issues
    if (error.message && (
      error.message.includes('Firebase Admin SDK not initialized') ||
      error.message.includes('Cannot read properties of null')
    )) {
      return res.status(503).json({ 
        error: 'Firebase not configured. Please set FIREBASE_SERVICE_ACCOUNT_JSON in .env file. See FIREBASE_SETUP.md for instructions.',
        details: 'Firebase Admin SDK is not initialized. Download service account key from Firebase Console and add it to .env file.'
      });
    }
    
    res.status(500).json({ error: error.message || 'Failed to fetch schedules' });
  }
});

// Legacy endpoints (kept for backward compatibility if needed)
// Get a schedule by id and userId
router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const schedule = await getScheduleById(id, userId);
    if (!schedule) return res.status(404).json({ error: 'Not found' });
    res.json(schedule);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List schedules for a user (query param version - legacy)
router.get('/list/all', async (req, res) => {
  try {
    const { userId } = req.query;
    const items = await listUserSchedules(userId);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;


