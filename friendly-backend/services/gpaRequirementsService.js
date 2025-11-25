const OpenAI = require('openai');
const { extractTextFromPDF } = require('./pdfService');
const path = require('path');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze graduation requirements document (PDF or image text)
 * Extracts course requirements, credit requirements, and generates suggestions
 * Enhanced for Korean academic documents
 */
async function analyzeGraduationRequirements(text, userId, completedCourses = []) {
  try {
    // Build context about completed courses
    const completedCoursesText = completedCourses.length > 0
      ? `\n\nCompleted Courses:\n${completedCourses.map(c => `- ${c.name} (${c.credits || 0} credits${c.grade ? `, Grade: ${c.grade}` : ''}${c.code ? `, Code: ${c.code}` : ''})`).join('\n')}`
      : '\n\nNo courses completed yet.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using GPT-4o for better extraction of Korean academic documents
      messages: [
        {
          role: 'system',
          content: `You are an expert academic advisor specializing in Korean university graduation requirements. 
Analyze graduation requirement documents (especially Korean academic documents) and extract COMPREHENSIVE information.

CRITICAL: Extract ALL required courses from the document. Look for courses in:
- Curriculum tables (교과과정표)
- Required course lists (필수 이수 교과목)
- Course requirement sections (이수요건)
- Year-by-year curriculum (학년별 교과과정)
- Major requirement sections (전공 이수요건)
- Any tables or lists showing course codes and names

For Korean documents, extract:

1. 졸업기준 학점 (Graduation Credit Standards):
   - 총 학점 (Total Credits Required)
   - 교양 (General Education): 기초교양, 핵심교양, 자유교양 breakdown
   - 전공 (Major): 전공필수, 전공선택 breakdown
   - 일반선택 (General Elective)
   - 졸업인증 options: 심화전공, 부전공, 다전공

2. 필수 이수 교과과정 (Required Course Curriculum) - Extract EVERY SINGLE COURSE:
   - Look through ALL sections of the document systematically
   - Extract courses from ALL years (1학년, 2학년, 3학년, 4학년)
   - Extract courses from ALL semesters (1학기, 2학기)
   - Include courses marked as 필수 (required), 전공필수 (major required), 필수이수 (required to take)
   - Extract courses from curriculum tables, course lists, and requirement sections
   - For each course, capture: 교과목코드 (7-digit code), 한글 과목명 (Korean name), 학점 (credits), 학년 (year), 학기 (semester), 구분 (category)
   - IMPORTANT: The document likely contains MANY courses (often 20-50+ courses). Extract ALL of them, not just a few examples.
   - Courses organized by 학년 (year) and 학기 (semester)
   - 교과목코드 (Course codes) - 7-digit codes
   - Course names in Korean (한글)
   - Credits (학점) per course
   - Category (전공선택, 기초교양, etc.)

3. 졸업인증 요건 (Graduation Certification Requirements):
   - Field training, certifications, GPA, English scores, etc.

Format your response as JSON with this exact structure:
{
  "totalCreditsRequired": number,
  "creditBreakdown": {
    "generalEducation": {
      "basic": number,
      "core": number,
      "elective": number,
      "subtotal": number
    },
    "major": {
      "required": number,
      "elective": number,
      "subtotal": number
    },
    "generalElective": number
  },
  "requiredCourses": [
    {
      "name": "Course Name (English)",
      "nameKorean": "한글 과목명",
      "code": "7-digit code",
      "credits": number,
      "year": number,
      "semester": number,
      "category": "전공선택/기초교양/etc",
      "isRequired": boolean
    }
  ],
  "curriculumByYear": {
    "1": {
      "semester1": [{"name": "...", "code": "...", "credits": number, "category": "..."}],
      "semester2": [...]
    }
  },
  "graduationCertification": {
    "options": ["심화전공", "부전공", "다전공"],
    "requirements": [
      {
        "type": "field_training/certification/gpa/english/competition/career_plan",
        "description": "Requirement description",
        "details": {}
    }
    ]
  },
  "categories": [
    {
      "name": "Category Name",
      "creditsRequired": number,
      "courses": ["Course 1", "Course 2"]
    }
  ],
  "analysis": {
    "completedCourses": number,
    "completedCredits": number,
    "remainingCredits": number,
    "requiredCoursesCompleted": [],
    "requiredCoursesRemaining": [],
    "suggestions": []
  }
}

Important notes:
- Extract course codes exactly as shown (7-digit codes)
- Preserve Korean course names in nameKorean field
- Match courses by code (first 5 digits match = same course)
- Organize courses by year and semester when available
- Include all graduation certification requirements`,
        },
        {
          role: 'user',
          content: `Analyze this graduation requirements document:

${text.substring(0, 20000)}${completedCoursesText}

CRITICAL: Extract ALL required courses from the document. Look systematically through:
- Curriculum tables (교과과정표)
- Required course lists (필수 이수 교과목)
- Course requirement sections (이수요건)
- Year-by-year curriculum (학년별 교과과정)
- Major requirement sections (전공 이수요건)

The document likely contains MANY required courses (often 20-50+). Extract EVERY SINGLE COURSE with its code, Korean name, credits, year, semester, and category. Do not skip any courses.

Extract all graduation requirements with special attention to Korean academic format. Analyze what courses the student has completed vs what they still need to take.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 8000, // Increased to allow extraction of many courses
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content;
    let analysis = JSON.parse(responseText);

    // Ensure required structure exists
    if (!analysis.creditBreakdown) {
      analysis.creditBreakdown = {
        generalEducation: { basic: 0, core: 0, elective: 0, subtotal: 0 },
        major: { required: 0, elective: 0, subtotal: 0 },
        generalElective: 0
      };
    }
    if (!analysis.curriculumByYear) {
      analysis.curriculumByYear = {};
    }
    if (!analysis.graduationCertification) {
      analysis.graduationCertification = { options: [], requirements: [] };
    }
    if (!analysis.analysis) {
      analysis.analysis = {
        completedCourses: 0,
        completedCredits: 0,
        remainingCredits: analysis.totalCreditsRequired || 0,
        requiredCoursesCompleted: [],
        requiredCoursesRemaining: [],
        suggestions: []
      };
    }

    // Calculate completed courses analysis
    if (completedCourses.length > 0) {
      const completedCredits = completedCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
      const completedCourseNames = completedCourses.map(c => c.name.toLowerCase());
      const completedCourseCodes = completedCourses.map(c => c.code ? c.code.substring(0, 5) : null).filter(Boolean);
      
      analysis.analysis.completedCredits = completedCredits;
      analysis.analysis.completedCourses = completedCourses.length;
      analysis.analysis.remainingCredits = (analysis.totalCreditsRequired || 0) - completedCredits;
      
      // Check which required courses are completed (by name or code)
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

    return analysis;
  } catch (error) {
    console.error('Error analyzing graduation requirements:', error);
    throw new Error(`Failed to analyze requirements: ${error.message}`);
  }
}

/**
 * Analyze PDF file for graduation requirements
 */
async function analyzeRequirementsPDF(filePath, userId, completedCourses = []) {
  try {
    // Extract text from PDF
    const extractionResult = await extractTextFromPDF(filePath);
    const text = extractionResult.text;

    if (!text || text.trim().length === 0) {
      throw new Error('Failed to extract text from PDF. The PDF may be image-based.');
    }

    return await analyzeGraduationRequirements(text, userId, completedCourses);
  } catch (error) {
    console.error('Error analyzing PDF requirements:', error);
    throw error;
  }
}

/**
 * Analyze graduation requirements image using GPT-4o vision capabilities
 * Supports Korean academic documents with sophisticated OCR
 */
async function analyzeRequirementsImage(imagePath, userId, completedCourses = []) {
  try {
    console.log('Starting image analysis for graduation requirements...');
    const startTime = Date.now();
    
    // Validate file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error('Image file not found');
    }

    // Read the image file
    let imageBuffer = fs.readFileSync(imagePath);
    const originalSize = imageBuffer.length;
    
    // Check file size (GPT-4o vision has limits)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (imageBuffer.length > maxSize) {
      throw new Error(`Image file too large (${(originalSize / 1024 / 1024).toFixed(2)}MB). Maximum size is 20MB.`);
    }
    
    const base64Image = imageBuffer.toString('base64');
    console.log(`Image encoded to base64 (${(base64Image.length / 1024).toFixed(2)}KB)`);

    // Determine MIME type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else {
      console.warn(`Unknown image extension: ${ext}, defaulting to image/jpeg`);
    }

    // Build context about completed courses
    const completedCoursesText = completedCourses.length > 0
      ? `\n\nCompleted Courses:\n${completedCourses.map(c => `- ${c.name}${c.nameKorean ? ` (${c.nameKorean})` : ''} (${c.credits || 0} credits${c.grade ? `, Grade: ${c.grade}` : ''}${c.code ? `, Code: ${c.code}` : ''})`).join('\n')}`
      : '\n\nNo courses completed yet.';

    // Enhanced prompt to extract ALL required courses comprehensively
    const prompt = `Analyze this Korean graduation requirements document and extract COMPREHENSIVE information.

CRITICAL: Extract ALL required courses from the document. Look for courses in:
- Curriculum tables (교과과정표)
- Required course lists (필수 이수 교과목)
- Course requirement sections (이수요건)
- Year-by-year curriculum (학년별 교과과정)
- Major requirement sections (전공 이수요건)
- Any tables or lists showing course codes and names

Extract:

1. 총 학점 (Total Credits Required)

2. Credit breakdown:
   - 교양 (General Education): 기초교양, 핵심교양, 자유교양 breakdown
   - 전공 (Major): 전공필수, 전공선택 breakdown
   - 일반선택 (General Elective)

3. REQUIRED COURSES - Extract EVERY SINGLE COURSE:
   - Look through ALL sections of the document systematically
   - Extract courses from ALL years (1학년, 2학년, 3학년, 4학년) - check EACH year section
   - Extract courses from ALL semesters (1학기, 2학기) - check EACH semester within each year
   - The document may have a list format like:
     * "1학년 1학기: 소프트웨어세미나, 소프트웨어프로젝트 I, S-TEAM Class, English Conversation..."
     * "2학년 2학기: 컴퓨터구조, 이산수학, 응용통계학..."
   - Include ALL courses listed under each year/semester, even if they don't have course codes
   - Include courses marked as 필수 (required), 전공필수 (major required), 필수이수 (required to take)
   - Extract courses from curriculum tables, course lists, and requirement sections
   - For each course, capture: 교과목코드 (7-digit code if available), 한글 과목명 (Korean name), 학점 (credits if available), 학년 (year), 학기 (semester), 구분 (category)
   - If course code is not available, use "0000000" or leave code empty but still include the course
   - If credits are not specified, estimate based on typical Korean university standards (usually 2-3 credits)
   - IMPORTANT: The document likely contains MANY courses (often 20-50+ courses). Extract ALL of them, not just a few examples.
   - Count the courses: if you see a list with 10+ courses, extract ALL 10+, not just 2-3

4. Graduation certification options: 심화전공, 부전공, 다전공

Return ONLY valid JSON (no markdown):
{
  "totalCreditsRequired": 136,
  "creditBreakdown": {
    "generalEducation": {
      "basic": 8,
      "core": 15,
      "elective": 2,
      "subtotal": 25
    },
    "major": {
      "required": 41,
      "elective": 25,
      "subtotal": 66
    },
    "generalElective": 45
  },
  "requiredCourses": [
    {
      "name": "Software Thinking",
      "nameKorean": "소프트웨어적사고",
      "code": "1143702",
      "credits": 3,
      "year": 1,
      "semester": 1,
      "category": "전공선택",
      "isRequired": true
    },
    {
      "name": "Data Structures",
      "nameKorean": "자료구조",
      "code": "1143703",
      "credits": 3,
      "year": 1,
      "semester": 2,
      "category": "전공필수",
      "isRequired": true
    }
    // ... Continue extracting ALL courses found in the document
  ],
  "curriculumByYear": {
    "1": {
      "semester1": [
        {"name": "Software Thinking", "nameKorean": "소프트웨어적사고", "code": "1143702", "credits": 3, "category": "전공선택"}
      ],
      "semester2": [
        {"name": "Data Structures", "nameKorean": "자료구조", "code": "1143703", "credits": 3, "category": "전공필수"}
      ]
    },
    "2": {"semester1": [], "semester2": []},
    "3": {"semester1": [], "semester2": []},
    "4": {"semester1": [], "semester2": []}
  },
  "graduationCertification": {
    "options": ["심화전공", "부전공", "다전공"],
    "requirements": []
  },
  "categories": [],
  "analysis": {
    "completedCourses": 0,
    "completedCredits": 0,
    "remainingCredits": 136,
    "requiredCoursesCompleted": [],
    "requiredCoursesRemaining": [],
    "suggestions": []
  }
}

CRITICAL EXTRACTION RULES:
1. Extract ALL courses - do not skip any courses listed in the document
2. Scan the ENTIRE document systematically - check every table, list, and section
3. Look for course codes (7-digit numbers) and extract the course associated with each code
4. Preserve Korean course names exactly as written in nameKorean field
5. Extract courses from curriculum tables organized by year and semester
6. Include courses marked as 필수, 전공필수, 필수이수, or any required designation
7. If a course appears multiple times, include it once with the most complete information
8. Organize courses by year (1-4) and semester (1-2) in curriculumByYear
9. Set isRequired: true for all courses in requiredCourses array
10. Return ONLY valid JSON, no explanatory text

Remember: The document contains MANY required courses. Extract ALL of them comprehensively.${completedCoursesText}`;

    console.log('Sending request to GPT-4o...');
    console.log(`[GPT-4o] Image size: ${(base64Image.length / 1024).toFixed(2)}KB, MIME type: ${mimeType}`);
    console.log(`[GPT-4o] Prompt length: ${prompt.length} characters`);
    const apiStartTime = Date.now();
    
    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o', // Using GPT-4o for better OCR and comprehensive course extraction
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high', // High detail for accurate OCR of Korean text and course lists
                },
              },
            ],
          },
        ],
        max_tokens: 8000, // Increased to allow extraction of many courses
        temperature: 0.1, // Lower for more consistent extraction
        response_format: { type: 'json_object' },
      });
      
      const apiTime = Date.now() - apiStartTime;
      console.log(`[GPT-4o] Call completed in ${(apiTime / 1000).toFixed(2)}s`);
      console.log(`[GPT-4o] Response received, choices: ${response.choices?.length || 0}`);
    } catch (apiError) {
      const apiTime = Date.now() - apiStartTime;
      console.error(`[GPT-4o] API call failed after ${(apiTime / 1000).toFixed(2)}s`);
      console.error(`[GPT-4o] Error type: ${apiError.constructor.name}`);
      console.error(`[GPT-4o] Error message: ${apiError.message}`);
      console.error(`[GPT-4o] Error stack:`, apiError.stack);
      
      if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
        throw new Error('GPT-4o API request timed out. The image may be too large or complex. Please try with a smaller image.');
      }
      if (apiError.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (apiError.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API configuration.');
      }
      throw new Error(`GPT-4o API error: ${apiError.message}`);
    }

    if (!response || !response.choices || response.choices.length === 0) {
      console.error(`[GPT-4o] Invalid response structure:`, JSON.stringify(response, null, 2));
      throw new Error('Invalid response from GPT-4o API');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error(`[GPT-4o] No content in response:`, JSON.stringify(response, null, 2));
      throw new Error('No content received from GPT-4o API');
    }
    
    console.log(`[GPT-4o] Response content length: ${content.length} characters`);
    
    // Parse JSON response
    let analysis;
    try {
      console.log(`[GPT-4o] Parsing JSON response...`);
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedContent);
      console.log(`[GPT-4o] JSON parsed successfully`);
      console.log(`[GPT-4o] Analysis keys:`, Object.keys(analysis));
    } catch (parseError) {
      console.error(`[GPT-4o] Error parsing JSON response:`);
      console.error(`[GPT-4o] Parse error:`, parseError.message);
      console.error(`[GPT-4o] Response preview (first 1000 chars):`, content.substring(0, 1000));
      console.error(`[GPT-4o] Response preview (last 500 chars):`, content.substring(Math.max(0, content.length - 500)));
      throw new Error(`Failed to parse analysis response from AI: ${parseError.message}. The document may be too complex or unclear.`);
    }

    // Ensure required structure exists
    if (!analysis.creditBreakdown) {
      analysis.creditBreakdown = {
        generalEducation: { basic: 0, core: 0, elective: 0, subtotal: 0 },
        major: { required: 0, elective: 0, subtotal: 0 },
        generalElective: 0
      };
    }
    if (!analysis.curriculumByYear) {
      analysis.curriculumByYear = {};
    }
    if (!analysis.graduationCertification) {
      analysis.graduationCertification = { options: [], requirements: [] };
    }
    if (!analysis.analysis) {
      analysis.analysis = {
        completedCourses: 0,
        completedCredits: 0,
        remainingCredits: analysis.totalCreditsRequired || 0,
        requiredCoursesCompleted: [],
        requiredCoursesRemaining: [],
        suggestions: []
      };
    }
    if (!analysis.requiredCourses) {
      analysis.requiredCourses = [];
    }

    // Calculate completed courses analysis
    if (completedCourses.length > 0) {
      const completedCredits = completedCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
      const completedCourseNames = completedCourses.map(c => c.name.toLowerCase());
      const completedCourseCodes = completedCourses.map(c => c.code ? c.code.substring(0, 5) : null).filter(Boolean);
      
      analysis.analysis.completedCredits = completedCredits;
      analysis.analysis.completedCourses = completedCourses.length;
      analysis.analysis.remainingCredits = (analysis.totalCreditsRequired || 0) - completedCredits;
      
      // Check which required courses are completed (by name or code)
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
    } else {
      // If no completed courses, set remaining credits to total required
      analysis.analysis.remainingCredits = analysis.totalCreditsRequired || 0;
      if (analysis.requiredCourses && Array.isArray(analysis.requiredCourses)) {
        analysis.analysis.requiredCoursesRemaining = analysis.requiredCourses.map(c => c.nameKorean || c.name);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[GPT-4o] Graduation requirements analysis completed in ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`[GPT-4o] Found ${analysis.requiredCourses?.length || 0} required courses in document`);
    console.log(`[GPT-4o] Total credits required: ${analysis.totalCreditsRequired || 'N/A'}`);

    return analysis;
  } catch (error) {
    console.error('Error analyzing requirements image:', error);
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      throw new Error(`Failed to extract graduation requirements from image: ${error.message}`);
    }
    if (error.message.includes('file')) {
      throw new Error(`Image processing error: ${error.message}`);
    }
    throw new Error(`Image analysis failed: ${error.message}`);
  }
}

module.exports = {
  analyzeGraduationRequirements,
  analyzeRequirementsPDF,
  analyzeRequirementsImage,
};

