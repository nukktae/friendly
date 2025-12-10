const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const { getGpaData, saveGpaData, addCourse, updateCourse, deleteCourse } = require('../services/gpaService');
const { analyzeGraduationRequirements, analyzeRequirementsPDF, analyzeRequirementsImage } = require('../services/gpaRequirementsService');
const {
  uploadGPARequirementImage,
  deleteFile: deleteFileFromFirebase,
} = require('../services/firebaseStorageService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Merge multiple analysis results into a single comprehensive analysis
 */
function mergeAnalysisResults(analyses) {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  if (analyses.length === 1) {
    return analyses[0];
  }

  // Start with the first analysis as base
  const merged = JSON.parse(JSON.stringify(analyses[0]));

  // Merge credit breakdowns (take maximum values)
  analyses.forEach(analysis => {
    if (analysis.totalCreditsRequired) {
      merged.totalCreditsRequired = Math.max(
        merged.totalCreditsRequired || 0,
        analysis.totalCreditsRequired
      );
    }

    if (analysis.creditBreakdown) {
      const cb = analysis.creditBreakdown;
      if (cb.generalEducation) {
        merged.creditBreakdown.generalEducation.basic = Math.max(
          merged.creditBreakdown.generalEducation.basic,
          cb.generalEducation.basic || 0
        );
        merged.creditBreakdown.generalEducation.core = Math.max(
          merged.creditBreakdown.generalEducation.core,
          cb.generalEducation.core || 0
        );
        merged.creditBreakdown.generalEducation.elective = Math.max(
          merged.creditBreakdown.generalEducation.elective,
          cb.generalEducation.elective || 0
        );
        merged.creditBreakdown.generalEducation.subtotal = Math.max(
          merged.creditBreakdown.generalEducation.subtotal,
          cb.generalEducation.subtotal || 0
        );
      }
      if (cb.major) {
        merged.creditBreakdown.major.required = Math.max(
          merged.creditBreakdown.major.required,
          cb.major.required || 0
        );
        merged.creditBreakdown.major.elective = Math.max(
          merged.creditBreakdown.major.elective,
          cb.major.elective || 0
        );
        merged.creditBreakdown.major.subtotal = Math.max(
          merged.creditBreakdown.major.subtotal,
          cb.major.subtotal || 0
        );
      }
      if (cb.generalElective) {
        merged.creditBreakdown.generalElective = Math.max(
          merged.creditBreakdown.generalElective,
          cb.generalElective || 0
        );
      }
    }
  });

  // Merge required courses (deduplicate by code or name)
  const courseMap = new Map();
  
  analyses.forEach(analysis => {
    if (analysis.requiredCourses && Array.isArray(analysis.requiredCourses)) {
      analysis.requiredCourses.forEach(course => {
        const key = course.code ? course.code.substring(0, 5) : (course.nameKorean || course.name).toLowerCase();
        if (!courseMap.has(key)) {
          courseMap.set(key, course);
        } else {
          // Merge if more complete
          const existing = courseMap.get(key);
          if (!existing.code && course.code) {
            existing.code = course.code;
          }
          if (!existing.nameKorean && course.nameKorean) {
            existing.nameKorean = course.nameKorean;
          }
          if (!existing.year && course.year) {
            existing.year = course.year;
          }
          if (!existing.semester && course.semester) {
            existing.semester = course.semester;
          }
        }
      });
    }
  });

  merged.requiredCourses = Array.from(courseMap.values());

  // Merge curriculum by year
  analyses.forEach(analysis => {
    if (analysis.curriculumByYear) {
      Object.keys(analysis.curriculumByYear).forEach(year => {
        if (!merged.curriculumByYear[year]) {
          merged.curriculumByYear[year] = { semester1: [], semester2: [] };
        }
        const yearData = analysis.curriculumByYear[year];
        if (yearData.semester1) {
          merged.curriculumByYear[year].semester1.push(...yearData.semester1);
        }
        if (yearData.semester2) {
          merged.curriculumByYear[year].semester2.push(...yearData.semester2);
        }
      });
    }
  });

  // Merge graduation certification options
  const certOptionsSet = new Set(merged.graduationCertification?.options || []);
  analyses.forEach(analysis => {
    if (analysis.graduationCertification?.options) {
      analysis.graduationCertification.options.forEach(opt => certOptionsSet.add(opt));
    }
    if (analysis.graduationCertification?.requirements) {
      if (!merged.graduationCertification.requirements) {
        merged.graduationCertification.requirements = [];
      }
      analysis.graduationCertification.requirements.forEach(req => {
        // Avoid duplicates
        const exists = merged.graduationCertification.requirements.some(
          r => r.type === req.type && r.description === req.description
        );
        if (!exists) {
          merged.graduationCertification.requirements.push(req);
        }
      });
    }
  });
  merged.graduationCertification.options = Array.from(certOptionsSet);

  // Recalculate analysis based on merged courses
  if (merged.analysis && merged.requiredCourses) {
    merged.analysis.requiredCoursesRemaining = merged.requiredCourses.map(
      c => c.nameKorean || c.name
    );
  }

  return merged;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'gpa-requirements');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `requirements-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit per file (increased for high-res images)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only PDF and image files (jpg, jpeg, png, gif, webp) are allowed.'));
    }
  },
});

// Single file upload (for backward compatibility)
const uploadSingle = upload.single('file');
// Multiple files upload (up to 5 files)
const uploadMultiple = upload.array('files', 5);

// Custom middleware to handle both 'file' and 'files' field names
const uploadFiles = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  const method = req.method;
  const url = req.url;
  
  console.log(`[uploadFiles] ${method} ${url}`);
  console.log(`[uploadFiles] Content-Type: ${contentType}`);
  console.log(`[uploadFiles] Has body: ${!!req.body}`);
  console.log(`[uploadFiles] Content-Length: ${req.headers['content-length'] || 'unknown'}`);
  
  // Only process if it's actually multipart/form-data with a boundary
  if (!contentType.includes('multipart/form-data')) {
    console.log(`[uploadFiles] Not multipart/form-data, skipping file processing`);
    return next();
  }
  
  if (!contentType.includes('boundary=')) {
    console.log(`[uploadFiles] Warning: multipart/form-data but no boundary found`);
    // Still try to process - sometimes boundary might be in the body
  }
  
  console.log(`[uploadFiles] Attempting to process multiple files...`);
  
  // Try multiple files first (field name 'files')
  uploadMultiple(req, res, (err) => {
    if (err) {
      console.error(`[uploadFiles] Error processing multiple files:`, err.message);
      console.error(`[uploadFiles] Error stack:`, err.stack);
      
      // If error is about boundary or multipart, skip file processing
      if (err.message && (err.message.includes('Boundary') || err.message.includes('multipart') || err.message.includes('Unexpected end'))) {
        console.log(`[uploadFiles] Boundary/multipart error, trying single file handler...`);
        // If multiple files fails, try single file (field name 'file')
        return uploadSingle(req, res, (singleErr) => {
          if (singleErr) {
            console.error(`[uploadFiles] Error processing single file:`, singleErr.message);
            // If single file also fails, continue without files (might be text-only request)
            if (singleErr.message && (singleErr.message.includes('Boundary') || singleErr.message.includes('multipart') || singleErr.message.includes('Unexpected end'))) {
              console.log(`[uploadFiles] Single file also failed, continuing without files (likely text-only request)`);
              return next();
            }
            return next(singleErr);
          }
          console.log(`[uploadFiles] Single file processed successfully`);
          next();
        });
      }
      return next(err);
    }
    
    console.log(`[uploadFiles] Multiple files processed. Files count: ${req.files ? req.files.length : 0}`);
    
    // If no files were uploaded, try single file handler
    if (!req.files || req.files.length === 0) {
      console.log(`[uploadFiles] No files in req.files, trying single file handler...`);
      return uploadSingle(req, res, (singleErr) => {
        if (singleErr) {
          console.error(`[uploadFiles] Single file handler error:`, singleErr.message);
          // Continue anyway - might be text-only request
          if (singleErr.message && (singleErr.message.includes('Boundary') || singleErr.message.includes('multipart') || singleErr.message.includes('Unexpected end'))) {
            console.log(`[uploadFiles] Continuing without files`);
            return next();
          }
          return next(singleErr);
        }
        console.log(`[uploadFiles] Single file found: ${req.file ? req.file.originalname : 'none'}`);
        next();
      });
    }
    
    next();
  });
};

/**
 * GET /api/gpa/:userId
 * Get GPA data for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const gpaData = await getGpaData(userId);

    // Return empty/default GPA data if not found instead of 404
    if (!gpaData) {
      return res.json({
        success: true,
        gpaData: {
          userId,
          courses: [],
          totalCreditsRequired: 120,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      gpaData,
    });
  } catch (error) {
    console.error('Error fetching GPA data:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch GPA data' });
  }
});

/**
 * POST /api/gpa/:userId
 * Create or update GPA data for a user
 */
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const gpaData = await saveGpaData(userId, data);

    res.json({
      success: true,
      gpaData,
    });
  } catch (error) {
    console.error('Error saving GPA data:', error);
    res.status(500).json({ error: error.message || 'Failed to save GPA data' });
  }
});

/**
 * POST /api/gpa/:userId/courses
 * Add a course to user's GPA data
 */
router.post('/:userId/courses', async (req, res) => {
  try {
    const { userId } = req.params;
    const course = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!course.name || !course.credits || !course.grade) {
      return res.status(400).json({ error: 'Course name, credits, and grade are required' });
    }

    const updatedGpaData = await addCourse(userId, course);

    res.json({
      success: true,
      gpaData: updatedGpaData,
    });
  } catch (error) {
    console.error('Error adding course:', error);
    res.status(500).json({ error: error.message || 'Failed to add course' });
  }
});

/**
 * PATCH /api/gpa/:userId/courses/:courseId
 * Update a course in user's GPA data
 */
router.patch('/:userId/courses/:courseId', async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    const updates = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ error: 'userId and courseId are required' });
    }

    const updatedGpaData = await updateCourse(userId, courseId, updates);

    res.json({
      success: true,
      gpaData: updatedGpaData,
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: error.message || 'Failed to update course' });
  }
});

/**
 * DELETE /api/gpa/:userId/courses/:courseId
 * Delete a course from user's GPA data
 */
router.delete('/:userId/courses/:courseId', async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    if (!userId || !courseId) {
      return res.status(400).json({ error: 'userId and courseId are required' });
    }

    const updatedGpaData = await deleteCourse(userId, courseId);

    res.json({
      success: true,
      gpaData: updatedGpaData,
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: error.message || 'Failed to delete course' });
  }
});

/**
 * POST /api/gpa/:userId/suggestions
 * Get AI-powered class suggestions
 */
router.post('/:userId/suggestions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { completedCourses, totalCreditsRequired, major } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get GPA data to calculate remaining credits
    const gpaData = await getGpaData(userId);
    const completedCredits = gpaData?.courses?.reduce((sum, course) => sum + (course.credits || 0), 0) || 0;
    const remainingCredits = (gpaData?.totalCreditsRequired || totalCreditsRequired || 120) - completedCredits;

    // Generate AI suggestions based on completed courses and remaining credits
    const suggestions = await generateAISuggestions({
      userId,
      completedCourses: completedCourses || gpaData?.courses || [],
      remainingCredits,
      major: major || gpaData?.major,
    });

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate suggestions' });
  }
});

/**
 * Generate AI-powered class suggestions using OpenAI
 */
async function generateAISuggestions({ userId, completedCourses, remainingCredits, major }) {
  try {
    console.log('[generateAISuggestions] Starting AI suggestion generation...');
    console.log(`[generateAISuggestions] Completed courses: ${completedCourses?.length || 0}, Remaining credits: ${remainingCredits}, Major: ${major || 'N/A'}`);
    
    // Get graduation requirements analysis if available
    const gpaData = await getGpaData(userId);
    const requirementsAnalysis = gpaData?.graduationRequirementsAnalysis;
    
    // Calculate next future semester for suggestions
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    
    let targetSemester;
    if (month >= 11) {
      // November or December - suggest next year's Spring
      targetSemester = `${year + 1} Spring`;
    } else if (month <= 7) {
      // January through July - we're in Spring, suggest current year Fall
      targetSemester = `${year} Fall`;
    } else {
      // August through October - we're in Fall, suggest next year's Spring
      targetSemester = `${year + 1} Spring`;
    }

    // Build context about completed courses
    const completedCoursesText = completedCourses && completedCourses.length > 0
      ? `Completed Courses:\n${completedCourses.map(c => {
          const parts = [`- ${c.name || 'Unknown Course'}`];
          if (c.nameKorean) parts.push(` (${c.nameKorean})`);
          if (c.credits) parts.push(` - ${c.credits} credits`);
          if (c.grade) parts.push(` - Grade: ${c.grade}`);
          if (c.code) parts.push(` - Code: ${c.code}`);
          if (c.semester) parts.push(` - Semester: ${c.semester}`);
          return parts.join('');
        }).join('\n')}`
      : 'No courses completed yet.';

    // Build context about remaining requirements
    let requirementsContext = '';
    if (requirementsAnalysis) {
      const requiredCoursesRemaining = requirementsAnalysis.analysis?.requiredCoursesRemaining || [];
      const remainingCreditsBreakdown = requirementsAnalysis.creditBreakdown;
      
      requirementsContext = `\n\nGraduation Requirements:\n`;
      requirementsContext += `- Total Credits Required: ${requirementsAnalysis.totalCreditsRequired || remainingCredits + (completedCourses?.reduce((sum, c) => sum + (c.credits || 0), 0) || 0)}\n`;
      requirementsContext += `- Remaining Credits: ${remainingCredits}\n`;
      
      if (requiredCoursesRemaining.length > 0) {
        requirementsContext += `\nRequired Courses Still Needed:\n${requiredCoursesRemaining.slice(0, 10).map(c => `  - ${c}`).join('\n')}\n`;
        if (requiredCoursesRemaining.length > 10) {
          requirementsContext += `  ... and ${requiredCoursesRemaining.length - 10} more required courses\n`;
        }
      }
      
      if (remainingCreditsBreakdown) {
        requirementsContext += `\nCredit Breakdown Needed:\n`;
        if (remainingCreditsBreakdown.generalEducation) {
          requirementsContext += `  - General Education: ${remainingCreditsBreakdown.generalEducation.subtotal || 0} credits\n`;
        }
        if (remainingCreditsBreakdown.major) {
          requirementsContext += `  - Major: ${remainingCreditsBreakdown.major.subtotal || 0} credits\n`;
        }
        if (remainingCreditsBreakdown.generalElective) {
          requirementsContext += `  - General Elective: ${remainingCreditsBreakdown.generalElective || 0} credits\n`;
        }
      }
    } else {
      requirementsContext = `\n\nRemaining Credits Needed: ${remainingCredits}`;
    }

    // Build prompt for AI
    const prompt = `You are an expert academic advisor helping a university student plan their course schedule.

Student Information:
${completedCoursesText}
${requirementsContext}
${major ? `Major/Field of Study: ${major}` : ''}

Task: Generate 4-6 intelligent course suggestions for the student's next semester (${targetSemester}).

Guidelines:
1. Suggest courses that logically build on courses the student has already completed
2. Prioritize required courses if graduation requirements are available
3. Consider prerequisite relationships (don't suggest advanced courses without prerequisites)
4. Balance course difficulty and credit load
5. Include courses that fulfill remaining credit requirements (general education, major, electives)
6. For Korean universities, suggest courses relevant to Korean academic programs
7. Provide specific, actionable reasons for each suggestion

For each course suggestion, provide:
- Course name (in English, and Korean if applicable)
- Credits (typically 2-3 credits for Korean universities)
- Reason: A specific explanation of why this course is recommended

Return ONLY valid JSON (no markdown) in this format:
{
  "suggestions": [
    {
      "name": "Course Name in English",
      "nameKorean": "한글 과목명 (optional)",
      "credits": 3,
      "reason": "Specific reason why this course is recommended (2-3 sentences)",
      "category": "major/generalEducation/generalElective",
      "isRequired": true or false
    }
  ]
}

Generate 4-6 relevant course suggestions based on the student's progress and requirements.`;

    console.log('[generateAISuggestions] Sending request to OpenAI...');
    const apiStartTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic advisor specializing in university course planning. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7, // Slightly higher for more creative suggestions
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const apiTime = Date.now() - apiStartTime;
    console.log(`[generateAISuggestions] OpenAI call completed in ${(apiTime / 1000).toFixed(2)}s`);

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI API');
    }

    // Parse JSON response
    let aiResponse;
    try {
      const cleanedContent = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[generateAISuggestions] Error parsing JSON response:', parseError);
      console.error('[generateAISuggestions] Response preview:', responseText.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Validate and format suggestions
    if (!aiResponse.suggestions || !Array.isArray(aiResponse.suggestions)) {
      console.error('[generateAISuggestions] Invalid response structure:', aiResponse);
      throw new Error('Invalid response format: missing suggestions array');
    }

    // Format suggestions with IDs and metadata
    const formattedSuggestions = aiResponse.suggestions.map((suggestion, index) => ({
      id: `suggestion_${Date.now()}_${index + 1}`,
      name: suggestion.name || 'Unnamed Course',
      nameKorean: suggestion.nameKorean || null,
      credits: suggestion.credits || 3,
      reason: suggestion.reason || 'Recommended based on your academic progress',
      category: suggestion.category || 'major',
      isRequired: suggestion.isRequired || false,
      isAI: true,
      semester: targetSemester,
      createdAt: new Date(),
    }));

    console.log(`[generateAISuggestions] Generated ${formattedSuggestions.length} AI suggestions`);
    return formattedSuggestions;
  } catch (error) {
    console.error('[generateAISuggestions] Error generating AI suggestions:', error);
    
    // Fallback to basic suggestions if AI fails
    console.log('[generateAISuggestions] Falling back to basic suggestions...');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    let targetSemester;
    if (month >= 11) {
      targetSemester = `${year + 1} Spring`;
    } else if (month <= 7) {
      targetSemester = `${year} Fall`;
    } else {
      targetSemester = `${year + 1} Spring`;
    }

    // Return basic fallback suggestions
    return [
      {
        id: `suggestion_${Date.now()}_fallback_1`,
        name: 'Continue with Required Courses',
        credits: 3,
        reason: 'Focus on completing required courses for your major to stay on track for graduation',
        isAI: false,
        semester: targetSemester,
        createdAt: new Date(),
      },
      {
        id: `suggestion_${Date.now()}_fallback_2`,
        name: 'General Education Elective',
        credits: 3,
        reason: 'Consider taking a general education course to fulfill credit requirements',
        isAI: false,
        semester: targetSemester,
        createdAt: new Date(),
      },
    ];
  }
}

/**
 * POST /api/gpa/:userId/requirements/analyze
 * Analyze graduation requirements from uploaded file(s) or text
 * Supports both single file (backward compatibility) and multiple files (up to 5)
 */
router.post('/:userId/requirements/analyze', uploadFiles, async (req, res) => {
  try {
    console.log(`[analyze] Request received for userId: ${req.params.userId}`);
    console.log(`[analyze] req.files:`, req.files ? `${req.files.length} files` : 'none');
    console.log(`[analyze] req.file:`, req.file ? req.file.originalname : 'none');
    console.log(`[analyze] req.body keys:`, Object.keys(req.body || {}));
    console.log(`[analyze] Content-Type:`, req.headers['content-type']);
    
    const { userId } = req.params;
    const { text, completedCourses } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let analysis;
      
      // Get completed courses from GPA data
    let courses = [];
    try {
      const gpaData = await getGpaData(userId);
      if (completedCourses) {
        try {
          courses = typeof completedCourses === 'string' ? JSON.parse(completedCourses) : completedCourses;
        } catch (parseError) {
          console.warn('Failed to parse completedCourses, using GPA data:', parseError);
          courses = gpaData?.courses || [];
        }
      } else {
        courses = gpaData?.courses || [];
      }
    } catch (gpaError) {
      console.warn('Failed to get GPA data, proceeding without completed courses:', gpaError);
      courses = [];
    }

    // Handle both single file (req.file) and multiple files (req.files)
    const filesToProcess = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    
    if (filesToProcess.length > 0) {
      // Files uploaded (single or multiple)
      const filePaths = [];
      const storagePaths = []; // Track Firebase Storage paths for cleanup
      const analyses = [];

      try {
        // Upload files to Firebase Storage first (even though temporary, for consistency)
        console.log(`[analyze] Uploading ${filesToProcess.length} files to Firebase Storage...`);
        const uploadPromises = filesToProcess.map(async (file, i) => {
          const filename = file.filename || path.basename(file.path);
          try {
            const result = await uploadGPARequirementImage(file.path, userId, filename);
            return result.storagePath;
          } catch (uploadError) {
            console.warn(`[analyze] Failed to upload file ${i + 1} to Firebase Storage, using local file:`, uploadError);
            return null; // Continue with local file if upload fails
          }
        });
        const uploadedPaths = await Promise.all(uploadPromises);
        storagePaths.push(...uploadedPaths.filter(Boolean));

        // Analyze files in parallel for faster processing
        console.log(`[analyze] Processing ${filesToProcess.length} files in parallel...`);
        const analysisPromises = filesToProcess.map(async (file, i) => {
          const filePath = file.path;
          const fileExt = path.extname(file.originalname).toLowerCase();
          filePaths.push(filePath);

          console.log(`[analyze] Starting analysis for file ${i + 1}/${filesToProcess.length}: ${file.originalname} (${fileExt})`);
          
          try {
            let fileAnalysis;
            const fileStartTime = Date.now();
            
            if (fileExt === '.pdf') {
              console.log(`[analyze] Analyzing PDF: ${file.originalname}`);
              fileAnalysis = await analyzeRequirementsPDF(filePath, userId, courses);
            } else {
              const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
              if (imageExtensions.includes(fileExt)) {
                console.log(`[analyze] Analyzing image: ${file.originalname}`);
                fileAnalysis = await analyzeRequirementsImage(filePath, userId, courses);
              } else {
                console.warn(`[analyze] Skipping unsupported file format: ${fileExt}`);
                return null;
              }
            }
            
            const fileTime = Date.now() - fileStartTime;
            console.log(`[analyze] File ${i + 1} analyzed successfully in ${(fileTime / 1000).toFixed(2)}s`);
            
            if (fileAnalysis) {
              console.log(`[analyze] File ${i + 1} graduation requirements analyzed:`);
              console.log(`[analyze]   - Total credits required: ${fileAnalysis.totalCreditsRequired || 'N/A'}`);
              console.log(`[analyze]   - Required courses found: ${fileAnalysis.requiredCourses?.length || 0}`);
              console.log(`[analyze]   - Credit breakdown: ${fileAnalysis.creditBreakdown ? 'Yes' : 'No'}`);
              return fileAnalysis;
            } else {
              console.warn(`[analyze] File ${i + 1} returned null analysis`);
              return null;
            }
          } catch (fileError) {
            console.error(`[analyze] Error analyzing file ${i + 1} (${file.originalname}):`);
            console.error(`[analyze] Error type: ${fileError.constructor.name}`);
            console.error(`[analyze] Error message: ${fileError.message}`);
            console.error(`[analyze] Error stack:`, fileError.stack);
            // Return null to continue with other files
            return null;
          }
        });

        // Wait for all analyses to complete
        const analysisResults = await Promise.all(analysisPromises);
        analyses.push(...analysisResults.filter(result => result !== null));

        if (analyses.length === 0) {
          throw new Error('Failed to analyze any files');
        }

        // Merge all analyses
        analysis = mergeAnalysisResults(analyses);

        // Recalculate analysis with completed courses
        if (courses.length > 0 && analysis) {
          const completedCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
          const completedCourseNames = courses.map(c => c.name.toLowerCase());
          const completedCourseCodes = courses.map(c => c.code ? c.code.substring(0, 5) : null).filter(Boolean);
          
          if (analysis.analysis) {
            analysis.analysis.completedCredits = completedCredits;
            analysis.analysis.completedCourses = courses.length;
            analysis.analysis.remainingCredits = (analysis.totalCreditsRequired || 0) - completedCredits;
            
            if (analysis.requiredCourses && Array.isArray(analysis.requiredCourses)) {
              analysis.analysis.requiredCoursesCompleted = analysis.requiredCourses.filter(course => {
                const courseNameLower = (course.name || '').toLowerCase();
                const courseKoreanLower = (course.nameKorean || '').toLowerCase();
                const courseCodePrefix = course.code ? course.code.substring(0, 5) : null;
                
                return completedCourseNames.some(completed => 
                  completed.includes(courseNameLower) || 
                  courseNameLower.includes(completed) ||
                  completed.includes(courseKoreanLower) ||
                  courseKoreanLower.includes(completed)
                ) || (courseCodePrefix && completedCourseCodes.includes(courseCodePrefix));
              }).map(c => c.nameKorean || c.name);
              
              analysis.analysis.requiredCoursesRemaining = analysis.requiredCourses.filter(course => {
                const courseNameLower = (course.name || '').toLowerCase();
                const courseKoreanLower = (course.nameKorean || '').toLowerCase();
                const courseCodePrefix = course.code ? course.code.substring(0, 5) : null;
                
                return !completedCourseNames.some(completed => 
                  completed.includes(courseNameLower) || 
                  courseNameLower.includes(completed) ||
                  completed.includes(courseKoreanLower) ||
                  courseKoreanLower.includes(completed)
                ) && !(courseCodePrefix && completedCourseCodes.includes(courseCodePrefix));
              }).map(c => c.nameKorean || c.name);
            }
          }
        }

      } catch (analysisError) {
        console.error(`[analyze] Analysis error caught:`);
        console.error(`[analyze] Error type: ${analysisError.constructor.name}`);
        console.error(`[analyze] Error message: ${analysisError.message}`);
        console.error(`[analyze] Error stack:`, analysisError.stack);
        console.error(`[analyze] Files processed before error: ${analyses.length}/${filesToProcess.length}`);
        
        // Clean up all uploaded files before throwing error
        console.log(`[analyze] Cleaning up ${filePaths.length} uploaded files...`);
        filePaths.forEach((filePath, idx) => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[analyze] Cleaned up file ${idx + 1}: ${filePath}`);
            }
          } catch (cleanupError) {
            console.error(`[analyze] Failed to delete temp file ${idx + 1}:`, cleanupError);
          }
        });
        throw analysisError;
      }

      // Clean up all local temp files after successful analysis
      filePaths.forEach(filePath => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error('Failed to delete temp file:', e);
        }
      });
      
      // Clean up files from Firebase Storage (temporary files)
      storagePaths.forEach((storagePath, idx) => {
        deleteFileFromFirebase(storagePath).catch(error => {
          console.warn(`[analyze] Failed to delete temporary file ${idx + 1} from Firebase Storage:`, error);
          // Non-critical error, continue
        });
      });

    } else if (text) {
      // Text input
      let courses = [];
      try {
      const gpaData = await getGpaData(userId);
        if (completedCourses) {
          try {
            courses = typeof completedCourses === 'string' ? JSON.parse(completedCourses) : completedCourses;
          } catch (parseError) {
            console.warn('Failed to parse completedCourses, using GPA data:', parseError);
            courses = gpaData?.courses || [];
          }
        } else {
          courses = gpaData?.courses || [];
        }
      } catch (gpaError) {
        console.warn('Failed to get GPA data, proceeding without completed courses:', gpaError);
        courses = [];
      }
      analysis = await analyzeGraduationRequirements(text, userId, courses);
    } else {
      return res.status(400).json({ error: 'Either file or text is required' });
    }

    console.log(`[analyze] ✅ Sending success response`);
    console.log(`[analyze] Analysis structure:`, {
      hasAnalysis: !!analysis,
      totalCredits: analysis?.totalCreditsRequired,
      coursesCount: analysis?.requiredCourses?.length || 0,
      hasCreditBreakdown: !!analysis?.creditBreakdown,
      keys: analysis ? Object.keys(analysis) : []
    });
    
    const responseData = {
      success: true,
      analysis,
    };
    
    console.log(`[analyze] Response payload keys:`, Object.keys(responseData));
    console.log(`[analyze] Response.analysis exists:`, !!responseData.analysis);
    console.log(`[analyze] Response.analysis keys:`, responseData.analysis ? Object.keys(responseData.analysis) : 'null');
    console.log(`[analyze] Sending JSON response...`);
    
    res.json(responseData);
    
    console.log(`[analyze] ✅ Response sent successfully`);
  } catch (error) {
    console.error(`[analyze] Error in route handler:`);
    console.error(`[analyze] Error type: ${error.constructor.name}`);
    console.error(`[analyze] Error message: ${error.message}`);
    console.error(`[analyze] Error stack:`, error.stack);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to analyze requirements';
    let statusCode = 500;
    
    if (error.message.includes('file') || error.message.includes('File')) {
      statusCode = 400;
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
      statusCode = 422;
      errorMessage = 'Failed to parse document. Please ensure the image is clear and contains readable text.';
    } else if (error.message.includes('size') || error.message.includes('large')) {
      statusCode = 413;
    } else if (error.message.includes('format') || error.message.includes('type')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

module.exports = router;

