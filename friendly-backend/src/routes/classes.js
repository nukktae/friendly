const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getLectureById, getAllUserLectures, listClassFiles, createPDFFile, getPDFFileById, createAssignment, getAssignmentById, updateAssignment, deleteAssignment, listClassAssignments, listUserAssignments, createExam, getExamById, updateExam, deleteExam, listClassExams } = require('../services/firestoreService');
const { uploadPDF } = require('../services/pdfStorageService');
const { extractTextFromPDF, getPDFPageCount } = require('../services/pdfService');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'pdfs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `pdf-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = ext === '.pdf';
    
    // Check MIME type (common PDF MIME types)
    const allowedMimeTypes = [
      'application/pdf',
      'application/x-pdf',
      'application/acrobat',
      'applications/vnd.pdf',
      'text/pdf',
      'text/x-pdf'
    ];
    const isValidMimeType = !file.mimetype || allowedMimeTypes.includes(file.mimetype.toLowerCase());
    
    // Accept if either extension or MIME type is valid (more lenient)
    if (isValidExtension || isValidMimeType) {
      return cb(null, true);
    } else {
      console.warn('File rejected:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        extension: ext
      });
      cb(new Error('Error: Only PDF files are allowed.'));
    }
  },
});

/**
 * POST /api/classes/:classId/files
 * Upload PDF for a class
 * Body: { userId, title? }
 * File: pdf (multipart/form-data)
 */
router.post('/:classId/files', (req, res, next) => {
  // Handle multer errors explicitly
  upload.single('pdf')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 50MB.',
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
        });
      }
      // Handle other errors (e.g., file type validation)
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed',
      });
    }
    next();
  });
}, async (req, res) => {
  let filePath = null;
  try {
    const { classId } = req.params;
    const { userId, title } = req.body;

    if (!userId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    filePath = req.file.path;
    const fileId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract text and get page count
    let extractedText = null;
    let pages = 0;
    
    // Try extraction first
    try {
      console.log(`📄 Attempting to extract PDF content from: ${filePath}`);
      const extractionResult = await extractTextFromPDF(filePath);
      extractedText = extractionResult.text;
      pages = extractionResult.pages;
      console.log(`✅ Successfully extracted ${pages} pages from PDF`);
      
      if (!pages || pages < 1) {
        throw new Error('Page count is 0 or invalid');
      }
    } catch (extractError) {
      console.warn('⚠️  Failed to extract text from PDF:', extractError.message);
      
      // Try page count only as fallback
      try {
        console.log(`📄 Attempting to get page count only...`);
        pages = await getPDFPageCount(filePath);
        console.log(`✅ Got page count: ${pages}`);
        
        if (!pages || pages < 1) {
          throw new Error('Page count is 0 or invalid');
        }
      } catch (pageError) {
        console.error('❌ Failed to get page count:', pageError.message);
        console.error('Full error:', pageError);
        
        // Last resort: try reading the file directly
        try {
          const fs = require('fs');
          const dataBuffer = fs.readFileSync(filePath);
          const pdfParse = require('pdf-parse');
          const data = await pdfParse(dataBuffer);
          pages = data.numpages || 0;
          console.log(`✅ Direct parse got ${pages} pages`);
        } catch (directError) {
          console.error('❌ Direct parse also failed:', directError.message);
          pages = 0; // Will be set to 1 below
        }
      }
    }
    
    // Ensure pages is at least 1 (only if we really can't determine)
    if (!pages || pages < 1) {
      console.warn(`⚠️  Could not determine page count, defaulting to 1`);
      pages = 1;
    } else {
      console.log(`✅ Final page count: ${pages}`);
    }

    // Upload to Firebase Storage
    const { storagePath, downloadUrl } = await uploadPDF(
      filePath,
      userId,
      fileId,
      classId
    );
    
    // downloadUrl is already a Firebase Storage signed URL

    // Create Firestore document
    const pdfData = {
      id: fileId,
      userId,
      classId,
      title: title || req.file.originalname.replace(/\.pdf$/i, ''),
      originalFilename: req.file.originalname,
      storagePath,
      downloadUrl,
      size: req.file.size,
      pages,
      extractedText,
    };

    await createPDFFile(pdfData);

    // Clean up temp file - uploadPDF copied it to organized location
    // The temp file from multer is no longer needed
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.warn('Failed to delete temp file:', unlinkError);
      }
    }

    const pdfFile = await getPDFFileById(fileId, userId);
    
    if (!pdfFile) {
      throw new Error('Failed to retrieve uploaded PDF file');
    }

    res.status(201).json({
      success: true,
      file: pdfFile,
      message: 'PDF uploaded successfully',
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    console.error('❌ Error uploading PDF:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    // Extract bucket name from error if available
    const bucketMatch = error.message.match(/bucket "([^"]+)"/);
    const bucketName = bucketMatch ? bucketMatch[1] : 'unknown';
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to upload PDF';
    let statusCode = 500;
    
    if (error.message.includes('does not exist') || error.code === 404) {
      statusCode = 400;
      errorMessage = `Storage bucket "${bucketName}" not found. Please verify Firebase Storage is enabled and the bucket name is correct.`;
      console.error(`💡 Bucket name used: ${bucketName}`);
      console.error('💡 Check Firebase Console > Storage > Settings for the correct bucket name');
    } else if (error.message.includes('Permission denied') || error.code === 403) {
      statusCode = 403;
      errorMessage = 'Permission denied. Please check service account permissions.';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        bucketName,
        details: error.message 
      })
    });
  }
});

/**
 * GET /api/classes/:classId/files
 * Get files for a class (lecture)
 * Query params: userId (required)
 */
router.get('/:classId/files', async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.json({
        success: true,
        files: [],
        count: 0,
      });
    }

    if (!classId) {
      return res.json({
        success: true,
        files: [],
        count: 0,
      });
    }

    // Get PDFs for this class
    const files = await listClassFiles(classId, userId);

    // Convert to ClassFile format, filtering out any invalid files
    const classFiles = files
      .filter(file => file && file.id) // Filter out null/undefined files
      .map(file => ({
        id: file.id,
        title: file.title || 'Untitled',
        size: formatFileSize(file.size || 0),
        pages: file.pages || 0,
        uploadedAt: file.createdAt?._seconds 
          ? new Date(file.createdAt._seconds * 1000).toISOString()
          : file.createdAt?.seconds
          ? new Date(file.createdAt.seconds * 1000).toISOString()
          : file.createdAt || new Date().toISOString(),
        fileType: 'pdf',
        downloadUrl: file.downloadUrl || null,
      }));

    res.json({
      success: true,
      files: classFiles,
      count: classFiles.length,
    });
  } catch (error) {
    console.error('Error fetching class files:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch class files',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * GET /api/classes/:classId/recordings
 * Get recordings for a class (lecture)
 * Query params: userId (optional but recommended)
 * 
 * This endpoint matches the logic from /api/lectures/class/:lectureId/recordings
 */
router.get('/:classId/recordings', async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req.query;

    // If userId is not provided, return empty array instead of error
    // This allows the frontend to work even if userId is missing
    if (!userId) {
      console.warn(`Missing userId for class recordings: ${classId}`);
      return res.json({
        success: true,
        recordings: [],
        count: 0,
      });
    }

    // Check if classId is actually a lectureId
    if (classId.startsWith('lecture_')) {
      try {
        // Get the class lecture to find matching recordings
        const classLecture = await getLectureById(classId, userId);
        if (!classLecture) {
          return res.json({
            success: true,
            recordings: [],
            count: 0,
          });
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

        return res.json({
          success: true,
          recordings,
          count: recordings.length,
        });
      } catch (lectureError) {
        console.warn('Error fetching lecture as recording:', lectureError);
        // Fall through to return empty array
      }
    }

    // Return empty array if not found or not a lecture ID
    res.json({
      success: true,
      recordings: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching class recordings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch class recordings' });
  }
});

/**
 * GET /api/classes/assignments
 * Get all assignments for a user
 * Query params: userId (required)
 * NOTE: This must be defined BEFORE /:classId/assignments to avoid route conflicts
 */
router.get('/assignments', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const assignments = await listUserAssignments(userId);
    
    // Migration map for old status values
    const statusMigration = {
      pending: 'not_started',
      submitted: 'in_progress',
      graded: 'completed',
      past_due: 'in_progress',
    };
    
    const migrateStatus = (status) => {
      if (!status) return 'not_started';
      return statusMigration[status] || status;
    };

    const formattedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      classId: assignment.classId,
      title: assignment.title,
      description: assignment.description || '',
      type: assignment.type || 'other',
      dueDate: assignment.dueDate 
        ? (typeof assignment.dueDate === 'string' 
          ? assignment.dueDate 
          : new Date(assignment.dueDate._seconds * 1000).toISOString())
        : null,
      status: migrateStatus(assignment.status),
    }));

    res.json({
      success: true,
      assignments: formattedAssignments,
      count: formattedAssignments.length,
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignments' });
  }
});

/**
 * GET /api/classes/:classId/assignments
 * Get assignments for a class (lecture)
 * Query params: userId (required)
 */
router.get('/:classId/assignments', async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.json({
        success: true,
        assignments: [],
        count: 0,
      });
    }

    const assignments = await listClassAssignments(classId, userId);
    
    const formattedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description || '',
      type: assignment.type || 'other',
      dueDate: assignment.dueDate 
        ? (typeof assignment.dueDate === 'string' 
          ? assignment.dueDate 
          : new Date(assignment.dueDate._seconds * 1000).toISOString())
        : null,
      status: assignment.status || 'not_started',
    }));

    res.json({
      success: true,
      assignments: formattedAssignments,
      count: formattedAssignments.length,
    });
  } catch (error) {
    console.error('Error fetching class assignments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch class assignments' });
  }
});

/**
 * POST /api/classes/:classId/assignments
 * Create a new assignment for a class
 * Body: { userId, title, description?, type?, dueDate? }
 */
router.post('/:classId/assignments', async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, title, description, type, dueDate } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Verify class exists
    try {
      await getLectureById(classId, userId);
    } catch (error) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const assignmentId = await createAssignment({
      userId,
      classId,
      title: title.trim(),
      description: description || '',
      type: type || 'other',
      dueDate: dueDate || null,
      status: 'not_started',
    });

    const assignment = await getAssignmentById(assignmentId, userId);

    res.status(201).json({
      success: true,
      assignmentId,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        dueDate: assignment.dueDate 
          ? (typeof assignment.dueDate === 'string' 
            ? assignment.dueDate 
            : new Date(assignment.dueDate._seconds * 1000).toISOString())
          : null,
        status: assignment.status,
      },
      message: 'Assignment created successfully',
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to create assignment' });
  }
});

/**
 * GET /api/classes/:classId/assignments/:assignmentId
 * Get a single assignment by ID
 * Query params: userId (required)
 */
router.get('/:classId/assignments/:assignmentId', async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const assignment = await getAssignmentById(assignmentId, userId);

    // Verify assignment belongs to the class
    if (assignment.classId !== classId) {
      return res.status(404).json({ error: 'Assignment not found for this class' });
    }

    res.json({
      success: true,
      assignment: {
        id: assignment.id,
        classId: assignment.classId,
        title: assignment.title,
        description: assignment.description || '',
        type: assignment.type || 'other',
        dueDate: assignment.dueDate 
          ? (typeof assignment.dueDate === 'string' 
            ? assignment.dueDate 
            : new Date(assignment.dueDate._seconds * 1000).toISOString())
          : null,
        status: assignment.status || 'not_started',
      },
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    if (error.message === 'Assignment not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch assignment' });
  }
});

/**
 * PATCH /api/classes/:classId/assignments/:assignmentId
 * Update an assignment
 * Body: { userId, title?, description?, type?, dueDate?, status? }
 */
router.patch('/:classId/assignments/:assignmentId', async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const { userId, title, description, type, dueDate, status } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (status !== undefined) {
      // Validate status
      const validStatuses = ['not_started', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }

    await updateAssignment(assignmentId, userId, updates);
    const assignment = await getAssignmentById(assignmentId, userId);

    res.json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        dueDate: assignment.dueDate 
          ? (typeof assignment.dueDate === 'string' 
            ? assignment.dueDate 
            : new Date(assignment.dueDate._seconds * 1000).toISOString())
          : null,
        status: assignment.status,
      },
      message: 'Assignment updated successfully',
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    if (error.message === 'Assignment not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update assignment' });
  }
});

/**
 * DELETE /api/classes/:classId/assignments/:assignmentId
 * Delete an assignment
 * Query params: userId (required)
 */
router.delete('/:classId/assignments/:assignmentId', async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await deleteAssignment(assignmentId, userId);

    res.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    if (error.message === 'Assignment not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete assignment' });
  }
});

/**
 * GET /api/classes/:classId/notes
 * Get notes for a class (lecture)
 * Query params: userId (optional)
 */
router.get('/:classId/notes', async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req.query;

    // For now, return empty array since notes are not yet implemented
    // TODO: Implement notes storage and retrieval
    res.json({
      success: true,
      notes: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching class notes:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch class notes' });
  }
});

// ============================================
// EXAM ROUTES
// ============================================

/**
 * GET /api/classes/:classId/exams
 * Get all exams for a class
 * Query params: userId (required)
 */
router.get('/:classId/exams', async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    const exams = await listClassExams(classId, userId);
    
    const formattedExams = exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description || '',
      date: exam.date 
        ? (typeof exam.date === 'string' 
          ? exam.date 
          : new Date(exam.date._seconds * 1000).toISOString())
        : null,
      durationMinutes: exam.durationMinutes || 60,
      location: exam.location || null,
      instructions: exam.instructions || null,
      status: exam.status || 'upcoming',
      createdAt: exam.createdAt 
        ? (typeof exam.createdAt === 'string' 
          ? exam.createdAt 
          : new Date(exam.createdAt._seconds * 1000).toISOString())
        : null,
      updatedAt: exam.updatedAt 
        ? (typeof exam.updatedAt === 'string' 
          ? exam.updatedAt 
          : new Date(exam.updatedAt._seconds * 1000).toISOString())
        : null,
    }));

    res.json({
      success: true,
      data: formattedExams,
      count: formattedExams.length,
    });
  } catch (error) {
    console.error('Error fetching class exams:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch class exams' });
  }
});

/**
 * GET /api/classes/:classId/exams/:examId
 * Get a single exam by ID
 * Query params: userId (required)
 */
router.get('/:classId/exams/:examId', async (req, res) => {
  try {
    const { classId, examId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const exam = await getExamById(examId, userId);

    // Verify exam belongs to the class
    if (exam.classId !== classId) {
      return res.status(404).json({ error: 'Exam not found for this class' });
    }

    res.json({
      success: true,
      data: {
        id: exam.id,
        classId: exam.classId,
        title: exam.title,
        description: exam.description || '',
        date: exam.date 
          ? (typeof exam.date === 'string' 
            ? exam.date 
            : new Date(exam.date._seconds * 1000).toISOString())
          : null,
        durationMinutes: exam.durationMinutes || 60,
        location: exam.location || null,
        instructions: exam.instructions || null,
        status: exam.status || 'upcoming',
      },
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch exam' });
  }
});

/**
 * POST /api/classes/:classId/exams
 * Create a new exam for a class
 * Body: { userId, title, description?, date, durationMinutes?, location?, instructions? }
 */
router.post('/:classId/exams', async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, title, description, date, durationMinutes, location, instructions } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    // Verify class exists
    try {
      await getLectureById(classId, userId);
    } catch (error) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const examId = await createExam({
      userId,
      classId,
      title: title.trim(),
      description: description || '',
      date: date,
      durationMinutes: durationMinutes || 60,
      location: location || null,
      instructions: instructions || null,
    });

    const exam = await getExamById(examId, userId);

    res.status(201).json({
      success: true,
      data: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        date: exam.date 
          ? (typeof exam.date === 'string' 
            ? exam.date 
            : new Date(exam.date._seconds * 1000).toISOString())
          : null,
        durationMinutes: exam.durationMinutes || 60,
        location: exam.location || null,
        instructions: exam.instructions || null,
        status: exam.status || 'upcoming',
      },
      message: 'Exam created successfully',
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: error.message || 'Failed to create exam' });
  }
});

/**
 * PATCH /api/classes/:classId/exams/:examId
 * Update an exam
 * Body: { userId, title?, description?, date?, durationMinutes?, location?, instructions?, status? }
 */
router.patch('/:classId/exams/:examId', async (req, res) => {
  try {
    const { classId, examId } = req.params;
    const { userId, title, description, date, durationMinutes, location, instructions, status } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    if (location !== undefined) updates.location = location || null;
    if (instructions !== undefined) updates.instructions = instructions || null;
    if (status !== undefined) {
      // Validate status
      const validStatuses = ['upcoming', 'completed', 'missed', 'in_progress'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }

    await updateExam(examId, userId, updates);
    const exam = await getExamById(examId, userId);

    res.json({
      success: true,
      data: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        date: exam.date 
          ? (typeof exam.date === 'string' 
            ? exam.date 
            : new Date(exam.date._seconds * 1000).toISOString())
          : null,
        durationMinutes: exam.durationMinutes || 60,
        location: exam.location || null,
        instructions: exam.instructions || null,
        status: exam.status || 'upcoming',
      },
      message: 'Exam updated successfully',
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update exam' });
  }
});

/**
 * DELETE /api/classes/:classId/exams/:examId
 * Delete an exam
 * Query params: userId (required)
 */
router.delete('/:classId/exams/:examId', async (req, res) => {
  try {
    const { classId, examId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await deleteExam(examId, userId);

    res.json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete exam' });
  }
});

module.exports = router;

