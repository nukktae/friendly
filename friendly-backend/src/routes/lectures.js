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
  chatWithTranscript,
  updateChecklist,
  toggleChecklistItem,
} = require('../services/lectureService');
const {
  getLectureById,
  updateLecture,
  listUserLectures,
  getAllUserLectures,
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
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
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
    
    // DEBUG: Log everything about the request
    console.log('\n========== TRANSCRIBE CHUNK REQUEST DEBUG ==========');
    console.log(`[transcribe-chunk] LectureId: ${lectureId}`);
    console.log(`[transcribe-chunk] Request body keys:`, Object.keys(req.body));
    console.log(`[transcribe-chunk] Full request body:`, JSON.stringify(req.body, null, 2));
    
    const { userId, language } = req.body;

    console.log(`[transcribe-chunk] Parsed values - userId: ${userId}, language: "${language}"`);
    console.log(`[transcribe-chunk] Language type: ${typeof language}, value: "${language}"`);
    console.log(`[transcribe-chunk] Language === 'ko': ${language === 'ko'}`);
    console.log(`[transcribe-chunk] Language === 'en': ${language === 'en'}`);
    console.log(`[transcribe-chunk] Language === 'auto': ${language === 'auto'}`);

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Validate language - allow 'auto' for auto-detection, or specific languages
    // If not provided or invalid, use null to enable auto-detection (preserves original language)
    const validLanguages = ['en', 'ko', 'auto'];
    console.log(`[transcribe-chunk] Validating language: "${language}"`);
    console.log(`[transcribe-chunk] Is language in validLanguages? ${validLanguages.includes(language)}`);
    
    const transcriptionLanguage = validLanguages.includes(language) 
      ? (language === 'auto' ? null : language) 
      : null; // Default to auto-detection instead of forcing English

    console.log(`[transcribe-chunk] Received language: "${language}", validated to: ${transcriptionLanguage === null ? 'null (auto-detect)' : transcriptionLanguage}`);
    console.log(`[transcribe-chunk] Will pass to transcribeAudioChunk: ${transcriptionLanguage}`);
    console.log('==========================================\n');

    // Transcribe the chunk
    const chunkTranscript = await transcribeAudioChunk(req.file.path, transcriptionLanguage);

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
    
    // DEBUG: Log everything about the request - FORCE LOGGING
    console.error('\n========== TRANSCRIBE REQUEST DEBUG ==========');
    console.error(`[transcribe] LectureId: ${lectureId}`);
    console.error(`[transcribe] Request body keys:`, Object.keys(req.body));
    console.error(`[transcribe] Full request body:`, JSON.stringify(req.body, null, 2));
    console.error(`[transcribe] Request headers content-type:`, req.headers['content-type']);
    console.error(`[transcribe] Raw req.body.language:`, req.body.language);
    console.error(`[transcribe] req.body.language type:`, typeof req.body.language);
    
    const { userId, transcript: transcriptText, duration, language } = req.body;
    
    // CRITICAL: Check if language is missing or undefined, and log it
    if (!language || language === undefined) {
      console.error(`[transcribe] ⚠️  WARNING: Language is missing or undefined!`);
      console.error(`[transcribe] req.body contents:`, req.body);
    }
    
    // CRITICAL FIX: If language is 'en' but user is speaking Korean, force auto-detection
    // This prevents Korean speech from being translated to English
    let actualLanguage = language;
    if (language === 'en') {
      console.error(`[transcribe] ⚠️  WARNING: Language is 'en'. If user is speaking Korean, this will translate instead of transcribe!`);
      console.error(`[transcribe] ⚠️  Consider using 'auto' or 'ko' for Korean speech.`);
    }

    // Debug: Log the entire request body to see what we're receiving
    console.log(`[transcribe] Parsed values - userId: ${userId}, language: "${language}", duration: ${duration}`);
    console.log(`[transcribe] Language type: ${typeof language}, value: "${language}"`);
    console.log(`[transcribe] Language === 'ko': ${language === 'ko'}`);
    console.log(`[transcribe] Language === 'en': ${language === 'en'}`);
    console.log(`[transcribe] Language === 'auto': ${language === 'auto'}`);
    console.log(`[transcribe] Language truthy check: ${!!language}`);

    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Validate language - allow 'auto' for auto-detection, or specific languages
    // If not provided or invalid, use null to enable auto-detection (preserves original language)
    const validLanguages = ['en', 'ko', 'auto'];
    console.error(`[transcribe] Validating language: "${language}"`);
    console.error(`[transcribe] Is language in validLanguages? ${validLanguages.includes(language)}`);
    
    // CRITICAL FIX: If language is missing/undefined, default to null (auto-detect) NOT 'en'
    // This ensures Korean speech is transcribed in Korean, not translated to English
    let transcriptionLanguage;
    if (!language || language === undefined || language === null || language === '') {
      console.error(`[transcribe] ⚠️  Language is missing/undefined/null/empty, using null (auto-detect)`);
      transcriptionLanguage = null;
    } else if (validLanguages.includes(language)) {
      // If 'auto', use null for auto-detection
      // If 'ko', use 'ko' explicitly
      // If 'en', use 'en' BUT warn that this might translate Korean to English
      if (language === 'auto') {
        transcriptionLanguage = null;
      } else if (language === 'ko') {
        transcriptionLanguage = 'ko';
        console.error(`[transcribe] ✅ Using Korean language - will transcribe in Korean`);
      } else if (language === 'en') {
        transcriptionLanguage = 'en';
        console.error(`[transcribe] ⚠️  Using English language - Korean speech will be TRANSLATED to English!`);
      } else {
        transcriptionLanguage = language;
      }
    } else {
      console.error(`[transcribe] ⚠️  Invalid language "${language}", defaulting to null (auto-detect)`);
      transcriptionLanguage = null; // Default to auto-detect, NOT 'en'
    }

    console.error(`[transcribe] Received language: "${language}", validated to: ${transcriptionLanguage === null ? 'null (auto-detect)' : transcriptionLanguage}`);
    console.error(`[transcribe] Will pass to transcribeAudio: ${transcriptionLanguage}`);
    console.error('==========================================\n');

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
      transcript = await transcribeAudio(audioFilePath, transcriptionLanguage);

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
 * POST /api/lectures/transcription/:transcriptionId/chat
 * Chat with AI about a specific transcript (transcript-specific chatbot)
 */
router.post('/transcription/:transcriptionId/chat', async (req, res) => {
  try {
    const { transcriptionId } = req.params;
    const { userId, question } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    // Chat with AI about this specific transcript
    const response = await chatWithTranscript(transcriptionId, userId, question);

    // Save chat history (optional - could store per transcriptionId)
    const chatId = await saveChatMessage(
      userId,
      question,
      response.answer,
      [response.lectureTitle] // Reference the specific lecture
    );

    res.json({
      success: true,
      chatId,
      answer: response.answer,
      transcriptionId: response.transcriptionId,
      lectureId: response.lectureId,
      lecturesReferenced: [response.lectureTitle],
    });
  } catch (error) {
    console.error('Error in transcript chat:', error);
    res.status(500).json({ error: error.message || 'Failed to process transcript chat' });
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
 * GET /api/lectures/class/:lectureId/recordings
 * Get all recordings (lectures) for a specific class
 * Matches lectures by title or description to find related recordings
 */
router.get('/class/:lectureId/recordings', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get the class lecture to find matching recordings
    const classLecture = await getLectureById(lectureId, userId);
    if (!classLecture) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get all user lectures
    const allLectures = await getAllUserLectures(userId);

    // Filter lectures that match this class
    // Match by exact title or similar description (same day/time/place)
    const matchingLectures = allLectures.filter(lecture => {
      // Exact title match
      if (lecture.title === classLecture.title) {
        return true;
      }

      // Match by description (same day/time/place)
      if (classLecture.description && lecture.description) {
        const classDesc = classLecture.description.toLowerCase();
        const lectureDesc = lecture.description.toLowerCase();
        
        // Extract day, time, place from descriptions
        const extractDay = (desc) => {
          const dayMatch = desc.match(/day:\s*([^|]+)/i);
          return dayMatch ? dayMatch[1].trim() : null;
        };
        
        const extractTime = (desc) => {
          const timeMatch = desc.match(/time:\s*([^|]+)/i);
          return timeMatch ? timeMatch[1].trim() : null;
        };
        
        const extractPlace = (desc) => {
          const placeMatch = desc.match(/place:\s*([^|]+)/i);
          return placeMatch ? placeMatch[1].trim() : null;
        };

        const classDay = extractDay(classDesc);
        const classTime = extractTime(classDesc);
        const classPlace = extractPlace(classDesc);

        const lectureDay = extractDay(lectureDesc);
        const lectureTime = extractTime(lectureDesc);
        const lecturePlace = extractPlace(lectureDesc);

        // Match if day and time are the same (most reliable)
        if (classDay && lectureDay && classTime && lectureTime) {
          if (classDay === lectureDay && classTime === lectureTime) {
            return true;
          }
        }

        // Match if place and time are the same
        if (classPlace && lecturePlace && classTime && lectureTime) {
          if (classPlace === lecturePlace && classTime === lectureTime) {
            return true;
          }
        }
      }

      // Match by tags (day tags)
      if (classLecture.tags && lecture.tags && classLecture.tags.length > 0) {
        const commonTags = classLecture.tags.filter(tag => lecture.tags.includes(tag));
        if (commonTags.length > 0 && lecture.title.toLowerCase().includes(classLecture.title.toLowerCase().substring(0, 5))) {
          return true;
        }
      }

      return false;
    });

    // Convert to recordings format
    const recordings = matchingLectures
      .filter(lecture => lecture.transcript || lecture.status === 'completed' || lecture.status === 'processing')
      .map(lecture => {
        const createdAt = lecture.createdAt 
          ? (typeof lecture.createdAt === 'string' 
              ? lecture.createdAt 
              : new Date(lecture.createdAt._seconds * 1000).toISOString())
          : new Date().toISOString();

        return {
          id: lecture.id,
          title: lecture.title,
          recordedAt: createdAt,
          duration: lecture.duration || 0,
          status: lecture.status === 'completed' ? 'ready' : lecture.status === 'processing' ? 'processing' : 'failed',
          transcriptId: lecture.transcriptionId,
        };
      })
      .sort((a, b) => {
        // Sort by date, newest first
        const dateA = new Date(a.recordedAt || 0).getTime();
        const dateB = new Date(b.recordedAt || 0).getTime();
        return dateB - dateA;
      });

    res.json({
      success: true,
      recordings,
      count: recordings.length,
    });
  } catch (error) {
    console.error('Error fetching class recordings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch class recordings' });
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
    console.log('[DELETE /api/lectures/:lectureId] Request received');
    const { lectureId } = req.params;
    const { userId } = req.query;

    console.log('[DELETE] lectureId:', lectureId);
    console.log('[DELETE] userId:', userId);
    console.log('[DELETE] req.params:', req.params);
    console.log('[DELETE] req.query:', req.query);

    if (!userId) {
      console.error('[DELETE] ❌ userId is missing');
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!lectureId) {
      console.error('[DELETE] ❌ lectureId is missing');
      return res.status(400).json({ error: 'lectureId is required' });
    }

    console.log('[DELETE] Verifying lecture ownership...');
    // Verify lecture ownership
    const lecture = await getLectureById(lectureId, userId);
    if (!lecture) {
      console.error('[DELETE] ❌ Lecture not found or user does not own it');
      return res.status(404).json({ error: 'Lecture not found' });
    }

    console.log('[DELETE] ✅ Lecture found. Proceeding with deletion...');
    // Delete lecture record (no audio files to delete since we don't save them)
    await deleteLecture(lectureId, userId);

    console.log('[DELETE] ✅ Lecture deleted successfully');
    res.json({
      success: true,
      message: 'Lecture deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE] ❌ Error deleting lecture:', error);
    console.error('[DELETE] Error message:', error.message);
    console.error('[DELETE] Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to delete lecture' });
  }
});

module.exports = router;

