# PDF Services Architecture

## Overview
All PDF-related services have been refactored to eliminate duplication and centralize file operations.

## Service Responsibilities

### 1. `firebaseStorageService.js` - Low-Level Storage
**Purpose:** Generic Firebase Storage operations for all file types

**Responsibilities:**
- Upload files to Firebase Storage (generic)
- Delete files from Firebase Storage
- Get download URLs (signed/public)
- Get file metadata
- Type-specific helpers: `uploadPDF`, `uploadProfilePicture`, `uploadPostImage`, etc.

**Used by:** All services that need file storage

---

### 2. `pdfStorageService.js` - PDF File Operations ⭐ **CENTRALIZED**
**Purpose:** Single interface for all PDF file operations

**Responsibilities:**
- ✅ Upload PDFs to Firebase Storage
- ✅ Download PDFs from Firebase Storage (to temp files)
- ✅ Get download URLs for PDFs
- ✅ Delete PDFs from Firebase Storage
- ✅ Get PDF file metadata

**Key Function:**
- `downloadPDFToTemp()` - Downloads PDF from Firebase Storage to temporary local file for processing

**Used by:**
- `routes/pdfs.js` - PDF upload/delete routes
- `routes/classes.js` - Class PDF upload routes
- `pdfAnalysisService.js` - Downloads PDFs for analysis

**Before:** Had duplicate download logic in `pdfAnalysisService.js`
**After:** All PDF file operations go through this service

---

### 3. `pdfService.js` - PDF Parsing/Extraction
**Purpose:** Pure PDF content extraction (no file storage)

**Responsibilities:**
- Extract text from PDF files
- Get page count
- Extract text from specific pages
- Parse PDF metadata

**No file storage operations** - works with local file paths only

**Used by:**
- `pdfAnalysisService.js` - Extracts text for analysis
- `routes/pdfs.js` - Extracts text during upload

---

### 4. `pdfAnalysisService.js` - PDF Analysis
**Purpose:** AI-powered PDF analysis and summarization

**Responsibilities:**
- Analyze PDF content (summary, key points, topics)
- Analyze specific PDF pages
- Uses `pdfStorageService` to download PDFs when needed
- Uses `pdfService` to extract text

**File Operations:**
- ✅ Uses `pdfStorageService.downloadPDFToTemp()` (centralized)
- ✅ Cleans up temp files after use
- ❌ No direct Firebase Storage access

**Before:** Had its own `downloadFileToTemp()` function (duplication)
**After:** Uses centralized `pdfStorageService.downloadPDFToTemp()`

---

### 5. `pdfChatService.js` - PDF Chat
**Purpose:** AI chat interface for PDFs

**Responsibilities:**
- Answer questions about PDF content
- Maintain chat history
- Extract page references from answers

**No file storage operations** - works with extracted text from Firestore

---

## Architecture Flow

### Upload Flow
```
Route (pdfs.js/classes.js)
  ↓
pdfStorageService.uploadPDF()
  ↓
firebaseStorageService.uploadPDF()
  ↓
Firebase Storage
```

### Analysis Flow
```
pdfAnalysisService.analyzePDF()
  ↓
pdfStorageService.downloadPDFToTemp()  ← Centralized!
  ↓
pdfService.extractTextFromPDF()
  ↓
AI Analysis
  ↓
Cleanup temp file
```

### Download Flow
```
Route (pdfs.js)
  ↓
pdfStorageService.getDownloadURL()
  ↓
firebaseStorageService.getDownloadURL()
  ↓
Firebase Storage signed URL
```

## Key Improvements

### ✅ Eliminated Duplication
- **Before:** `pdfAnalysisService` had its own download logic
- **After:** All downloads go through `pdfStorageService.downloadPDFToTemp()`

### ✅ Single Source of Truth
- **Before:** Multiple services accessing Firebase Storage directly
- **After:** All PDF file operations go through `pdfStorageService`

### ✅ Clear Separation of Concerns
- **Storage:** `pdfStorageService` (file operations)
- **Parsing:** `pdfService` (content extraction)
- **Analysis:** `pdfAnalysisService` (AI analysis)
- **Chat:** `pdfChatService` (conversation)

### ✅ Better Maintainability
- Changes to PDF storage logic only need to be made in one place
- Easier to test and debug
- Clear dependency chain

## Service Dependencies

```
pdfStorageService
  └─> firebaseStorageService

pdfAnalysisService
  ├─> pdfStorageService (for file downloads)
  └─> pdfService (for text extraction)

pdfChatService
  └─> firestoreService (for PDF metadata/text)

pdfService
  └─> (no dependencies - pure PDF parsing)
```

## Migration Notes

### Removed from `pdfAnalysisService.js`:
- ❌ `downloadFileToTemp()` function (moved to `pdfStorageService`)
- ❌ Direct import of `firebaseStorageService`
- ❌ HTTP/HTTPS download logic

### Added to `pdfStorageService.js`:
- ✅ `downloadPDFToTemp()` function
- ✅ HTTP/HTTPS download logic
- ✅ Temp file management

### Updated in `pdfAnalysisService.js`:
- ✅ Now uses `pdfStorageService.downloadPDFToTemp()`
- ✅ Removed duplicate code (~40 lines)
- ✅ Cleaner imports

## Best Practices

1. **Always use `pdfStorageService` for PDF file operations**
   - Don't import `firebaseStorageService` directly in PDF-related code
   - Exception: Non-PDF files (profiles, posts, etc.) can use `firebaseStorageService` directly

2. **Temp files are managed automatically**
   - `downloadPDFToTemp()` creates temp files
   - Caller is responsible for cleanup (use try/finally)

3. **Service boundaries**
   - Storage operations → `pdfStorageService`
   - Content extraction → `pdfService`
   - AI features → `pdfAnalysisService` / `pdfChatService`

