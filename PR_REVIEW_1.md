# PR #1 Review: PDF Upload Feature

**Branch:** `PDFfunc`  
**Review Date:** 2025-01-25  
**Status:** ⚠️ **Issues Found - Requires Changes Before Merge**

---

## Summary

This PR adds a new PDF document upload endpoint to the backend. The implementation follows Express.js patterns but has several inconsistencies with the existing codebase structure that need to be addressed.

## Changes Overview

1. **New File:** `friendly-backend/routes/document.js`
   - PDF upload route handler
   - Supports multiple file uploads (up to 8 PDFs)
   - File size limit: 50MB
   - PDF-only file type validation

2. **Modified File:** `friendly-backend/server.js`
   - Added route registration for PDF upload endpoint

---

## Critical Issues (Must Fix Before Merge)

### 1. ❌ Route Prefix Inconsistency

**Problem:** The route is registered as `/upload-pdf` but all existing routes use the `/api/*` prefix pattern.

**Current Codebase Pattern:**
```javascript
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedule', require('./routes/schedules'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/community', require('./routes/community'));
```

**PR Code:**
```javascript
app.use('/upload-pdf', require('./routes/document'));
```

**Impact:** Breaks API consistency and may cause confusion for frontend developers expecting `/api/*` endpoints.

**Fix Required:**
```javascript
app.use('/api/documents', require('./routes/document'));
// OR
app.use('/api/upload-pdf', require('./routes/document'));
```

**Recommendation:** Use `/api/documents` for better RESTful naming and consistency with other resource-based routes.

---

### 2. ❌ Unused Variable

**Problem:** `const PORT = 3000;` is declared in `document.js` but never used.

**Location:** Line 3 of `routes/document.js`

**Fix Required:** Remove this line entirely.

---

## Important Issues (Should Fix)

### 3. ⚠️ Upload Directory Organization

**Current Codebase Pattern:**
- `uploads/profiles/` - User profile images
- `uploads/schedules/` - Schedule images
- `uploads/posts/` - Community post images (from `community.js`)

**PR Code:**
```javascript
destination: function(req, file, cb){
    cb(null, path.join(__dirname, '../uploads'));
}
```

**Issue:** Uses root `uploads/` directory instead of a subdirectory.

**Recommendation:** Use `uploads/documents/` for better file organization:
```javascript
destination: function(req, file, cb){
    const uploadsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
}
```

**Note:** This matches the pattern used in `community.js` and `schedules.js`.

---

### 4. ⚠️ Error Handling Pattern Inconsistency

**PR Pattern:**
```javascript
router.use((err, req, res, next) => {
    if(err instanceof multer.MulterError){
        return res.status(400).json({ error: err.message })
    }
    else if(err){
        return res.status(400).json({ error: err.message })
    }
    next();
});
```

**Current Codebase Pattern:**
All existing routes (`lectures.js`, `schedules.js`, `community.js`) use inline try-catch blocks:

```javascript
router.post('/:userId/analyze-image', imageUpload.single('image'), async (req, res) => {
    let imagePath = null;
    try {
        // ... route logic
    } catch (error) {
        console.error('Error analyzing schedule image:', error);
        // Clean up on error
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        res.status(500).json({ error: error.message || 'Failed to analyze schedule image' });
    }
});
```

**Issue:** The middleware approach works but differs from the codebase style. More importantly, the PR's route handler doesn't have try-catch, so errors from the route logic won't be caught properly.

**Recommendation:** 
1. Remove the `router.use` error middleware
2. Wrap the route handler in try-catch block
3. Handle multer errors within the route handler

**Example Fix:**
```javascript
router.post('/', upload.array('documents', 8), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        res.json({
            success: true,
            message: `${req.files.length} files uploaded successfully!`,
            files: req.files.map(file => ({
                filename: file.filename,
                originalname: file.originalname,
                size: file.size,
                path: file.path
            }))
        });
    } catch (error) {
        console.error('Error uploading documents:', error);
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Failed to upload documents' });
    }
});
```

---

## Code Quality Observations

### ✅ Positive Aspects

1. **Proper Multer Configuration**
   - File size limits (50MB) are appropriate
   - File type validation (PDF only) is implemented
   - Storage configuration is correct

2. **Follows Express Router Pattern**
   - Uses Express Router correctly
   - Route structure matches other route files

3. **Multiple File Support**
   - Supports up to 8 files per request
   - Uses `upload.array()` appropriately

4. **File Naming**
   - Includes unique suffix to prevent collisions
   - Uses proper file extension handling

### ⚠️ Areas for Improvement

1. **Response Format Inconsistency**
   - PR returns: `{ message: "...", files: [...] }`
   - Codebase pattern: `{ success: true, message: "...", files: [...] }`
   - Missing `success: true` field that's consistent across all other endpoints

2. **Error Message Format**
   - PR: `res.status(400).send('No files uploaded.')`
   - Codebase pattern: `res.status(400).json({ error: '...' })`
   - Should use JSON format for consistency

3. **File Response Data**
   - PR returns full multer file objects
   - Should return sanitized file info (filename, size, path) without internal multer properties

4. **Missing Documentation**
   - No JSDoc comments explaining the endpoint
   - Other routes have comprehensive documentation

---

## Detailed Code Comparison

### Route Registration

**Current Pattern (server.js):**
```javascript
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedule', require('./routes/schedules'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/community', require('./routes/community'));
```

**PR Pattern:**
```javascript
app.use('/upload-pdf', require('./routes/document'));
```

**Issue:** Missing `/api/` prefix

---

### Upload Directory Structure

**Current Pattern (schedules.js):**
```javascript
const uploadsDir = path.join(__dirname, '../uploads/schedules');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
cb(null, uploadsDir);
```

**Current Pattern (community.js):**
```javascript
const uploadsDir = path.join(__dirname, '../uploads/posts');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
cb(null, uploadsDir);
```

**PR Pattern:**
```javascript
cb(null, path.join(__dirname, '../uploads'));
```

**Issue:** Doesn't create subdirectory or check for existence

---

### Error Handling

**Current Pattern (lectures.js, schedules.js):**
```javascript
router.post('/...', upload.single('file'), async (req, res) => {
    let filePath = null;
    try {
        // Route logic
    } catch (error) {
        console.error('Error:', error);
        // Cleanup
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ error: error.message || 'Failed to...' });
    }
});
```

**PR Pattern:**
```javascript
router.use((err, req, res, next) => {
    // Middleware error handler
});

router.post('/', upload.array('documents', 8), (req, res) => {
    // No try-catch
});
```

**Issue:** Different pattern, and route handler lacks error handling

---

## Recommendations Summary

### Must Fix (Blocking)
1. ✅ Change route from `/upload-pdf` to `/api/documents` (or `/api/upload-pdf`)
2. ✅ Remove unused `const PORT = 3000;` variable

### Should Fix (Important)
3. ✅ Use `uploads/documents/` subdirectory with existence check
4. ✅ Replace middleware error handler with try-catch block
5. ✅ Add `success: true` to response
6. ✅ Use JSON format for all error responses
7. ✅ Add JSDoc documentation

### Nice to Have
8. Return sanitized file information instead of full multer objects
9. Consider adding userId validation if documents should be user-specific
10. Consider adding file cleanup after processing (if documents are temporary)

---

## Suggested Corrected Code

### `routes/document.js` (Corrected)

```javascript
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
```

### `server.js` (Corrected)

```javascript
// ... existing code ...

app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/community', require('./routes/community'));
app.use('/api/documents', require('./routes/document'));

// ... rest of code ...
```

---

## Verification Checklist

- [ ] Route uses `/api/*` prefix
- [ ] No unused variables
- [ ] Upload directory uses subdirectory (`uploads/documents/`)
- [ ] Directory existence check implemented
- [ ] Error handling uses try-catch pattern
- [ ] Response includes `success: true`
- [ ] All responses use JSON format
- [ ] JSDoc documentation added
- [ ] File information is sanitized in response
- [ ] Code follows existing codebase patterns

---

## Conclusion

The PR adds useful functionality but requires several changes to match the codebase structure and conventions. The main issues are:

1. **Route prefix** - Critical for API consistency
2. **Unused variable** - Code cleanup
3. **File organization** - Important for maintainability
4. **Error handling** - Should match existing patterns

Once these issues are addressed, the PR will be ready for merge.

---

**Reviewer Notes:**
- The core functionality is sound
- Multer configuration is correct
- File validation works properly
- Main issues are structural/conventional rather than functional

