const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { saveSchedule } = require('./firestoreService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze schedule image using OpenAI Vision API
 * Extracts schedule information: day, name, place (optional)
 */
async function analyzeScheduleImage(imagePath) {
  try {
    console.log('Starting image analysis...');
    const startTime = Date.now();
    
    // Read the image file
    let imageBuffer = fs.readFileSync(imagePath);
    const originalSize = imageBuffer.length;
    
    // Compress image if it's too large (reduce size for faster API calls)
    // OpenAI Vision API works well with smaller images, and it's faster
    if (imageBuffer.length > 1024 * 1024) { // If larger than 1MB
      console.log(`Image is ${(originalSize / 1024 / 1024).toFixed(2)}MB, optimizing...`);
      // For now, we'll use the image as-is but note that compression would help
      // In production, you could use sharp or jimp to resize/compress
      // For schedule images, we don't need ultra-high resolution
    }
    
    const base64Image = imageBuffer.toString('base64');
    console.log(`Image encoded to base64 (${(base64Image.length / 1024).toFixed(2)}KB)`);

    // Determine MIME type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    const prompt = `Analyze this schedule image and extract all schedule items. Return ONLY a JSON object with this exact structure:
{
  "items": [
    {
      "day": "Monday",
      "name": "Math Class",
      "place": "Room 101",
      "time": "10:00 AM"
    }
  ]
}

For each item, extract:
- day: Day of week (Monday-Sunday)
- name: Class/event name
- place: Location (null if not available)
- time: Time (null if not available)

Extract ALL schedule items. Return only valid JSON, no other text.`;

    // Optimize: Use faster model and structured output
    console.log('Sending request to OpenAI...');
    const apiStartTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster and cheaper model (2-3x faster than gpt-4o)
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'low', // Use low detail for faster processing (high detail is slower)
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1, // Lower temperature for more consistent, faster responses
      response_format: { type: 'json_object' }, // Request JSON format for faster parsing
    });
    
    const apiTime = Date.now() - apiStartTime;
    console.log(`OpenAI API call completed in ${(apiTime / 1000).toFixed(2)}s`);

    const content = response.choices[0].message.content;
    
    // Parse JSON response (now guaranteed to be JSON object)
    let scheduleItems = [];
    try {
      const parsed = JSON.parse(content);
      // Handle both { items: [...] } and direct array formats
      scheduleItems = parsed.items || parsed;
      
      // Ensure it's an array
      if (!Array.isArray(scheduleItems)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI Response:', content);
      // Fallback: try to extract array from response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          scheduleItems = JSON.parse(jsonMatch[0]);
        } else {
          throw parseError;
        }
      } catch (fallbackError) {
        throw new Error('Failed to parse schedule data from AI response');
      }
    }

    // Validate and clean the schedule items
    const validatedItems = scheduleItems.map((item, index) => {
      if (!item.day || !item.name) {
        throw new Error(`Schedule item ${index + 1} is missing required fields (day or name)`);
      }

      return {
        day: item.day.trim(),
        name: item.name.trim(),
        place: item.place ? item.place.trim() : null,
        time: item.time ? item.time.trim() : null,
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(`Image analysis completed in ${(totalTime / 1000).toFixed(2)}s, extracted ${validatedItems.length} items`);

    return validatedItems;
  } catch (error) {
    console.error('Error analyzing schedule image:', error);
    if (error.message.includes('parse')) {
      throw new Error(`Failed to extract schedule from image: ${error.message}`);
    }
    throw new Error(`Schedule analysis failed: ${error.message}`);
  }
}

/**
 * Save schedule items to database
 */
async function saveScheduleItems(userId, scheduleItems, source = 'image_upload') {
  try {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const scheduleData = {
      id: scheduleId,
      userId,
      items: scheduleItems,
      source: source, // 'image_upload', 'google_calendar', etc.
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await saveSchedule(scheduleData);
    return scheduleId;
  } catch (error) {
    console.error('Error saving schedule items:', error);
    throw new Error(`Failed to save schedule: ${error.message}`);
  }
}

/**
 * Update schedule items (add, edit, delete)
 */
async function updateScheduleItems(scheduleId, userId, updates) {
  try {
    const { getScheduleById, updateSchedule } = require('./firestoreService');
    
    // Get existing schedule
    const schedule = await getScheduleById(scheduleId, userId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    let updatedItems = [...(schedule.items || [])];

    // Handle add operation
    if (updates.add) {
      const newItem = {
        day: updates.add.day,
        name: updates.add.name,
        place: updates.add.place || null,
        time: updates.add.time || null,
      };
      updatedItems.push(newItem);
    }

    // Handle edit operation
    if (updates.edit) {
      const { index, day, name, place, time } = updates.edit;
      if (index < 0 || index >= updatedItems.length) {
        throw new Error('Invalid item index');
      }
      updatedItems[index] = {
        day: day || updatedItems[index].day,
        name: name || updatedItems[index].name,
        place: place !== undefined ? place : updatedItems[index].place,
        time: time !== undefined ? time : updatedItems[index].time,
      };
    }

    // Handle delete operation
    if (updates.delete !== undefined) {
      const index = updates.delete;
      if (index < 0 || index >= updatedItems.length) {
        throw new Error('Invalid item index');
      }
      updatedItems.splice(index, 1);
    }

    // Update schedule in database
    await updateSchedule(scheduleId, { items: updatedItems });
    
    return updatedItems;
  } catch (error) {
    console.error('Error updating schedule items:', error);
    throw new Error(`Failed to update schedule: ${error.message}`);
  }
}

/**
 * Delete a schedule
 */
async function deleteSchedule(scheduleId, userId) {
  try {
    const { getScheduleById } = require('./firestoreService');
    const admin = require('./firebaseAdmin');
    
    // Verify schedule exists and belongs to user
    const schedule = await getScheduleById(scheduleId, userId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Delete schedule from Firestore
    const db = admin.firestore();
    await db.collection('userSchedules').doc(scheduleId).delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw new Error(`Failed to delete schedule: ${error.message}`);
  }
}

/**
 * Convert schedule items to lectures
 * Creates a lecture for each schedule item
 */
async function createLecturesFromSchedule(scheduleId, userId) {
  try {
    const { getScheduleById } = require('./firestoreService');
    const { createLectureRecord } = require('./lectureService');
    
    // Get the schedule
    const schedule = await getScheduleById(scheduleId, userId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (!schedule.items || schedule.items.length === 0) {
      throw new Error('Schedule has no items to convert');
    }

    const createdLectures = [];

    // Create a lecture for each schedule item
    for (const item of schedule.items) {
      // Build description from schedule item details
      const descriptionParts = [];
      if (item.day) descriptionParts.push(`Day: ${item.day}`);
      if (item.time) descriptionParts.push(`Time: ${item.time}`);
      if (item.place) descriptionParts.push(`Place: ${item.place}`);
      const description = descriptionParts.join(' | ');

      // Create tags from day
      const tags = item.day ? [item.day.toLowerCase()] : [];

      // Create lecture
      const lectureId = await createLectureRecord(userId, {
        title: item.name,
        description: description || '',
        tags: tags,
        status: 'draft', // Created as draft, ready for transcription
      });

      createdLectures.push({
        lectureId,
        scheduleItem: item,
      });
    }

    // Mark schedule as confirmed/converted
    const { updateSchedule } = require('./firestoreService');
    await updateSchedule(scheduleId, {
      confirmed: true,
      lecturesCreated: createdLectures.map(l => l.lectureId),
      confirmedAt: new Date(),
    });

    return createdLectures;
  } catch (error) {
    console.error('Error creating lectures from schedule:', error);
    throw new Error(`Failed to create lectures: ${error.message}`);
  }
}

/**
 * Sync Google Calendar events and convert to schedule items
 */
async function syncGoogleCalendarToSchedule(userId, accessToken, options = {}) {
  try {
    const { fetchEvents } = require('./googleCalendarService');
    
    const {
      calendarId = 'primary',
      timeMin,
      timeMax,
    } = options;
    
    // Fetch events from Google Calendar
    // Default: Look back 7 days and forward 90 days to capture more events
    const defaultTimeMin = timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
    const defaultTimeMax = timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days from now
    
    const events = await fetchEvents(accessToken, {
      calendarId,
      timeMin: defaultTimeMin,
      timeMax: defaultTimeMax,
    });
    
    if (!events || events.length === 0) {
      return {
        scheduleId: null,
        items: [],
        count: 0,
        message: 'No events found in the specified time range',
      };
    }
    
    // Convert Google Calendar events to schedule items
    const scheduleItems = events.map(event => {
      // Extract day of week from start date
      const startDate = event.start?.dateTime || event.start?.date;
      let day = null;
      if (startDate) {
        const date = new Date(startDate);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        day = days[date.getDay()];
      }
      
      // Extract time
      let time = null;
      if (event.start?.dateTime) {
        const date = new Date(event.start.dateTime);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        time = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } else if (event.start?.date) {
        // All-day event
        time = 'All Day';
      }
      
      // Extract name/title
      const name = event.summary || event.description || 'Untitled Event';
      
      // Extract place/location
      const place = event.location || null;
      
      return {
        day: day,
        name: name,
        place: place,
        time: time,
      };
    }).filter(item => item.day && item.name); // Filter out invalid items
    
    if (scheduleItems.length === 0) {
      return {
        scheduleId: null,
        items: [],
        count: 0,
        message: 'No valid schedule items could be extracted from calendar events',
      };
    }
    
    // Save schedule items with source marked as 'google_calendar'
    const scheduleId = await saveScheduleItems(userId, scheduleItems, 'google_calendar');
    
    return {
      scheduleId,
      items: scheduleItems,
      count: scheduleItems.length,
      message: 'Google Calendar synced and schedule created successfully',
    };
  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    throw new Error(`Failed to sync Google Calendar: ${error.message}`);
  }
}

/**
 * Disconnect/unsync Google Calendar
 * Marks all schedules created from Google Calendar as inactive
 * Optionally deletes them if deleteSchedules is true
 */
async function disconnectGoogleCalendar(userId, options = {}) {
  try {
    const { getUserSchedules, updateSchedule } = require('./firestoreService');
    const admin = require('./firebaseAdmin');
    
    const { deleteSchedules = false } = options;
    
    // Get all schedules for the user (including inactive ones)
    const allSchedules = await getUserSchedules(userId);
    
    // Filter schedules created from Google Calendar
    const googleCalendarSchedules = allSchedules.filter(
      schedule => schedule.source === 'google_calendar'
    );
    
    if (googleCalendarSchedules.length === 0) {
      return {
        success: true,
        message: 'No Google Calendar schedules found to disconnect',
        schedulesDisconnected: 0,
      };
    }
    
    let disconnectedCount = 0;
    
    // Either delete or mark as inactive
    if (deleteSchedules) {
      // Delete schedules directly from Firestore
      const db = admin.firestore();
      for (const schedule of googleCalendarSchedules) {
        try {
          await db.collection('userSchedules').doc(schedule.id).delete();
          disconnectedCount++;
        } catch (error) {
          console.error(`Error deleting schedule ${schedule.id}:`, error);
        }
      }
    } else {
      // Mark schedules as inactive
      for (const schedule of googleCalendarSchedules) {
        try {
          await updateSchedule(schedule.id, { isActive: false });
          disconnectedCount++;
        } catch (error) {
          console.error(`Error updating schedule ${schedule.id}:`, error);
        }
      }
    }
    
    return {
      success: true,
      message: `Successfully disconnected ${disconnectedCount} Google Calendar schedule(s)`,
      schedulesDisconnected: disconnectedCount,
      deleted: deleteSchedules,
    };
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    throw new Error(`Failed to disconnect Google Calendar: ${error.message}`);
  }
}

module.exports = {
  analyzeScheduleImage,
  saveScheduleItems,
  updateScheduleItems,
  deleteSchedule,
  createLecturesFromSchedule,
  syncGoogleCalendarToSchedule,
  disconnectGoogleCalendar,
};

