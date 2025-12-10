const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  saveSimpleSchedule,
  getUserSchedules,
  saveSchedule,
  getScheduleById,
  updateSchedule,
  listUserSchedules,
} = require('../services/firestoreService');
const { analyzeScheduleImage, saveScheduleItems, updateScheduleItems, deleteSchedule, createLecturesFromSchedule } = require('../services/scheduleService');
const {
  uploadScheduleImage,
  deleteFile: deleteFileFromFirebase,
} = require('../services/firebaseStorageService');

// Configure multer for schedule image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'schedules');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId || 'temp';
    const ext = path.extname(file.originalname);
    cb(null, `schedule_${userId}_${Date.now()}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
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
 * POST /api/schedule/:userId/analyze-image
 * Upload schedule image and analyze it with AI
 * Extracts schedule items: day, name, place (optional)
 * NOTE: This route must be defined BEFORE /:userId to avoid route conflicts
 */
router.post('/:userId/analyze-image', imageUpload.single('image'), async (req, res) => {
  let imagePath = null;

  try {
    const { userId } = req.params;

    if (!userId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    imagePath = req.file.path;

    // Upload to Firebase Storage (even though temporary, for consistency)
    const filename = req.file.filename || path.basename(req.file.path);
    let storagePath = null;
    try {
      const result = await uploadScheduleImage(req.file.path, userId, filename);
      storagePath = result.storagePath;
    } catch (uploadError) {
      console.warn('Failed to upload schedule image to Firebase Storage, using local file:', uploadError);
      // Continue with local file if upload fails
    }

    // Analyze the schedule image using AI
    const scheduleItems = await analyzeScheduleImage(imagePath);

    // Delete the local temp file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    // Delete from Firebase Storage if uploaded (temporary file)
    if (storagePath) {
      try {
        await deleteFileFromFirebase(storagePath);
      } catch (deleteError) {
        console.warn('Failed to delete temporary schedule image from Firebase Storage:', deleteError);
        // Non-critical error, continue
      }
    }

    // Save schedule items to database (userId is included in saveScheduleItems)
    const scheduleId = await saveScheduleItems(userId, scheduleItems);

    res.json({
      success: true,
      scheduleId,
      userId,
      items: scheduleItems,
      count: scheduleItems.length,
      message: 'Schedule analyzed and saved successfully',
    });
  } catch (error) {
    console.error('Error analyzing schedule image:', error);

    // Clean up image file on error
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.status(500).json({ error: error.message || 'Failed to analyze schedule image' });
  }
});

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
 * POST /api/schedule/schedule/:scheduleId/confirm
 * Confirm and save schedule - creates lectures from schedule items
 * NOTE: This route must be defined BEFORE /schedule/:scheduleId to avoid conflicts
 */
router.post('/schedule/:scheduleId/confirm', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Create lectures from schedule items
    const createdLectures = await createLecturesFromSchedule(scheduleId, userId);

    res.json({
      success: true,
      scheduleId,
      userId,
      lecturesCreated: createdLectures.map(l => ({
        lectureId: l.lectureId,
        title: l.scheduleItem.name,
        day: l.scheduleItem.day,
        place: l.scheduleItem.place,
        time: l.scheduleItem.time,
      })),
      count: createdLectures.length,
      message: 'Schedule confirmed and lectures created successfully',
    });
  } catch (error) {
    console.error('Error confirming schedule:', error);
    if (error.message === 'Schedule not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Schedule has no items to convert') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to confirm schedule' });
  }
});

/**
 * GET /api/schedule/schedule/:scheduleId
 * Get a specific schedule by scheduleId
 * NOTE: This route must be defined AFTER /schedule/:scheduleId/confirm to avoid conflicts
 */
router.get('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required as query parameter' });
    }

    const schedule = await getScheduleById(scheduleId, userId);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch schedule' });
  }
});

/**
 * PATCH /api/schedule/:scheduleId
 * Update schedule items (add, edit, delete)
 * NOTE: This route must be defined BEFORE /:userId to avoid conflicts
 */
router.patch('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId, add, edit, delete: deleteIndex } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const updates = {};
    if (add) updates.add = add;
    if (edit) updates.edit = edit;
    if (deleteIndex !== undefined) updates.delete = deleteIndex;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'At least one operation (add, edit, or delete) is required' });
    }

    const updatedItems = await updateScheduleItems(scheduleId, userId, updates);

    res.json({
      success: true,
      scheduleId,
      userId,
      items: updatedItems,
      count: updatedItems.length,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    if (error.message === 'Schedule not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update schedule' });
  }
});

/**
 * DELETE /api/schedule/:scheduleId
 * Delete a schedule
 * NOTE: This route must be defined BEFORE /:userId to avoid conflicts
 */
router.delete('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required as query parameter' });
    }

    await deleteSchedule(scheduleId, userId);

    res.json({
      success: true,
      scheduleId,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    if (error.message === 'Schedule not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete schedule' });
  }
});

/**
 * GET /api/schedule/:userId
 * Retrieve all saved schedules for a user
 * NOTE: This route must be defined AFTER all other /:userId routes to avoid route conflicts
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


