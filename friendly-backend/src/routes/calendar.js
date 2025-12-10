const router = require('express').Router();
const {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listCalendars,
} = require('../services/googleCalendarService');

function getAccessToken(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts[0] === 'Bearer' && parts[1]) return parts[1];
  return null;
}

router.get('/events', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Missing access token' });
    const { calendarId = 'primary', timeMin, timeMax } = req.query;
    const items = await fetchEvents(token, { calendarId, timeMin, timeMax });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/events', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Missing access token' });
    const { calendarId = 'primary', event } = req.body;
    const created = await createEvent(token, { calendarId, event });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/events/:eventId', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Missing access token' });
    const { calendarId = 'primary', event } = req.body;
    const updated = await updateEvent(token, { calendarId, eventId: req.params.eventId, event });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/events/:eventId', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Missing access token' });
    const { calendarId = 'primary' } = req.query;
    await deleteEvent(token, { calendarId, eventId: req.params.eventId });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/calendars', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Missing access token' });
    const items = await listCalendars(token);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/calendar/sync-to-schedule
 * Sync Google Calendar events and create a schedule
 * Body: { userId, accessToken, calendarId?, timeMin?, timeMax? }
 */
router.post('/sync-to-schedule', async (req, res) => {
  try {
    const { userId, accessToken, calendarId, timeMin, timeMax } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }
    
    const { syncGoogleCalendarToSchedule } = require('../services/scheduleService');
    
    const result = await syncGoogleCalendarToSchedule(userId, accessToken, {
      calendarId: calendarId || 'primary',
      timeMin,
      timeMax,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error syncing calendar to schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to sync Google Calendar' });
  }
});

/**
 * POST /api/calendar/disconnect
 * Disconnect/unsync Google Calendar
 * Body: { userId, deleteSchedules?: boolean }
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { userId, deleteSchedules = false } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const { disconnectGoogleCalendar } = require('../services/scheduleService');
    
    const result = await disconnectGoogleCalendar(userId, {
      deleteSchedules: deleteSchedules === true || deleteSchedules === 'true',
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: error.message || 'Failed to disconnect Google Calendar' });
  }
});

module.exports = router;


