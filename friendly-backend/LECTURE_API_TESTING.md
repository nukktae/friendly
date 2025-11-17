# Lecture Recording API Testing Guide

## Important: Audio Files Are Not Saved

**The system only saves transcripts, not audio files.** When you upload an audio file:
1. The audio is transcribed using OpenAI Whisper
2. The transcript is saved to the database
3. The audio file is immediately deleted

This approach:
- Saves storage space
- Protects user privacy (no audio recordings stored)
- Focuses on the transcript as the primary data

## Base URL
```
http://localhost:4000/api/lectures
```

## Endpoints

### 1. Create Lecture (Simple Creation)

**POST** `/api/lectures`

**Request Body:**
```json
{
  "userId": "user123",
  "title": "Math 101 - Linear Algebra",
  "description": "Introduction to linear algebra concepts",
  "tags": ["math", "linear-algebra", "lecture"]
}
```

**Response:**
```json
{
  "success": true,
  "lectureId": "lecture_1234567890_abc123",
  "lecture": {
    "id": "lecture_1234567890_abc123",
    "userId": "user123",
    "title": "Math 101 - Linear Algebra",
    "description": "Introduction to linear algebra concepts",
    "tags": ["math", "linear-algebra", "lecture"],
    "status": "draft",
    "createdAt": "2024-01-15T10:00:00Z",
    "duration": 0
  },
  "message": "Lecture created successfully"
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Math 101 - Linear Algebra",
    "description": "Introduction to linear algebra concepts",
    "tags": ["math", "linear-algebra"]
  }'
```

---

### 2. Start Lecture Recording Session

**POST** `/api/lectures/start`

**Request Body:**
```json
{
  "userId": "user123",
  "title": "Math 101 - Linear Algebra"
}
```

**Response:**
```json
{
  "success": true,
  "lectureId": "lecture_1234567890_abc123",
  "message": "Lecture recording session started"
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Math 101 - Linear Algebra"
  }'
```

---

### 3. Upload Audio Chunk (Live Transcription)

**POST** `/api/lectures/:lectureId/transcribe-chunk`

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `audio`: Audio file (mp3, m4a, wav, webm)
  - `userId`: string

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/transcribe-chunk \
  -F "audio=@/path/to/audio-chunk.m4a" \
  -F "userId=user123"
```

**Response:**
```json
{
  "success": true,
  "transcript": "Welcome to today's lecture on linear algebra...",
  "liveTranscript": "Welcome to today's lecture on linear algebra..."
}
```

---

### 4. Upload Complete Audio File

**POST** `/api/lectures/:lectureId/upload`

**Important:** This endpoint uploads the audio, transcribes it immediately using Whisper, saves the transcript, and then deletes the audio file. Only the transcript is saved, not the audio file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `audio`: Complete audio file (mp3, m4a, wav, webm)
  - `userId`: string
  - `duration`: number (seconds)

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/upload \
  -F "audio=@/path/to/complete-lecture.m4a" \
  -F "userId=user123" \
  -F "duration=720"
```

**Response:**
```json
{
  "success": true,
  "message": "Audio transcribed successfully. Transcript saved.",
  "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations..."
}
```

---

### 5. Transcribe Audio File OR Add Direct Transcript Text

**POST** `/api/lectures/:lectureId/transcribe`

**Important:** This endpoint supports two modes:
1. **Audio file upload** - Uploads audio, transcribes it, deletes audio, saves transcript
2. **Direct transcript text** - Accepts transcript text directly in JSON body (no audio file needed)

---

#### Mode 1: Audio File Upload

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `audio`: Audio file (mp3, m4a, wav, webm)
  - `userId`: string

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/transcribe \
  -F "audio=@/path/to/audio.m4a" \
  -F "userId=user123"
```

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations, vector spaces, and eigenvalues...",
  "message": "Audio transcribed successfully"
}
```

---

#### Mode 2: Direct Transcript Text (JSON Body)

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body:
```json
{
  "userId": "user123",
  "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations, vector spaces, and eigenvalues. Today we'll start with basic matrix operations..."
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations, vector spaces, and eigenvalues..."
  }'
```

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations, vector spaces, and eigenvalues...",
  "message": "Transcript saved successfully"
}
```

**Note:** 
- Use Mode 1 if you have an audio file that needs transcription
- Use Mode 2 if you already have the transcript text and want to save it directly
- The `/upload` endpoint (endpoint #4) already transcribes automatically, so you typically don't need Mode 1 unless you want to transcribe separately

---

### 6. Generate Summary (AI-Powered)

**POST** `/api/lectures/transcription/:transcriptionId/summary`

**Important:** This endpoint uses AI to generate a summary (title and key points) from the transcript. It uses the transcription ID, not the lecture ID.

**Request Body:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "lectureId": "lecture_1234567890_abc123",
  "summary": {
    "title": "Linear Algebra Fundamentals",
    "keyPoints": [
      "Introduction to matrix operations and properties",
      "Vector spaces and subspaces explained",
      "Eigenvalues and eigenvectors applications",
      "Linear transformations and their properties",
      "Practical applications in computer graphics"
    ],
    "actionItems": []
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/transcription/transcript_1234567890_abc123xyz/summary \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123"
  }'
```

**Note:** 
- Uses OpenAI GPT to analyze the transcript and generate a concise title and key points
- Preserves existing checklist items if they exist
- Requires a valid transcript to be available first

---

### 7. Generate Checklist (AI-Powered)

**POST** `/api/lectures/transcription/:transcriptionId/checklist`

**Important:** This endpoint uses AI to generate actionable checklist items from the transcript. It uses the transcription ID, not the lecture ID.

**Request Body:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "lectureId": "lecture_1234567890_abc123",
  "actionItems": [
    {
      "id": "item_1234567890_0",
      "text": "Complete practice problems on matrix multiplication",
      "checked": false
    },
    {
      "id": "item_1234567890_1",
      "text": "Review vector space axioms",
      "checked": false
    },
    {
      "id": "item_1234567890_2",
      "text": "Study eigenvalue decomposition examples",
      "checked": false
    },
    {
      "id": "item_1234567890_3",
      "text": "Practice solving systems of linear equations",
      "checked": false
    }
  ]
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/transcription/transcript_1234567890_abc123xyz/checklist \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123"
  }'
```

**Note:** 
- Uses OpenAI GPT to analyze the transcript and generate 4-6 specific, actionable checklist items
- Each item is based on the actual lecture content
- Items are automatically assigned unique IDs
- Merges with existing summary if it exists

---

### 8. Get Lecture Details

**GET** `/api/lectures/:lectureId?userId=user123`

**Response:**
```json
{
  "success": true,
  "lecture": {
    "id": "lecture_1234567890_abc123",
    "userId": "user123",
    "title": "Math 101 - Linear Algebra",
    "createdAt": "2024-01-15T10:00:00Z",
    "duration": 720,
    "transcript": "Welcome to today's lecture...",
    "liveTranscript": "Welcome to today's lecture...",
    "summary": {
      "title": "Linear Algebra Fundamentals",
      "keyPoints": [...],
      "actionItems": [...]
    },
    "status": "completed"
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:4000/api/lectures/lecture_1234567890_abc123?userId=user123"
```

---

### 9. Update Checklist (Edit Existing Items)

**PATCH** `/api/lectures/:lectureId/checklist`

**Request Body Examples:**

**Toggle checkbox:**
```json
{
  "userId": "user123",
  "toggle": {
    "id": "item_1234567890_0"
  }
}
```

**Add new item:**
```json
{
  "userId": "user123",
  "add": {
    "text": "Complete homework assignment 3"
  }
}
```

**Edit item:**
```json
{
  "userId": "user123",
  "edit": {
    "id": "item_1234567890_0",
    "text": "Complete practice problems on matrix multiplication (revised)"
  }
}
```

**Delete item:**
```json
{
  "userId": "user123",
  "delete": {
    "id": "item_1234567890_0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "actionItems": [
    {
      "id": "item_1234567890_0",
      "text": "Complete practice problems on matrix multiplication",
      "checked": true
    },
    {
      "id": "item_1234567890_1",
      "text": "Review vector space axioms",
      "checked": false
    }
  ]
}
```

**cURL (Toggle):**
```bash
curl -X PATCH http://localhost:4000/api/lectures/lecture_1234567890_abc123/checklist \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "toggle": {
      "id": "item_1234567890_0"
    }
  }'
```

---

### 9. Get Transcript by Transcription ID

**GET** `/api/lectures/transcription/:transcriptionId/transcript?userId=user123`

**Query Parameters:**
- `userId` (required): User ID for ownership verification

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "lectureId": "lecture_1234567890_abc123",
  "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations, vector spaces, and eigenvalues..."
}
```

**cURL:**
```bash
curl -X GET "http://localhost:4000/api/lectures/transcription/transcript_1234567890_abc123xyz/transcript?userId=user123"
```

---

### 10. Get Summary by Transcription ID

**GET** `/api/lectures/transcription/:transcriptionId/summary?userId=user123`

**Query Parameters:**
- `userId` (required): User ID for ownership verification

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "lectureId": "lecture_1234567890_abc123",
  "summary": {
    "title": "Linear Algebra Fundamentals",
    "keyPoints": [
      "Introduction to matrix operations and properties",
      "Vector spaces and subspaces explained",
      "Eigenvalues and eigenvectors applications"
    ],
    "actionItems": [
      {
        "id": "item_1234567890_0",
        "text": "Complete practice problems on matrix multiplication",
        "checked": false
      }
    ]
  }
}
```

**cURL:**
```bash
curl -X GET "http://localhost:4000/api/lectures/transcription/transcript_1234567890_abc123xyz/summary?userId=user123"
```

---

### 11. Get Checklist by Transcription ID

**GET** `/api/lectures/transcription/:transcriptionId/checklist?userId=user123`

**Query Parameters:**
- `userId` (required): User ID for ownership verification

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "lectureId": "lecture_1234567890_abc123",
  "actionItems": [
    {
      "id": "item_1234567890_0",
      "text": "Complete practice problems on matrix multiplication",
      "checked": false
    },
    {
      "id": "item_1234567890_1",
      "text": "Review vector space axioms",
      "checked": true
    }
  ]
}
```

**cURL:**
```bash
curl -X GET "http://localhost:4000/api/lectures/transcription/transcript_1234567890_abc123xyz/checklist?userId=user123"
```

---

### 12. Global Chatbot

**POST** `/api/lectures/chat`

**Request Body:**
```json
{
  "userId": "user123",
  "question": "What are the main topics covered in my lectures?"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Based on your lectures, the main topics covered include:\n\n1. Linear Algebra Fundamentals - covering matrix operations, vector spaces, and eigenvalues\n2. Calculus Review - derivatives and integrals\n\nThese topics form the foundation for advanced mathematics courses.",
  "lecturesReferenced": [
    "Math 101 - Linear Algebra",
    "Calculus Review"
  ]
}
```

**cURL:**
```bash
curl -X POST http://localhost:4000/api/lectures/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "question": "What are the main topics covered in my lectures?"
  }'
```

**More Question Examples:**
```json
{
  "userId": "user123",
  "question": "Explain eigenvalues in simple terms"
}
```

```json
{
  "userId": "user123",
  "question": "What should I study for the exam based on my lecture recordings?"
}
```

---

### 13. Get All Lectures (with filters)

**GET** `/api/lectures?userId=user123&status=completed&limit=10&offset=0`

**Query Parameters:**
- `userId` (required): Filter by user ID
- `status` (optional): Filter by status (`draft`, `recording`, `processing`, `completed`, `failed`)
- `limit` (optional): Number of results to return
- `offset` (optional): Number of results to skip (for pagination)

**Response:**
```json
{
  "success": true,
  "lectures": [
    {
      "id": "lecture_1234567890_abc123",
      "userId": "user123",
      "title": "Math 101 - Linear Algebra",
      "createdAt": "2024-01-15T10:00:00Z",
      "duration": 720,
      "status": "completed"
    }
  ],
  "count": 1,
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

**cURL Examples:**

Get all completed lectures for a user:
```bash
curl -X GET "http://localhost:4000/api/lectures?userId=user123&status=completed"
```

Get lectures with pagination:
```bash
curl -X GET "http://localhost:4000/api/lectures?userId=user123&limit=10&offset=0"
```

Get draft lectures:
```bash
curl -X GET "http://localhost:4000/api/lectures?userId=user123&status=draft"
```

---

### 14. List User Lectures (with filters)

**GET** `/api/lectures/user/:userId?status=completed&limit=10&offset=0`

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `recording`, `processing`, `completed`, `failed`)
- `limit` (optional): Number of results to return
- `offset` (optional): Number of results to skip (for pagination)

**Response:**
```json
{
  "success": true,
  "lectures": [
    {
      "id": "lecture_1234567890_abc123",
      "userId": "user123",
      "title": "Math 101 - Linear Algebra",
      "createdAt": "2024-01-15T10:00:00Z",
      "duration": 720,
      "status": "completed"
    },
    {
      "id": "lecture_9876543210_xyz789",
      "userId": "user123",
      "title": "Physics 201 - Mechanics",
      "createdAt": "2024-01-14T14:00:00Z",
      "duration": 540,
      "status": "completed"
    }
  ],
  "count": 2,
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

**cURL Examples:**

Get all lectures for a user:
```bash
curl -X GET http://localhost:4000/api/lectures/user/user123
```

Get only completed lectures:
```bash
curl -X GET "http://localhost:4000/api/lectures/user/user123?status=completed"
```

Get lectures with pagination:
```bash
curl -X GET "http://localhost:4000/api/lectures/user/user123?limit=10&offset=0"
```

---

### 15. Delete Lecture

**DELETE** `/api/lectures/:lectureId?userId=user123`

**Response:**
```json
{
  "success": true,
  "message": "Lecture deleted successfully"
}
```

**cURL:**
```bash
curl -X DELETE "http://localhost:4000/api/lectures/lecture_1234567890_abc123?userId=user123"
```

---

## Complete Workflow Examples

### Workflow 1: Create and Record Lecture

### Step 1: Start Recording
```bash
curl -X POST http://localhost:4000/api/lectures/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test Lecture"
  }'
```
**Save the `lectureId` from response**

### Step 2: Upload Audio File
```bash
curl -X POST http://localhost:4000/api/lectures/LECTURE_ID_HERE/upload \
  -F "audio=@test-audio.m4a" \
  -F "userId=user123" \
  -F "duration=120"
```

### Step 3: Generate Summary (using transcription ID from step 2)
```bash
# Use the transcriptionId from the transcribe response
curl -X POST http://localhost:4000/api/lectures/transcription/TRANSCRIPTION_ID_HERE/summary \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

### Step 4: Generate Checklist (using transcription ID)
```bash
# Use the transcriptionId from step 2
curl -X POST http://localhost:4000/api/lectures/transcription/TRANSCRIPTION_ID_HERE/checklist \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

### Step 5: Get Lecture
```bash
curl -X GET "http://localhost:4000/api/lectures/LECTURE_ID_HERE?userId=user123"
```

### Step 5: Chat with AI
```bash
curl -X POST http://localhost:4000/api/lectures/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "question": "Summarize my lectures"
  }'
```

---

### Workflow 2: Create Draft Lecture (No Recording)

### Step 1: Create Lecture
```bash
curl -X POST http://localhost:4000/api/lectures \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Future Lecture - Calculus",
    "description": "Planning to record this next week",
    "tags": ["math", "calculus"]
  }'
```

### Step 2: Get All Draft Lectures
```bash
curl -X GET "http://localhost:4000/api/lectures/user/user123?status=draft"
```

### Step 3: Later, start recording from draft
Use the lecture ID from step 1 and proceed with upload/transcribe workflow.

---

### Workflow 3: Get and Filter Lectures

### Get all completed lectures:
```bash
curl -X GET "http://localhost:4000/api/lectures/user/user123?status=completed"
```

### Get lectures with pagination (10 per page):
```bash
# Page 1
curl -X GET "http://localhost:4000/api/lectures/user/user123?limit=10&offset=0"

# Page 2
curl -X GET "http://localhost:4000/api/lectures/user/user123?limit=10&offset=10"
```

### Get all lectures (no filter):
```bash
curl -X GET http://localhost:4000/api/lectures/user/user123
```

---

### Workflow 4: Using Transcription ID to Access Resources

After creating a transcription, you can use the `transcriptionId` to access transcript, summary, and checklist directly.

**Step 1: Create and transcribe a lecture**
```bash
# Create lecture and get transcriptionId from response
RESPONSE=$(curl -s -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "transcript": "Welcome to today's lecture..."
  }')

TRANSCRIPTION_ID=$(echo $RESPONSE | grep -o '"transcriptionId":"[^"]*' | cut -d'"' -f4)
echo "Transcription ID: $TRANSCRIPTION_ID"
```

**Step 2: Get transcript by transcription ID**
```bash
curl -X GET "http://localhost:4000/api/lectures/transcription/$TRANSCRIPTION_ID/transcript?userId=user123"
```

**Step 3: Get summary by transcription ID**
```bash
curl -X GET "http://localhost:4000/api/lectures/transcription/$TRANSCRIPTION_ID/summary?userId=user123"
```

**Step 4: Get checklist by transcription ID**
```bash
curl -X GET "http://localhost:4000/api/lectures/transcription/$TRANSCRIPTION_ID/checklist?userId=user123"
```

---

## Postman Collection

### Environment Variables
- `base_url`: `http://localhost:4000`
- `userId`: `user123`
- `lectureId`: (set after creating lecture)

### Collection Structure
1. **Start Lecture** - POST `/api/lectures/start`
2. **Upload Audio** - POST `/api/lectures/:lectureId/upload` (returns transcriptionId)
3. **Transcribe** - POST `/api/lectures/:lectureId/transcribe` (returns transcriptionId)
4. **Generate Summary** - POST `/api/lectures/transcription/:transcriptionId/summary` (AI-powered)
5. **Generate Checklist** - POST `/api/lectures/transcription/:transcriptionId/checklist` (AI-powered)
6. **Get Lecture** - GET `/api/lectures/:lectureId`
7. **Update Checklist** - PATCH `/api/lectures/:lectureId/checklist`
8. **Chat** - POST `/api/lectures/chat`
9. **Get Transcript by Transcription ID** - GET `/api/lectures/transcription/:transcriptionId/transcript`
10. **Get Summary by Transcription ID** - GET `/api/lectures/transcription/:transcriptionId/summary`
11. **Get Checklist by Transcription ID** - GET `/api/lectures/transcription/:transcriptionId/checklist`
12. **List Lectures** - GET `/api/lectures/user/:userId`
13. **Delete Lecture** - DELETE `/api/lectures/:lectureId`

---

## Testing Notes

1. **Audio File Formats**: Supported formats are mp3, m4a, wav, webm
2. **File Size Limit**: 50MB maximum
3. **OpenAI API Key**: Must be set in `.env` as `OPENAI_API_KEY`
4. **User ID**: Use a valid Firebase user ID for testing
5. **Processing Time**: Transcription and summary generation may take 10-30 seconds depending on audio length
6. **Audio Files Are NOT Saved**: Audio files are only used temporarily for transcription, then immediately deleted. Only transcripts are saved to the database.
7. **Automatic Transcription**: The `/upload` endpoint automatically transcribes audio - no separate transcribe call needed
8. **Transcript is Primary Data**: All features (summary, chatbot, etc.) work from the saved transcript, not audio files

---

## Error Responses

**400 Bad Request:**
```json
{
  "error": "userId is required"
}
```

**404 Not Found:**
```json
{
  "error": "Lecture not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Transcription failed: [error message]"
}
```

---

## Testing the Updated Endpoints

### Testing `/api/lectures/:lectureId/upload` (Auto-Transcribe)

This endpoint now **automatically transcribes** the audio file, saves the transcript, and deletes the audio file.

**Step-by-Step Test:**

1. **Create a lecture first:**
```bash
curl -X POST http://localhost:4000/api/lectures/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test Lecture"
  }'
```

**Response:**
```json
{
  "success": true,
  "lectureId": "lecture_1234567890_abc123"
}
```

2. **Upload audio file (transcribes automatically):**
```bash
curl -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/upload \
  -F "audio=@/path/to/your-audio-file.m4a" \
  -F "userId=user123" \
  -F "duration=120"
```

**What happens:**
- ✅ Audio file is uploaded
- ✅ Immediately transcribed using OpenAI Whisper
- ✅ Transcript is saved to database
- ✅ Audio file is deleted (not saved)
- ✅ Lecture status updated to `completed`

**Response:**
```json
{
  "success": true,
  "message": "Audio transcribed successfully. Transcript saved.",
  "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations..."
}
```

3. **Verify transcript was saved:**
```bash
curl -X GET "http://localhost:4000/api/lectures/lecture_1234567890_abc123?userId=user123"
```

**Expected response includes:**
```json
{
  "success": true,
  "lecture": {
    "id": "lecture_1234567890_abc123",
    "transcript": "Welcome to today's lecture...",
    "status": "completed",
    "audioUrl": null  // No audio URL - file was deleted
  }
}
```

---

### Testing `/api/lectures/:lectureId/transcribe` (Two Modes)

This endpoint supports **two modes**: audio file upload OR direct transcript text.

---

#### Mode 1: Audio File Upload

**Step-by-Step Test:**

1. **Create a lecture:**
```bash
curl -X POST http://localhost:4000/api/lectures/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test Lecture 2"
  }'
```

2. **Transcribe audio file directly:**
```bash
curl -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/transcribe \
  -F "audio=@/path/to/your-audio-file.m4a" \
  -F "userId=user123"
```

**What happens:**
- ✅ Audio file is uploaded
- ✅ Transcribed using OpenAI Whisper
- ✅ Transcript is saved to database
- ✅ Audio file is deleted (not saved)
- ✅ Lecture status updated to `completed`

---

#### Mode 2: Direct Transcript Text (JSON Body)

**Step-by-Step Test:**

1. **Create a lecture:**
```bash
curl -X POST http://localhost:4000/api/lectures/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test Lecture 3"
  }'
```

2. **Add transcript text directly:**
```bash
curl -X POST http://localhost:4000/api/lectures/lecture_1234567890_abc123/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations, vector spaces, and eigenvalues. Today we'll start with basic matrix operations and then move on to more advanced topics."
  }'
```

**What happens:**
- ✅ Transcript text is received
- ✅ Transcript is saved to database
- ✅ Lecture status updated to `completed`

**Response:**
```json
{
  "success": true,
  "transcriptionId": "transcript_1234567890_abc123xyz",
  "transcript": "Welcome to today's lecture on linear algebra. We'll be covering matrix operations, vector spaces, and eigenvalues. Today we'll start with basic matrix operations and then move on to more advanced topics.",
  "message": "Transcript saved successfully"
}
```

**Note:** 
- The `transcriptionId` is a unique identifier for this specific transcription (e.g., `transcript_1234567890_abc123xyz`)
- Use Mode 1 if you have an audio file that needs transcription
- Use Mode 2 if you already have the transcript text and want to save it directly (useful for manual entry or importing from other sources)

---

### Complete Testing Workflow (Recommended)

**Option 1: Using `/upload` endpoint (Recommended - One Step)**

```bash
# 1. Start lecture
LECTURE_ID=$(curl -s -X POST http://localhost:4000/api/lectures/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "title": "Math Lecture"}' \
  | grep -o '"lectureId":"[^"]*' | cut -d'"' -f4)

echo "Lecture ID: $LECTURE_ID"

# 2. Upload and transcribe (one step)
curl -X POST "http://localhost:4000/api/lectures/$LECTURE_ID/upload" \
  -F "audio=@test-audio.m4a" \
  -F "userId=user123" \
  -F "duration=120"

# 3. Get transcriptionId from upload response, then generate summary
# (In real usage, extract transcriptionId from upload response)
TRANSCRIPTION_ID="transcript_1234567890_abc123xyz"  # Replace with actual ID from step 2

curl -X POST "http://localhost:4000/api/lectures/transcription/$TRANSCRIPTION_ID/summary" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# 4. Generate checklist
curl -X POST "http://localhost:4000/api/lectures/transcription/$TRANSCRIPTION_ID/checklist" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# 5. Get final lecture (verify transcript, summary, and checklist are saved)
curl -X GET "http://localhost:4000/api/lectures/$LECTURE_ID?userId=user123"
```

**Option 2: Using `/transcribe` endpoint (Alternative)**

```bash
# 1. Start lecture
LECTURE_ID=$(curl -s -X POST http://localhost:4000/api/lectures/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "title": "Math Lecture"}' \
  | grep -o '"lectureId":"[^"]*' | cut -d'"' -f4)

# 2. Transcribe audio (get transcriptionId from response)
RESPONSE=$(curl -s -X POST "http://localhost:4000/api/lectures/$LECTURE_ID/transcribe" \
  -F "audio=@test-audio.m4a" \
  -F "userId=user123")

TRANSCRIPTION_ID=$(echo $RESPONSE | grep -o '"transcriptionId":"[^"]*' | cut -d'"' -f4)
echo "Transcription ID: $TRANSCRIPTION_ID"

# 3. Generate summary using transcription ID
curl -X POST "http://localhost:4000/api/lectures/transcription/$TRANSCRIPTION_ID/summary" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# 4. Generate checklist using transcription ID
curl -X POST "http://localhost:4000/api/lectures/transcription/$TRANSCRIPTION_ID/checklist" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# 5. Get final lecture
curl -X GET "http://localhost:4000/api/lectures/$LECTURE_ID?userId=user123"
```

---

### Testing with Postman

**For `/upload` endpoint:**

1. **Method:** POST
2. **URL:** `{{base_url}}/api/lectures/{{lectureId}}/upload`
3. **Body:** Select `form-data`
4. **Add fields:**
   - `audio` (type: File) - Select your audio file
   - `userId` (type: Text) - `{{userId}}`
   - `duration` (type: Text) - `120`
5. **Send** - You'll get the transcript in the response

**For `/transcribe` endpoint (Two Options):**

**Option A: Audio File Upload**
1. **Method:** POST
2. **URL:** `{{base_url}}/api/lectures/{{lectureId}}/transcribe`
3. **Body:** Select `form-data`
4. **Add fields:**
   - `audio` (type: File) - Select your audio file
   - `userId` (type: Text) - `{{userId}}`
5. **Send** - You'll get the transcript and `transcriptionId` in the response

**Option B: Direct Transcript Text**
1. **Method:** POST
2. **URL:** `{{base_url}}/api/lectures/{{lectureId}}/transcribe`
3. **Body:** Select `raw` → `JSON`
4. **Add JSON:**
   ```json
   {
     "userId": "{{userId}}",
     "transcript": "Your transcript text here..."
   }
   ```
5. **Send** - You'll get the saved transcript and `transcriptionId` in the response

---

### Verification Checklist

After testing, verify:

- [ ] Transcript is saved in the database
- [ ] Audio file is NOT saved (check `audioUrl` is null/undefined)
- [ ] Lecture status is `completed` after transcription
- [ ] You can retrieve the transcript via GET endpoint
- [ ] Summary can be generated from the transcript
- [ ] Chatbot can answer questions using the transcript

---

### Quick Test Script

Save as `test-lecture-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:4000/api/lectures"
USER_ID="user123"

# 1. Start lecture
echo "1. Starting lecture..."
RESPONSE=$(curl -s -X POST "$BASE_URL/start" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"title\": \"Test Lecture\"}")

LECTURE_ID=$(echo $RESPONSE | grep -o '"lectureId":"[^"]*' | cut -d'"' -f4)
echo "Lecture ID: $LECTURE_ID"

# 2. Upload audio (transcribes automatically, deletes audio file)
echo "2. Uploading and transcribing audio..."
if [ -f "test-audio.m4a" ]; then
  curl -X POST "$BASE_URL/$LECTURE_ID/upload" \
    -F "audio=@test-audio.m4a" \
    -F "userId=$USER_ID" \
    -F "duration=120"
  echo "\n✅ Audio uploaded, transcribed, and deleted. Transcript saved."
else
  echo "⚠️  test-audio.m4a not found. Skipping upload step."
fi

# 3. Generate summary (requires transcript and transcriptionId)
echo "\n3. Generating summary..."
# Note: In real usage, extract transcriptionId from upload response
# For this script, you would need to parse the upload response to get transcriptionId
echo "⚠️  Note: You need to extract transcriptionId from the upload response first"
echo "Example: curl -X POST \"$BASE_URL/transcription/TRANSCRIPTION_ID/summary\" -H \"Content-Type: application/json\" -d \"{\\\"userId\\\": \\\"$USER_ID\\\"}\""

# 4. Generate checklist
echo "\n4. Generating checklist..."
echo "Example: curl -X POST \"$BASE_URL/transcription/TRANSCRIPTION_ID/checklist\" -H \"Content-Type: application/json\" -d \"{\\\"userId\\\": \\\"$USER_ID\\\"}\""

# 5. Get lecture (verify transcript, summary, and checklist saved)
echo "\n5. Getting lecture (verify all data exists)..."
curl -X GET "$BASE_URL/$LECTURE_ID?userId=$USER_ID"

echo "\n\nTest complete!"
```

Make executable: `chmod +x test-lecture-api.sh`

