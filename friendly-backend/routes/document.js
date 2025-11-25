const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for PDF document uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadsDir = path.join(__dirname, '../uploads/documents');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilterPDF = (req, file, cb) => {
    const allowedTypes = /pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Non-PDF Input.'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: fileFilterPDF
});

/**
 * POST /api/documents
 * Upload PDF documents (supports multiple files, up to 8)
 * Content-Type: multipart/form-data
 * Body: documents (file field name)
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "3 files uploaded successfully!",
 *   "files": [
 *     {
 *       "filename": "documents-1234567890-abc123.pdf",
 *       "originalname": "document.pdf",
 *       "size": 1024000,
 *       "path": "uploads/documents/documents-1234567890-abc123.pdf"
 *     }
 *   ],
 *   "count": 3
 * }
 */
router.post('/', upload.array('documents', 8), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Sanitize file information for response
        const files = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            path: file.path
        }));

        res.json({
            success: true,
            message: `${req.files.length} file(s) uploaded successfully!`,
            files: files,
            count: req.files.length
        });
    } catch (error) {
        console.error('Error uploading documents:', error);
        
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: error.message || 'Failed to upload documents' 
        });
    }
});

module.exports = router;

