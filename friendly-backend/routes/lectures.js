const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createLectureRecord,
  transcribeAudioChunk,
  transcribeAudio,
  generateSummary,
  generateChecklist,
  chatWithLectures,
  updateChecklist,
  toggleChecklistItem,
} = require('../services/lectureService');
const {
  getLectureById,
  updateLecture,
  listUserLectures,
  deleteLecture,
  getLectureByTranscriptionId,
  saveChatMessage,
  getUserChatHistory,
  deleteChatMessage,
  deleteAllUserChatHistory,
} = require('../services/firestoreService');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const lectureId = req.params.lectureId || 'temp';
    const ext = path.extname(file.originalname);
    cb(null, `${lectureId}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/x-m4a'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(mp3|m4a|wav|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files (mp3, m4a, wav, webm) are allowed.'));
    }
  },
});

/**
 * POST /api/lectures
 * Create a new lecture (simple creation without starting recording)
 * Body: { userId, title, day?, time?, place?, description?, tags? }
 * 
 * If day, time, or place are provided, they will be used to build the description
 * and add the day to tags (same format as schedule-to-lecture conversion)
 */
router.post('/', async (req, res) => {
  try {
    const { userId, title, day, time, place, description, tags } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Build description from day, time, place if provided (same as schedule items)
    let finalDescription = description;
    if (day || time || place) {
      const descriptionParts = [];
      if (day) descriptionParts.push(`Day: ${day}`);
      if (time) descriptionParts.push(`Time: ${time}`);
      if (place) descriptionParts.push(`Place: ${place}`);
      finalDescription = descriptionParts.join(' | ') || description || '';
    }

    // Add day to tags if provided
    let finalTags = tags || [];
    if (day) {
      const dayTag = day.toLowerCase();
      if (!finalTags.includes(dayTag)) {
        finalTags = [...finalTags, dayTag];
      }
    }

    const lectureId = await createLectureRecord(userId, {
      title,
      description: finalDescription,
      tags: finalTags,
      status: 'draft', // Created but not yet recording
    });

    const lecture = await getLectureById(lectureId, userId);

    res.status(201).json({
      success: true,
      lectureId,
      lecture,
      message: 'Lecture created successfully',
    });
  } catch (error) {
    console.error('Error creating lecture:', error);
    res.status(500).json({ error: error.message || 'Failed to create lecture' });
  }
});

/**
 * POST /api/lectures/:lectureId/start-transcribing
 * Start transcribing an existing lecture
 * This updates the lecture status and prepares it for transcription
 */
router.post('/:lectureId/start-transcribing', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify lecture exists and belongs to user
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Update lecture status to 'recording' to indicate transcription has started
    await updateLecture(lectureId, {
      status: 'recording',
    });

    res.json({
      success: true,
      lectureId,
      message: 'Transcription session started',
    });
  } catch (error) {
    console.error('Error starting transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to start transcription' });
  }
});

/**
 * POST /api/lectures/:lectureId/transcribe-chunk
 * Live transcription of audio chunk (every 10-30 sec during recording)
 */
router.post('/:lectureId/transcribe-chunk', upload.single('audio'), async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Transcribe the chunk
    const chunkTranscript = await transcribeAudioChunk(req.file.path);

    // Update live transcript (append)
    const currentLiveTranscript = lecture.liveTranscript || '';
    const updatedLiveTranscript = currentLiveTranscript
      ? `${currentLiveTranscript} ${chunkTranscript}`
      : chunkTranscript;

    await updateLecture(lectureId, { liveTranscript: updatedLiveTranscript });

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      transcript: chunkTranscript,
      liveTranscript: updatedLiveTranscript,
    });
  } catch (error) {
    console.error('Error transcribing chunk:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Failed to transcribe chunk' });
  }
});

/**
 * POST /api/lectures/:lectureId/transcribe
 * Transcribe audio file OR accept direct transcript text
 * 
 * Two modes:
 * 1. Audio file upload (multipart/form-data): Uploads audio, transcribes it using Whisper, deletes audio, saves transcript
 * 2. Direct transcript (application/json): Accepts transcript text directly in JSON body
 * 
 * This is the main endpoint for recording flow:
 * 1. Start recording (POST /start) - creates lecture
 * 2. Frontend records audio
 * 3. Call this endpoint with audio file - transcribes and saves transcript
 */
router.post('/:lectureId/transcribe', upload.single('audio'), async (req, res) => {
  let audioFilePath = null;
  
  try {
    const { lectureId } = req.params;
    const { userId, transcript: transcriptText, duration } = req.body;

    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Lecture not found' });
    }

    let transcript;

    // Mode 1: Audio file upload - transcribe the audio using Whisper
    if (req.file) {
      audioFilePath = req.file.path;

      // Update status to processing
      await updateLecture(lectureId, {
        duration: duration ? parseInt(duration) : 0,
        status: 'processing',
      });

      // Transcribe the audio using OpenAI Whisper
      transcript = await transcribeAudio(audioFilePath);

      // Delete the audio file after transcription (we only keep the transcript)
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
    }
    // Mode 2: Direct transcript text in JSON body
    else if (transcriptText) {
      if (typeof transcriptText !== 'string' || transcriptText.trim().length === 0) {
        return res.status(400).json({ error: 'Transcript text must be a non-empty string' });
      }
      transcript = transcriptText.trim();
    }
    // Neither audio file nor transcript text provided
    else {
      return res.status(400).json({ 
        error: 'Either audio file (multipart/form-data) or transcript text (JSON body) is required' 
      });
    }

    // Generate transcription ID
    const transcriptionId = `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save the transcript with transcription ID
    await updateLecture(lectureId, {
      transcript,
      transcriptionId,
      status: 'completed',
    });

    res.json({
      success: true,
      transcriptionId,
      transcript,
      message: req.file ? 'Audio transcribed successfully' : 'Transcript saved successfully',
    });
  } catch (error) {
    console.error('Error processing transcript:', error);
    
    // Clean up audio file on error
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }
    
    // Update lecture status to failed
    try {
      await updateLecture(req.params.lectureId, { status: 'failed' });
    } catch (updateError) {
      console.error('Error updating lecture status:', updateError);
    }
    
    res.status(500).json({ error: error.message || 'Failed to process transcript' });
  }
});

/**
 * POST /api/lectures/transcription/:transcriptionId/summary
 * Generate AI summary from transcript using transcription ID
 * NOTE: This route must be defined BEFORE /:lectureId to avoid route conflicts
 * Only requires transcriptionId - no userId needed in body
 */
router.post('/transcription/:transcriptionId/summary', async (req, res) => {
  try {
    const { transcriptionId } = req.params;

    // Find lecture by transcription ID (no userId needed - we get it from the lecture)
    const lecture = await getLectureByTranscriptionId(transcriptionId);
    if (!lecture) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    if (!lecture.transcript) {
      return res.status(400).json({ error: 'Transcript not available. Please transcribe the audio first.' });
    }

    // Generate summary using AI from the transcript
    const summary = await generateSummary(lecture.transcript);

    // Update lecture with summary (preserve existing actionItems if they exist)
    const updatedSummary = {
      ...summary,
      actionItems: lecture.summary?.actionItems || [],
    };

    await updateLecture(lecture.id, { summary: updatedSummary });

    res.json({
      success: true,
      transcriptionId,
      lectureId: lecture.id,
      summary: updatedSummary,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

/**
 * POST /api/lectures/transcription/:transcriptionId/checklist
 * Generate AI checklist from transcript using transcription ID
 * Only requires transcriptionId - no userId needed in body
 */
router.post('/transcription/:transcriptionId/checklist', async (req, res) => {
  try {
    const { transcriptionId } = req.params;

    // Find lecture by transcription ID (no userId needed - we get it from the lecture)
    const lecture = await getLectureByTranscriptionId(transcriptionId);
    if (!lecture) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    if (!lecture.transcript) {
      return res.status(400).json({ error: 'Transcript not available. Please transcribe the audio first.' });
    }

    // Generate checklist using AI from the transcript
    const actionItems = await generateChecklist(lecture.transcript);

    // Update lecture with checklist (merge with existing summary if it exists)
    const summary = {
      ...lecture.summary,
      actionItems,
    };

    await updateLecture(lecture.id, { summary });

    res.json({
      success: true,
      transcriptionId,
      lectureId: lecture.id,
      actionItems,
    });
  } catch (error) {
    console.error('Error generating checklist:', error);
    res.status(500).json({ error: error.message || 'Failed to generate checklist' });
  }
});

/**
 * GET /api/lectures/:lectureId/transcripts
 * Get all transcripts for a lecture
 * NOTE: This route must be defined BEFORE /:lectureId to avoid conflicts
 */
router.get('/:lectureId/transcripts', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get lecture by ID
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Build transcripts array
    // Currently each lecture has one transcript, but structure supports multiple
    const transcripts = [];

    if (lecture.transcript) {
      transcripts.push({
        transcriptionId: lecture.transcriptionId || null,
        transcript: lecture.transcript,
        createdAt: lecture.updatedAt || lecture.createdAt,
        isCurrent: true,
      });
    }

    // If there's a liveTranscript that's different from the main transcript, include it
    if (lecture.liveTranscript && lecture.liveTranscript !== lecture.transcript) {
      transcripts.push({
        transcriptionId: null,
        transcript: lecture.liveTranscript,
        createdAt: lecture.updatedAt || lecture.createdAt,
        isCurrent: false,
        isLive: true,
      });
    }

    res.json({
      success: true,
      lectureId,
      transcripts,
      count: transcripts.length,
    });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transcripts' });
  }
});

/**
 * DELETE /api/lectures/:lectureId/transcript
 * Delete transcript for a lecture
 * NOTE: This route must be defined BEFORE /:lectureId to avoid conflicts
 */
router.delete('/:lectureId/transcript', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId, transcriptionId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // If transcriptionId is provided, verify it matches
    if (transcriptionId && lecture.transcriptionId !== transcriptionId) {
      return res.status(400).json({ error: 'Transcription ID does not match this lecture' });
    }

    // Delete transcript and transcriptionId
    await updateLecture(lectureId, {
      transcript: null,
      transcriptionId: null,
      liveTranscript: null, // Also clear live transcript if it exists
    });

    res.json({
      success: true,
      lectureId,
      message: 'Transcript deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(500).json({ error: error.message || 'Failed to delete transcript' });
  }
});

/**
 * PATCH /api/lectures/:lectureId
 * Update/edit a lecture
 * Can update: title, day, time, place, description, tags, status, and other fields
 * If day, time, or place are updated, the description will be rebuilt automatically
 * NOTE: This route must be defined BEFORE GET /:lectureId to avoid conflicts
 */
router.patch('/:lectureId', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId, title, day, time, place, description, tags, status, ...otherFields } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const updates = { ...otherFields };

    // Update title if provided
    if (title !== undefined) {
      updates.title = title;
    }

    // Update status if provided
    if (status !== undefined) {
      updates.status = status;
    }

    // Handle day, time, place updates
    // If any of these are provided, rebuild the description
    const currentDescription = lecture.description || '';
    let finalDescription = description;

    // Check if we need to rebuild description from day/time/place
    if (day !== undefined || time !== undefined || place !== undefined) {
      // Parse existing description to extract current values
      let currentDay = day !== undefined ? day : null;
      let currentTime = time !== undefined ? time : null;
      let currentPlace = place !== undefined ? place : null;

      // If not provided in update, try to extract from existing description
      if (currentDay === null || currentTime === null || currentPlace === null) {
        const descParts = currentDescription.split(' | ');
        descParts.forEach(part => {
          if (part.startsWith('Day: ') && currentDay === null) {
            currentDay = part.replace('Day: ', '');
          } else if (part.startsWith('Time: ') && currentTime === null) {
            currentTime = part.replace('Time: ', '');
          } else if (part.startsWith('Place: ') && currentPlace === null) {
            currentPlace = part.replace('Place: ', '');
          }
        });
      }

      // If day/time/place are being updated, rebuild description
      if (day !== undefined || time !== undefined || place !== undefined) {
        const descriptionParts = [];
        if (currentDay) descriptionParts.push(`Day: ${currentDay}`);
        if (currentTime) descriptionParts.push(`Time: ${currentTime}`);
        if (currentPlace) descriptionParts.push(`Place: ${currentPlace}`);
        finalDescription = descriptionParts.join(' | ');
      }
    }

    // Update description if provided or rebuilt
    if (finalDescription !== undefined) {
      updates.description = finalDescription;
    }

    // Handle tags update
    if (tags !== undefined) {
      updates.tags = tags;
    } else if (day !== undefined) {
      // If day is updated but tags not provided, update tags
      const currentTags = lecture.tags || [];
      const dayTag = day.toLowerCase();
      
      // Remove old day tags and add new one
      const dayTags = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const filteredTags = currentTags.filter(tag => !dayTags.includes(tag.toLowerCase()));
      
      if (!filteredTags.includes(dayTag)) {
        updates.tags = [...filteredTags, dayTag];
      } else {
        updates.tags = filteredTags;
      }
    }

    // Update the lecture
    await updateLecture(lectureId, updates);

    // Get updated lecture
    const updatedLecture = await getLectureById(lectureId, userId);

    res.json({
      success: true,
      lectureId,
      lecture: updatedLecture,
      message: 'Lecture updated successfully',
    });
  } catch (error) {
    console.error('Error updating lecture:', error);
    res.status(500).json({ error: error.message || 'Failed to update lecture' });
  }
});

/**
 * GET /api/lectures/:lectureId
 * Get lecture details
 * NOTE: This route must be defined AFTER /transcription routes and /:lectureId/transcripts to avoid conflicts
 */
router.get('/:lectureId', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId } = req.query;

    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    res.json({
      success: true,
      lecture,
    });
  } catch (error) {
    console.error('Error fetching lecture:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch lecture' });
  }
});

/**
 * PATCH /api/lectures/transcription/:transcriptionId/checklist/:itemId/toggle
 * Toggle checklist item (check/uncheck)
 * Only requires transcriptionId and itemId - no userId needed
 * NOTE: This route must be defined BEFORE the general checklist update route
 */
router.patch('/transcription/:transcriptionId/checklist/:itemId/toggle', async (req, res) => {
  try {
    const { transcriptionId, itemId } = req.params;

    // Find lecture by transcription ID
    const lecture = await getLectureByTranscriptionId(transcriptionId);
    if (!lecture) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    // Toggle checklist item
    const updatedItem = await toggleChecklistItem(lecture.id, itemId);

    res.json({
      success: true,
      transcriptionId,
      lectureId: lecture.id,
      item: updatedItem,
    });
  } catch (error) {
    console.error('Error toggling checklist item:', error);
    if (error.message === 'Checklist item not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to toggle checklist item' });
  }
});

/**
 * PATCH /api/lectures/transcription/:transcriptionId/checklist
 * Update checklist items (add, edit, delete)
 * Only requires transcriptionId - no userId needed in body
 */
router.patch('/transcription/:transcriptionId/checklist', async (req, res) => {
  try {
    const { transcriptionId } = req.params;
    const { ...checklistUpdates } = req.body;

    // Find lecture by transcription ID
    const lecture = await getLectureByTranscriptionId(transcriptionId);
    if (!lecture) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    // Update checklist
    const actionItems = await updateChecklist(lecture.id, checklistUpdates);

    res.json({
      success: true,
      transcriptionId,
      lectureId: lecture.id,
      actionItems,
    });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: error.message || 'Failed to update checklist' });
  }
});

/**
 * POST /api/lectures/chat
 * Global chatbot (can answer about any lecture)
 */
router.post('/chat', async (req, res) => {
  try {
    const { userId, question } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    // Chat with AI about all lectures
    const response = await chatWithLectures(userId, question);

    // Save chat history
    const chatId = await saveChatMessage(
      userId,
      question,
      response.answer,
      response.lecturesReferenced
    );

    res.json({
      success: true,
      chatId,
      answer: response.answer,
      lecturesReferenced: response.lecturesReferenced,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat' });
  }
});

/**
 * GET /api/lectures/chat/history
 * Get chat history for a user
 */
router.get('/chat/history', async (req, res) => {
  try {
    const { userId, limit } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const limitNum = limit ? parseInt(limit) : 50;
    const chatHistory = await getUserChatHistory(userId, limitNum);

    res.json({
      success: true,
      chatHistory,
      count: chatHistory.length,
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chat history' });
  }
});

/**
 * DELETE /api/lectures/chat/:chatId
 * Delete a specific chat message
 */
router.delete('/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await deleteChatMessage(chatId, userId);

    res.json({
      success: true,
      message: 'Chat message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting chat message:', error);
    if (error.message === 'Chat message not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete chat message' });
  }
});

/**
 * DELETE /api/lectures/chat/history/all
 * Delete all chat history for a user
 */
router.delete('/chat/history/all', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const deletedCount = await deleteAllUserChatHistory(userId);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} chat message(s) successfully`,
      deletedCount,
    });
  } catch (error) {
    console.error('Error deleting chat history:', error);
    res.status(500).json({ error: error.message || 'Failed to delete chat history' });
  }
});

/**
 * GET /api/lectures
 * Get all lectures with optional filters
 * Query params: userId?, status?, limit?, offset?
 */
router.get('/', async (req, res) => {
  try {
    const { userId, status, limit, offset } = req.query;

    let lectures;

    if (userId) {
      // Get lectures for specific user
      lectures = await listUserLectures(userId);
      
      // Filter by status if provided
      if (status) {
        lectures = lectures.filter(lecture => lecture.status === status);
      }
    } else {
      // Get all lectures (you might want to add admin check here)
      // For now, we'll require userId or return empty
      return res.status(400).json({ 
        error: 'userId query parameter is required. Use /api/lectures/user/:userId for user-specific lectures.' 
      });
    }

    // Apply pagination
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;
    
    let paginatedLectures = lectures;
    if (limitNum) {
      paginatedLectures = lectures.slice(offsetNum, offsetNum + limitNum);
    } else if (offsetNum > 0) {
      paginatedLectures = lectures.slice(offsetNum);
    }

    res.json({
      success: true,
      lectures: paginatedLectures,
      count: paginatedLectures.length,
      total: lectures.length,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch lectures' });
  }
});

/**
 * GET /api/lectures/user/:userId
 * List all lectures for a user (with optional query filters)
 * Query params: status?, limit?, offset?
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit, offset } = req.query;

    let lectures = await listUserLectures(userId);

    // Filter by status if provided
    if (status) {
      lectures = lectures.filter(lecture => lecture.status === status);
    }

    // Apply pagination
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;
    
    let paginatedLectures = lectures;
    if (limitNum) {
      paginatedLectures = lectures.slice(offsetNum, offsetNum + limitNum);
    } else if (offsetNum > 0) {
      paginatedLectures = lectures.slice(offsetNum);
    }

    res.json({
      success: true,
      lectures: paginatedLectures,
      count: paginatedLectures.length,
      total: lectures.length,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch lectures' });
  }
});

/**
 * GET /api/lectures/transcription/:transcriptionId/transcript
 * Get transcript by transcription ID
 */
router.get('/transcription/:transcriptionId/transcript', async (req, res) => {
  try {
    const { transcriptionId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Find lecture by transcription ID
    const lecture = await getLectureByTranscriptionId(transcriptionId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    if (!lecture.transcript) {
      return res.status(404).json({ error: 'Transcript not available for this transcription' });
    }

    res.json({
      success: true,
      transcriptionId,
      lectureId: lecture.id,
      transcript: lecture.transcript,
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transcript' });
  }
});

/**
 * GET /api/lectures/transcription/:transcriptionId/summary
 * Get summary by transcription ID
 */
router.get('/transcription/:transcriptionId/summary', async (req, res) => {
  try {
    const { transcriptionId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Find lecture by transcription ID
    const lecture = await getLectureByTranscriptionId(transcriptionId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    if (!lecture.summary) {
      return res.status(404).json({ error: 'Summary not available for this transcription' });
    }

    res.json({
      success: true,
      transcriptionId,
      lectureId: lecture.id,
      summary: lecture.summary,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch summary' });
  }
});

/**
 * GET /api/lectures/transcription/:transcriptionId/checklist
 * Get checklist by transcription ID
 */
router.get('/transcription/:transcriptionId/checklist', async (req, res) => {
  try {
    const { transcriptionId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Find lecture by transcription ID
    const lecture = await getLectureByTranscriptionId(transcriptionId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    // Get checklist items from summary or return empty array
    const actionItems = lecture.summary?.actionItems || [];

    res.json({
      success: true,
      transcriptionId,
      lectureId: lecture.id,
      actionItems,
    });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch checklist' });
  }
});


/**
 * DELETE /api/lectures/:lectureId
 * Delete a lecture
 */
router.delete('/:lectureId', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Delete lecture record (no audio files to delete since we don't save them)
    await deleteLecture(lectureId, userId);

    res.json({
      success: true,
      message: 'Lecture deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    res.status(500).json({ error: error.message || 'Failed to delete lecture' });
  }
});

module.exports = router;

