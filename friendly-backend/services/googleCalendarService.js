const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CAL_BASE = 'https://www.googleapis.com/calendar/v3';

async function fetchEvents(accessToken, { calendarId = 'primary', timeMin, timeMax }) {
  const url = new URL(`${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
  if (timeMin) url.searchParams.set('timeMin', timeMin);
  if (timeMax) url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  const json = await res.json();
  return json.items || [];
}

async function createEvent(accessToken, { calendarId = 'primary', event }) {
  const url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Failed to create event: ${res.status}`);
  return res.json();
}

async function updateEvent(accessToken, { calendarId = 'primary', eventId, event }) {
  const url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Failed to update event: ${res.status}`);
  return res.json();
}

async function deleteEvent(accessToken, { calendarId = 'primary', eventId }) {
  const url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to delete event: ${res.status}`);
}

async function listCalendars(accessToken) {
  const url = `${CAL_BASE}/users/me/calendarList`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch calendars: ${res.status}`);
  const json = await res.json();
  return json.items || [];
}

module.exports = {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listCalendars,
};


