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

module.exports = router;


