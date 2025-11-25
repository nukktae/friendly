const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { transcribeAudio } = require('../services/lectureService');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads/audio');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for audio
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/(mpeg|mp3|wav|webm|m4a|ogg|flac)/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = /\.(mp3|wav|webm|m4a|ogg|flac)$/i.test(file.originalname);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only audio files are allowed (mp3, wav, webm, m4a, ogg, flac).'));
    }
  },
});

/**
 * POST /api/transcribe
 * General transcription endpoint for PDF chat and other uses
 * Body: { userId, language? } (multipart/form-data)
 * File: audio (multipart/form-data)
 */
router.post('/', upload.single('audio'), async (req, res) => {
  let audioFilePath = null;
  try {
    const { userId, language } = req.body;

    if (!userId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    audioFilePath = req.file.path;

    // Validate language - allow 'auto' for auto-detection, or specific languages
    // If not provided or invalid, use null to enable auto-detection (preserves original language)
    const validLanguages = ['en', 'ko', 'auto'];
    const transcriptionLanguage = validLanguages.includes(language) 
      ? (language === 'auto' ? null : language) 
      : null; // Default to auto-detection instead of forcing English

    // Transcribe the audio using OpenAI Whisper
    const transcript = await transcribeAudio(audioFilePath, transcriptionLanguage);

    // Delete the audio file after transcription (we only keep the transcript)
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }

    res.json({
      success: true,
      transcript,
      message: 'Audio transcribed successfully',
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    // Clean up temporary file on error
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      try {
        fs.unlinkSync(audioFilePath);
      } catch (unlinkError) {
        console.warn('Failed to delete temp audio file:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
  }
});

module.exports = router;

