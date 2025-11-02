const router = require('express').Router();
const {
  saveSchedule,
  getScheduleById,
  listUserSchedules,
} = require('../services/firestoreService');

// Create or update a schedule
router.post('/', async (req, res) => {
  try {
    const id = await saveSchedule(req.body);
    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a schedule by id and userId
router.get('/:id', async (req, res) => {
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

// List schedules for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const items = await listUserSchedules(userId);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;


