const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createPDFFile,
  getPDFFileById,
  updatePDFFile,
  deletePDFFile,
  listUserPDFs,
  savePDFChatMessage,
  getPDFChatHistory,
} = require('../services/firestoreService');
const { uploadPDF, deletePDF, getDownloadURL } = require('../services/pdfStorageService');
const { extractTextFromPDF, getPDFPageCount } = require('../services/pdfService');
const { analyzePDF, analyzePDFPage } = require('../services/pdfAnalysisService');
const { chatWithPDF } = require('../services/pdfChatService');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads/pdfs');
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
    const allowedTypes = /pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only PDF files are allowed.'));
    }
  },
});


/**
 * POST /api/pdfs
 * Upload standalone PDF
 * Body: { userId, title?, classId? }
 * File: pdf (multipart/form-data)
 */
router.post('/', upload.single('pdf'), async (req, res) => {
  let filePath = null;
  try {
    const { userId, title, classId } = req.body;

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
    let pages = 1; // Default to 1 page if extraction fails
    try {
      const extractionResult = await extractTextFromPDF(filePath);
      extractedText = extractionResult.text;
      pages = extractionResult.pages || 1;
      console.log(`✅ Extracted ${pages} pages from PDF`);
    } catch (extractError) {
      console.warn('Failed to extract text from PDF:', extractError);
      // Continue without text extraction
      try {
        pages = await getPDFPageCount(filePath);
        console.log(`✅ Got page count: ${pages}`);
      } catch (pageError) {
        console.warn('Failed to get page count:', pageError);
        // Keep default of 1 page
        pages = 1;
      }
    }
    
    // Ensure pages is at least 1
    if (!pages || pages < 1) {
      pages = 1;
    }

    // Upload to Firebase Storage
    const { storagePath, downloadUrl } = await uploadPDF(
      filePath,
      userId,
      fileId,
      classId || null
    );

    // Create Firestore document
    const pdfData = {
      id: fileId,
      userId,
      classId: classId || null,
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

    res.status(201).json({
      success: true,
      file: pdfFile,
      message: 'PDF uploaded successfully',
    });
  } catch (error) {
    // Clean up local file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to upload PDF' });
  }
});

/**
 * GET /api/pdfs/:fileId
 * Get PDF metadata
 * Query params: userId
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const pdfFile = await getPDFFileById(fileId, userId);
    if (!pdfFile) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.json({
      success: true,
      file: pdfFile,
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch PDF' });
  }
});

/**
 * GET /api/pdfs/:fileId/download
 * Get PDF download URL
 * Query params: userId
 */
router.get('/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const pdfFile = await getPDFFileById(fileId, userId);
    if (!pdfFile) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    const downloadUrl = await getDownloadURL(pdfFile.storagePath);

    res.json({
      success: true,
      downloadUrl,
    });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: error.message || 'Failed to get download URL' });
  }
});

/**
 * PATCH /api/pdfs/:fileId
 * Update PDF metadata
 * Body: { userId, title?, description? }
 */
router.patch('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, title, description } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    const updatedFile = await updatePDFFile(fileId, userId, updates);

    res.json({
      success: true,
      file: updatedFile,
      message: 'PDF updated successfully',
    });
  } catch (error) {
    console.error('Error updating PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to update PDF' });
  }
});

/**
 * PATCH /api/pdfs/:fileId/annotations
 * Update PDF annotations
 * Body: { userId, annotations: Array }
 */
router.patch('/:fileId/annotations', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, annotations } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!Array.isArray(annotations)) {
      return res.status(400).json({ error: 'annotations must be an array' });
    }

    const updatedFile = await updatePDFFile(fileId, userId, { annotations });

    res.json({
      success: true,
      file: updatedFile,
      message: 'Annotations updated successfully',
    });
  } catch (error) {
    console.error('Error updating annotations:', error);
    res.status(500).json({ error: error.message || 'Failed to update annotations' });
  }
});

/**
 * DELETE /api/pdfs/:fileId
 * Delete PDF
 * Query params: userId
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const pdfFile = await getPDFFileById(fileId, userId);
    if (!pdfFile) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Delete from Firebase Storage
    await deletePDF(pdfFile.storagePath);

    // Delete from Firestore
    await deletePDFFile(fileId, userId);

    res.json({
      success: true,
      message: 'PDF deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to delete PDF' });
  }
});

/**
 * POST /api/pdfs/:fileId/analyze
 * Analyze PDF content
 * Body: { userId }
 */
router.post('/:fileId/analyze', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const analysis = await analyzePDF(fileId, userId);

    res.json({
      success: true,
      analysis,
      message: 'PDF analyzed successfully',
    });
  } catch (error) {
    console.error('Error analyzing PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze PDF' });
  }
});

/**
 * POST /api/pdfs/:fileId/analyze-page
 * Analyze a specific page of PDF
 * Body: { userId, pageNumber }
 */
router.post('/:fileId/analyze-page', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, pageNumber } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!pageNumber || pageNumber < 1) {
      return res.status(400).json({ error: 'pageNumber must be a positive integer' });
    }

    const analysis = await analyzePDFPage(fileId, userId, parseInt(pageNumber));

    res.json({
      success: true,
      analysis,
      message: `Page ${pageNumber} analyzed successfully`,
    });
  } catch (error) {
    console.error('Error analyzing PDF page:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze PDF page' });
  }
});

/**
 * POST /api/pdfs/:fileId/chat
 * Chat with PDF
 * Body: { userId, question, selectedText? }
 */
router.post('/:fileId/chat', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, question, selectedText } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const result = await chatWithPDF(fileId, userId, question.trim(), selectedText?.trim() || undefined);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error chatting with PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to chat with PDF' });
  }
});

/**
 * GET /api/pdfs/:fileId/chat/history
 * Get chat history for PDF
 * Query params: userId, limit? (default: 50)
 */
router.get('/:fileId/chat/history', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;
    const limit = parseInt(req.query.limit) || 50;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify PDF ownership
    const pdfFile = await getPDFFileById(fileId, userId);
    if (!pdfFile) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    const history = await getPDFChatHistory(fileId, userId, limit);

    res.json({
      success: true,
      history: history || [],
      count: history?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    // Return empty array instead of error to prevent frontend crashes
    res.json({
      success: true,
      history: [],
      count: 0,
    });
  }
});

/**
 * GET /api/pdfs
 * List user PDFs
 * Query params: userId, classId? (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { userId, classId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const pdfs = await listUserPDFs(userId, classId || null);

    res.json({
      success: true,
      files: pdfs,
      count: pdfs.length,
    });
  } catch (error) {
    console.error('Error listing PDFs:', error);
    res.status(500).json({ error: error.message || 'Failed to list PDFs' });
  }
});

module.exports = router;

