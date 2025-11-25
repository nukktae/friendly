const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { createLecture, getLectureById, updateLecture, listUserLectures, deleteLecture, getAllUserLectures } = require('./firestoreService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Create a new lecture record
 */
async function createLectureRecord(userId, metadata = {}) {
  const lectureId = `lecture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const lectureData = {
    id: lectureId,
    userId,
    title: metadata.title || `Lecture ${new Date().toLocaleDateString()}`,
    description: metadata.description || '',
    tags: metadata.tags || [],
    createdAt: new Date(),
    duration: 0,
    status: metadata.status || 'recording',
    summary: null,
    chatHistory: [],
    ...metadata,
  };

  // Only add liveTranscript and transcript if status is not 'draft'
  // Firestore doesn't allow undefined values
  if (metadata.status !== 'draft') {
    lectureData.liveTranscript = '';
    lectureData.transcript = '';
  }

  await createLecture(lectureData);
  return lectureId;
}

/**
 * Note: We don't save audio files permanently.
 * Audio files are only used temporarily for transcription, then deleted.
 * Only the transcript is saved to the database.
 */

/**
 * Transcribe audio chunk using OpenAI Whisper
 * @param {string} audioFile - Path to audio file
 * @param {string} language - Language code (e.g., 'en', 'ko'). If not provided or 'auto', Whisper will auto-detect the language
 */
async function transcribeAudioChunk(audioFile, language = null) {
  try {
    const transcriptionParams = {
      file: fs.createReadStream(audioFile),
      model: 'whisper-1',
    };
    
    // CRITICAL: When Korean is selected, explicitly set language to 'ko' to prevent translation to English
    // When language is null/undefined/'auto', don't pass it - let Whisper auto-detect and transcribe in original language
    // When a specific language is provided, explicitly set it to ensure transcription in that language
    if (language && language !== 'auto' && language !== '' && language !== null && language !== undefined) {
      transcriptionParams.language = language;
      // Add a prompt hint for Korean to help Whisper understand we want Korean transcription, not translation
      if (language === 'ko') {
        transcriptionParams.prompt = '이것은 한국어 음성입니다. 한국어로 전사해주세요.';
      }
      console.log(`[transcribeAudioChunk] Using explicit language: ${language}`);
    } else {
      // For auto-detection, add a prompt to help Whisper detect Korean and transcribe in Korean
      // This helps prevent defaulting to English translation
      transcriptionParams.prompt = 'Please transcribe in the original language. If this is Korean speech, transcribe in Korean.';
      console.log(`[transcribeAudioChunk] Auto-detecting language (language param: ${language})`);
    }
    
    const transcription = await openai.audio.transcriptions.create(transcriptionParams);
    const preview = transcription.text ? transcription.text.substring(0, 100) : '(empty)';
    console.log(`[transcribeAudioChunk] Transcription result preview: ${preview}...`);
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio chunk:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Transcribe complete audio file using OpenAI Whisper
 * @param {string} audioFile - Path to audio file
 * @param {string} language - Language code (e.g., 'en', 'ko'). If not provided or 'auto', Whisper will auto-detect the language
 */
async function transcribeAudio(audioFile, language = null) {
  try {
    console.error('\n========== WHISPER API CALL DEBUG ==========');
    console.error(`[transcribeAudio] Function called with language parameter: ${language}`);
    console.error(`[transcribeAudio] Language type: ${typeof language}`);
    console.error(`[transcribeAudio] Language === null: ${language === null}`);
    console.error(`[transcribeAudio] Language === undefined: ${language === undefined}`);
    console.error(`[transcribeAudio] Language === 'ko': ${language === 'ko'}`);
    console.error(`[transcribeAudio] Language === 'en': ${language === 'en'}`);
    console.error(`[transcribeAudio] Language truthy: ${!!language}`);
    
    // CRITICAL WARNING: If language is 'en', Korean speech will be TRANSLATED to English
    if (language === 'en') {
      console.error(`[transcribeAudio] ⚠️  WARNING: Language is 'en' - Korean speech will be TRANSLATED to English, not transcribed in Korean!`);
      console.error(`[transcribeAudio] ⚠️  If you want Korean transcription, use language='ko' or language=null (auto-detect)`);
    }
    
    const transcriptionParams = {
      file: fs.createReadStream(audioFile),
      model: 'whisper-1',
    };
    
    // CRITICAL: When Korean is selected, explicitly set language to 'ko' to prevent translation to English
    // When language is null/undefined/'auto', don't pass it - let Whisper auto-detect and transcribe in original language
    // When a specific language is provided, explicitly set it to ensure transcription in that language
    if (language && language !== 'auto' && language !== '' && language !== null && language !== undefined) {
      transcriptionParams.language = language;
      // Add a prompt hint for Korean to help Whisper understand we want Korean transcription, not translation
      if (language === 'ko') {
        transcriptionParams.prompt = '이것은 한국어 음성입니다. 한국어로 전사해주세요.';
        console.log(`[transcribeAudio] ✅ Setting language to 'ko' with Korean prompt`);
      } else {
        console.log(`[transcribeAudio] ✅ Setting language to '${language}'`);
      }
    } else {
      // For auto-detection, add a prompt to help Whisper detect Korean and transcribe in Korean
      // This helps prevent defaulting to English translation
      transcriptionParams.prompt = 'Please transcribe in the original language. If this is Korean speech, transcribe in Korean.';
      console.log(`[transcribeAudio] ⚠️  Auto-detecting language (language param: ${language}) - NOT setting language parameter`);
    }
    
    console.log(`[transcribeAudio] Final transcriptionParams:`, JSON.stringify({
      model: transcriptionParams.model,
      language: transcriptionParams.language || '(not set - auto-detect)',
      prompt: transcriptionParams.prompt ? '(set)' : '(not set)',
    }, null, 2));
    
    const transcription = await openai.audio.transcriptions.create(transcriptionParams);
    const preview = transcription.text ? transcription.text.substring(0, 100) : '(empty)';
    console.log(`[transcribeAudio] Transcription result preview: ${preview}...`);
    console.log('==========================================\n');
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Generate summary and key points from transcript (without checklist items)
 */
async function generateSummary(transcript) {
  try {
    const prompt = `Analyze the following lecture transcript and provide:
1. A concise title (max 10 words)
2. Key points (5-7 main points as an array)

Format your response as JSON:
{
  "title": "string",
  "keyPoints": ["string", "string", ...]
}

Transcript:
${transcript}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes lecture transcripts and creates structured summaries. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Try to extract JSON from response (in case it's wrapped in markdown)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonText = responseText.split('```')[1].split('```')[0].trim();
    }

    const summary = JSON.parse(jsonText);
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

/**
 * Generate checklist items from transcript using AI
 */
async function generateChecklist(transcript) {
  try {
    const prompt = `Analyze the following lecture transcript and generate actionable checklist items that a student should complete based on the lecture content.

Generate 4-6 specific, actionable checklist items. Each item should be:
- Specific and actionable (not vague)
- Based on the actual content of the lecture
- Useful for studying or applying the concepts

Format your response as JSON array:
[
  {"text": "string", "checked": false},
  {"text": "string", "checked": false},
  ...
]

Transcript:
${transcript}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes lecture transcripts and creates actionable checklist items for students. Always respond with valid JSON only (an array of objects).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Try to extract JSON from response (in case it's wrapped in markdown)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonText = responseText.split('```')[1].split('```')[0].trim();
    }

    const actionItems = JSON.parse(jsonText);
    
    // Ensure action items have proper structure with IDs
    if (Array.isArray(actionItems)) {
      return actionItems.map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        text: item.text || item,
        checked: item.checked || false,
      }));
    }

    throw new Error('Invalid response format from AI');
  } catch (error) {
    console.error('Error generating checklist:', error);
    throw new Error(`Checklist generation failed: ${error.message}`);
  }
}

/**
 * Chat with AI about all user's lectures (global chatbot)
 */
async function chatWithLectures(userId, question) {
  try {
    // Get all user's lectures for context
    const lectures = await getAllUserLectures(userId);
    
    // Build context from all lectures
    let context = 'The user has the following lectures:\n\n';
    lectures.forEach((lecture, index) => {
      context += `Lecture ${index + 1}: ${lecture.title}\n`;
      if (lecture.transcript) {
        context += `Transcript: ${lecture.transcript.substring(0, 500)}...\n`;
      }
      if (lecture.summary) {
        context += `Summary: ${lecture.summary.title}\n`;
        if (lecture.summary.keyPoints) {
          context += `Key Points: ${lecture.summary.keyPoints.join(', ')}\n`;
        }
      }
      context += '\n';
    });

    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant helping a student with their lecture recordings. You have access to all of their lectures. Answer questions based on the lecture content provided. If the question is about a specific lecture, reference it by title. Be helpful and concise.`,
      },
      {
        role: 'user',
        content: `${context}\n\nUser Question: ${question}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    // Store chat history (optional - could be stored per user globally)
    // For now, we'll return it and let the route handle storage if needed

    return {
      answer: response,
      lecturesReferenced: lectures.map(l => l.title),
    };
  } catch (error) {
    console.error('Error in chat:', error);
    throw new Error(`Chat failed: ${error.message}`);
  }
}

/**
 * Chat with AI about a specific transcript (transcript-specific chatbot)
 * Focuses only on the transcript associated with the transcriptionId
 */
async function chatWithTranscript(transcriptionId, userId, question) {
  try {
    const { getLectureByTranscriptionId } = require('./firestoreService');
    
    // Get the specific lecture by transcriptionId
    const lecture = await getLectureByTranscriptionId(transcriptionId, userId);
    
    if (!lecture) {
      throw new Error('Transcript not found');
    }

    if (!lecture.transcript) {
      throw new Error('Transcript not available for this lecture');
    }

    // Build focused context from this specific transcript
    let context = `Lecture Title: ${lecture.title || 'Untitled Lecture'}\n\n`;
    context += `Full Transcript:\n${lecture.transcript}\n\n`;
    
    if (lecture.summary) {
      context += `Summary: ${lecture.summary.title}\n`;
      if (lecture.summary.keyPoints && lecture.summary.keyPoints.length > 0) {
        context += `Key Points:\n${lecture.summary.keyPoints.map((point, idx) => `  ${idx + 1}. ${point}`).join('\n')}\n\n`;
      }
      if (lecture.summary.actionItems && lecture.summary.actionItems.length > 0) {
        context += `Action Items:\n${lecture.summary.actionItems.map((item, idx) => `  ${idx + 1}. ${item.text}${item.checked ? ' (completed)' : ''}`).join('\n')}\n\n`;
      }
    }

    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant helping a student understand a specific lecture transcript. Focus ONLY on the transcript content provided. Answer questions based solely on what was discussed in this lecture. Be precise, helpful, and reference specific parts of the transcript when relevant. If the question is not related to this transcript, politely redirect the conversation back to the lecture content.`,
      },
      {
        role: 'user',
        content: `${context}\n\nUser Question: ${question}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    return {
      answer: response,
      transcriptionId,
      lectureId: lecture.id,
      lectureTitle: lecture.title || 'Untitled Lecture',
    };
  } catch (error) {
    console.error('Error in transcript chat:', error);
    throw new Error(`Transcript chat failed: ${error.message}`);
  }
}

/**
 * Update checklist items (add, edit, delete)
 * Note: Toggle (check/uncheck) has its own endpoint
 */
async function updateChecklist(lectureId, checklistUpdates) {
  const lecture = await getLectureById(lectureId);
  if (!lecture) {
    throw new Error('Lecture not found');
  }

  let actionItems = lecture.summary?.actionItems || [];

  // Handle different update operations
  if (checklistUpdates.add) {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: checklistUpdates.add.text,
      checked: false,
    };
    actionItems.push(newItem);
  }

  if (checklistUpdates.edit) {
    const itemIndex = actionItems.findIndex(item => item.id === checklistUpdates.edit.id);
    if (itemIndex !== -1) {
      actionItems[itemIndex].text = checklistUpdates.edit.text;
    }
  }

  if (checklistUpdates.delete) {
    actionItems = actionItems.filter(item => item.id !== checklistUpdates.delete.id);
  }

  // Update lecture with new checklist
  const summary = {
    ...lecture.summary,
    actionItems,
  };

  await updateLecture(lectureId, { summary });
  return actionItems;
}

/**
 * Toggle checklist item (check/uncheck)
 */
async function toggleChecklistItem(lectureId, itemId) {
  const lecture = await getLectureById(lectureId);
  if (!lecture) {
    throw new Error('Lecture not found');
  }

  let actionItems = lecture.summary?.actionItems || [];
  const itemIndex = actionItems.findIndex(item => item.id === itemId);
  
  if (itemIndex === -1) {
    throw new Error('Checklist item not found');
  }

  // Toggle the checked status
  actionItems[itemIndex].checked = !actionItems[itemIndex].checked;

  // Update lecture with new checklist
  const summary = {
    ...lecture.summary,
    actionItems,
  };

  await updateLecture(lectureId, { summary });
  return actionItems[itemIndex];
}

module.exports = {
  createLectureRecord,
  transcribeAudioChunk,
  transcribeAudio,
  generateSummary,
  generateChecklist,
  chatWithLectures,
  chatWithTranscript,
  updateChecklist,
  toggleChecklistItem,
};

