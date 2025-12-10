const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { saveSchedule } = require('./firestoreService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze schedule image using OpenAI Vision API
 * Extracts schedule information: day, name, place (optional), time (optional)
 * Supports both Korean and English schedule formats
 */
async function analyzeScheduleImage(imagePath) {
  try {
    console.log('Starting schedule image analysis with OpenAI Vision API...');
    const startTime = Date.now();
    
    // Validate file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error('Image file not found');
    }

    // Read the image file
    let imageBuffer = fs.readFileSync(imagePath);
    const originalSize = imageBuffer.length;
    
    // Check file size (GPT-4o vision has limits)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (imageBuffer.length > maxSize) {
      throw new Error(`Image file too large (${(originalSize / 1024 / 1024).toFixed(2)}MB). Maximum size is 20MB.`);
    }
    
    const base64Image = imageBuffer.toString('base64');
    console.log(`Image encoded to base64 (${(base64Image.length / 1024).toFixed(2)}KB)`);

    // Determine MIME type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else {
      console.warn(`Unknown image extension: ${ext}, defaulting to image/jpeg`);
    }

    // Create prompt for schedule extraction
    const prompt = `Analyze this class schedule image and extract ALL schedule items.

Extract schedule information for each class/event:
- Day of week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- Course/Class name (can be in Korean or English)
- Location/Place (room number, building, etc. - optional)
- Time (start and end time - optional)

The schedule may be in various formats:
- Weekly timetable/grid format
- List format organized by day
- Korean university schedule format
- English schedule format

CRITICAL EXTRACTION RULES:
1. Extract ALL classes/events visible in the schedule
2. Preserve Korean text exactly as written (한글)
3. Extract English text as written
4. Include location/place if visible (room numbers, building names)
5. Include time if visible (can be in various formats: "10:00 AM - 12:00 PM", "10:00-12:00", etc.)
6. If time is not specified, set time to null
7. If location is not specified, set place to null
8. Day must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday

Return ONLY valid JSON (no markdown) in this exact format:
{
  "items": [
    {
      "day": "Monday",
      "name": "Course Name",
      "place": "Room 101" or null,
      "time": "10:00 AM - 12:00 PM" or null
    }
  ]
}

Example response:
{
  "items": [
    {
      "day": "Monday",
      "name": "소셜마케팅캠페인",
      "place": "북악관4층3호실",
      "time": "1:00 PM - 2:00 PM"
    },
    {
      "day": "Tuesday",
      "name": "알고리즘",
      "place": "미래관2층32호실",
      "time": "10:00 AM - 12:00 PM"
    }
  ]
}

Extract ALL schedule items from the image. Return ONLY the JSON object, no additional text.`;

    console.log('Sending request to GPT-4o Vision API...');
    console.log(`[GPT-4o] Image size: ${(base64Image.length / 1024).toFixed(2)}KB, MIME type: ${mimeType}`);
    console.log(`[GPT-4o] Prompt length: ${prompt.length} characters`);
    const apiStartTime = Date.now();
    
    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o', // Using GPT-4o for better OCR and Korean text recognition
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
                  detail: 'high', // High detail for accurate OCR of Korean text and schedule tables
                },
              },
            ],
          },
        ],
        max_tokens: 4000, // Sufficient for extracting schedule items
        temperature: 0.1, // Lower for more consistent extraction
        response_format: { type: 'json_object' },
      });
      
      const apiTime = Date.now() - apiStartTime;
      console.log(`[GPT-4o] Call completed in ${(apiTime / 1000).toFixed(2)}s`);
      console.log(`[GPT-4o] Response received, choices: ${response.choices?.length || 0}`);
    } catch (apiError) {
      const apiTime = Date.now() - apiStartTime;
      console.error(`[GPT-4o] API call failed after ${(apiTime / 1000).toFixed(2)}s`);
      console.error(`[GPT-4o] Error type: ${apiError.constructor.name}`);
      console.error(`[GPT-4o] Error message: ${apiError.message}`);
      
      if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
        throw new Error('OpenAI API request timed out. The image may be too large or complex. Please try with a smaller image.');
      }
      if (apiError.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (apiError.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API configuration.');
      }
      throw new Error(`OpenAI API error: ${apiError.message}`);
    }

    if (!response || !response.choices || response.choices.length === 0) {
      console.error(`[GPT-4o] Invalid response structure:`, JSON.stringify(response, null, 2));
      throw new Error('Invalid response from OpenAI API');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error(`[GPT-4o] No content in response:`, JSON.stringify(response, null, 2));
      throw new Error('No content received from OpenAI API');
    }
    
    console.log(`[GPT-4o] Response content length: ${content.length} characters`);
    
    // Parse JSON response
    let analysis;
    try {
      console.log(`[GPT-4o] Parsing JSON response...`);
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedContent);
      console.log(`[GPT-4o] JSON parsed successfully`);
    } catch (parseError) {
      console.error(`[GPT-4o] Error parsing JSON response:`);
      console.error(`[GPT-4o] Parse error:`, parseError.message);
      console.error(`[GPT-4o] Response preview (first 1000 chars):`, content.substring(0, 1000));
      throw new Error(`Failed to parse schedule extraction response: ${parseError.message}. The schedule image may be too complex or unclear.`);
    }

    // Extract items from response
    if (!analysis.items || !Array.isArray(analysis.items)) {
      console.error(`[GPT-4o] Invalid response structure - missing items array:`, JSON.stringify(analysis, null, 2));
      throw new Error('Invalid response format: missing items array');
    }

    // Validate and clean the schedule items
    const validatedItems = analysis.items.map((item, index) => {
      if (!item.day || !item.name) {
        throw new Error(`Schedule item ${index + 1} is missing required fields (day or name)`);
      }

      // Normalize day name (capitalize first letter)
      const day = item.day.trim();
      const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
      
      // Validate day is valid
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (!validDays.includes(normalizedDay)) {
        console.warn(`[GPT-4o] Invalid day "${day}", using as-is`);
      }

      return {
        day: normalizedDay,
        name: item.name.trim(),
        place: item.place ? item.place.trim() : null,
        time: item.time ? item.time.trim() : null,
      };
    }).filter(item => item.day && item.name); // Filter out any invalid items

    if (validatedItems.length === 0) {
      throw new Error('No valid schedule items could be extracted from the image. Please ensure the image contains a clear schedule.');
    }

    const totalTime = Date.now() - startTime;
    console.log(`[GPT-4o] Schedule image analysis completed in ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`[GPT-4o] Extracted ${validatedItems.length} schedule items`);

    return validatedItems;
  } catch (error) {
    console.error('Error analyzing schedule image:', error);
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      throw new Error(`Failed to extract schedule from image: ${error.message}`);
    }
    if (error.message.includes('file') || error.message.includes('not found')) {
      throw new Error(`Image processing error: ${error.message}`);
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

