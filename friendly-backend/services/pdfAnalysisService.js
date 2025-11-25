const OpenAI = require('openai');
const { getPDFFileById, updatePDFFile } = require('./firestoreService');
const { extractTextFromPage, extractTextFromPDF } = require('./pdfService');
const { getDownloadURL } = require('./pdfStorageService');
const path = require('path');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze PDF content and generate summary
 * @param {string} fileId - PDF file ID
 * @param {string} userId - User ID
 * @returns {Promise<{summary: string, keyPoints: string[], topics: string[]}>}
 */
async function analyzePDF(fileId, userId) {
  try {
    // Get PDF file
    const pdfFile = await getPDFFileById(fileId, userId);
    if (!pdfFile) {
      throw new Error('PDF not found');
    }

    // Check if text is extracted, if not, extract it now
    let text = pdfFile.extractedText;
    
    if (!text || text.trim().length === 0) {
      console.log('PDF text not found, extracting now...');
      
      // Get the local file path from storage path
      if (!pdfFile.storagePath) {
        throw new Error('PDF storage path not found. Cannot extract text.');
      }

      // storagePath format: "pdfs/{userId}/{classId?}/{fileId}.pdf"
      // Actual file location: "uploads/pdfs/{userId}/{classId?}/{fileId}.pdf"
      const localFilePath = path.join(__dirname, '..', 'uploads', pdfFile.storagePath);
      
      console.log(`Looking for PDF at: ${localFilePath}`);
      console.log(`Storage path from DB: ${pdfFile.storagePath}`);
      
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`PDF file not found at: ${localFilePath}. Storage path: ${pdfFile.storagePath}`);
      }

      // Extract text from PDF
      const extractionResult = await extractTextFromPDF(localFilePath);
      text = extractionResult.text;
      
      if (!text || text.trim().length === 0) {
        throw new Error('Failed to extract text from PDF. The PDF may be image-based or corrupted.');
      }

      // Save extracted text to Firestore
      await updatePDFFile(fileId, userId, { extractedText: text });
      console.log('✅ Successfully extracted and saved PDF text');
    }

    // Limit text length for OpenAI (max ~4000 tokens, ~16000 chars)
    const maxLength = 15000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...'
      : text;

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert academic tutor helping students prepare for exams. Your summaries should be:
- Clear, concise, and well-organized
- Structured for easy studying and quick review
- Focused on key concepts, definitions, and important details
- Formatted with proper paragraphs and clear sections
- Free of unnecessary filler words

Format your response EXACTLY as follows:
SUMMARY:
[2-3 well-structured paragraphs covering the main concepts]

KEY POINTS:
• [Point 1 - concise and specific]
• [Point 2 - concise and specific]
• [Continue with 5-10 key points]`,
        },
        {
          role: 'user',
          content: `Analyze this academic document and create a study-friendly summary:

${truncatedText}

Provide a comprehensive analysis formatted as specified above.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0].message.content;

    // Parse the response to extract summary and key points
    const summary = extractSummary(responseText);
    const keyPoints = extractKeyPoints(responseText);

    // Update PDF file with analysis
    const analysis = {
      summary: summary || responseText.substring(0, 500),
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Analysis completed'],
      analyzedAt: new Date(),
    };

    await updatePDFFile(fileId, userId, { analysis });

    return analysis;
  } catch (error) {
    console.error('Error analyzing PDF:', error);
    throw new Error(`Failed to analyze PDF: ${error.message}`);
  }
}

/**
 * Extract summary from OpenAI response
 */
function extractSummary(text) {
  // Look for SUMMARY: section (case insensitive)
  const summaryMatch = text.match(/summary[:\s]+(.*?)(?=\n\s*KEY POINTS|KEY POINTS|TOPICS|$)/is);
  if (summaryMatch) {
    let summary = summaryMatch[1].trim();
    // Clean up any remaining formatting artifacts
    summary = summary.replace(/^\n+|\n+$/g, '');
    // Split into paragraphs and clean each
    const paragraphs = summary.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    return paragraphs.join('\n\n');
  }
  // Fallback: take first substantial paragraph
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  return paragraphs[0] || text.substring(0, 500);
}

/**
 * Extract key points from OpenAI response
 */
function extractKeyPoints(text) {
  const keyPoints = [];
  
  // Look for "KEY POINTS:" section (case insensitive)
  const keyPointsSection = text.match(/KEY POINTS[:\s]+(.*?)(?=\n\s*SUMMARY|SUMMARY|$)/is);
  if (keyPointsSection) {
    const sectionText = keyPointsSection[1];
    
    // Extract bullet points (•, -, *)
    const bulletPattern = /[-•*]\s*(.+?)(?=\n[-•*]|\n\s*SUMMARY|$)/g;
    let match;
    while ((match = bulletPattern.exec(sectionText)) !== null) {
      const point = match[1].trim();
      if (point.length > 0) {
        keyPoints.push(point);
      }
    }
    
    // If no bullets found, try numbered list
    if (keyPoints.length === 0) {
      const numberedPattern = /\d+[\.\)]\s*(.+?)(?=\n\d+[\.\)]|\n\s*SUMMARY|$)/g;
      while ((match = numberedPattern.exec(sectionText)) !== null) {
        const point = match[1].trim();
        if (point.length > 0) {
          keyPoints.push(point);
        }
      }
    }
    
    // If still no points, try line-by-line extraction
    if (keyPoints.length === 0) {
      const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      keyPoints.push(...lines.slice(0, 10));
    }
  } else {
    // Fallback: look for bullet points anywhere in text
    const bulletPattern = /[-•*]\s*(.+?)(?=\n[-•*]|\n\n|$)/g;
    let match;
    while ((match = bulletPattern.exec(text)) !== null) {
      const point = match[1].trim();
      if (point.length > 0 && !point.match(/^(KEY POINTS|MAIN TOPICS|TOPICS|SUMMARY)/i)) {
        keyPoints.push(point);
      }
    }
  }

  return keyPoints.slice(0, 10).filter(p => p.length > 0); // Limit to 10 key points
}

/**
 * Extract topics from OpenAI response
 */
function extractTopics(text) {
  const topics = [];
  
  // Look for "TOPICS:" section (case insensitive)
  const topicsSection = text.match(/TOPICS[:\s]+(.*?)(?=\n\s*SUMMARY|\n\s*KEY POINTS|$)/is);
  if (topicsSection) {
    const sectionText = topicsSection[1].trim();
    
    // Try comma-separated format first (most common in our prompt)
    if (sectionText.includes(',')) {
      const topicMatches = sectionText.split(',').map(t => t.trim()).filter(t => t.length > 0);
      topics.push(...topicMatches);
    } else {
      // Try bullet-separated or line-separated
      const topicMatches = sectionText.match(/(?:[-•*]\s*)?([^,\n]+?)(?=\n|$)/g);
      if (topicMatches) {
        topics.push(...topicMatches.map(t => t.replace(/^[-•*]\s*/, '').trim()).filter(t => t.length > 0));
      } else {
        // Fallback: split by newlines
        const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        topics.push(...lines);
      }
    }
  } else {
    // Fallback: look for "Topics:" or "Themes:" section
    const fallbackSection = text.match(/(?:topics|themes)[:\s]+(.*?)(?=summary|key points|$)/is);
    if (fallbackSection) {
      const sectionText = fallbackSection[1];
      const topicMatches = sectionText.match(/(?:[-•*]\s*)?([^,\n]+?)(?=,|\n|$)/g);
      if (topicMatches) {
        topics.push(...topicMatches.map(t => t.replace(/^[-•*]\s*/, '').trim()).filter(t => t.length > 0));
      }
    }
  }

  return topics.slice(0, 5).filter(t => t.length > 0); // Limit to 5 topics
}

/**
 * Analyze a specific page of PDF
 * @param {string} fileId - PDF file ID
 * @param {string} userId - User ID
 * @param {number} pageNumber - Page number (1-indexed)
 * @returns {Promise<{summary: string, keyPoints: string[], topics: string[]}>}
 */
async function analyzePDFPage(fileId, userId, pageNumber) {
  try {
    // Get PDF file
    const pdfFile = await getPDFFileById(fileId, userId);
    if (!pdfFile) {
      throw new Error('PDF not found');
    }

    if (!pdfFile.storagePath) {
      throw new Error('PDF storage path not found');
    }

    // Get the local file path from storage path
    // storagePath format: "pdfs/{userId}/{classId?}/{fileId}.pdf"
    // Actual file location: "uploads/pdfs/{userId}/{classId?}/{fileId}.pdf"
    const localFilePath = path.join(__dirname, '..', 'uploads', pdfFile.storagePath);
    
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`PDF file not found at: ${localFilePath}`);
    }

    // Extract text from specific page
    const pageText = await extractTextFromPage(localFilePath, pageNumber);
    
    if (!pageText || pageText.trim().length === 0) {
      throw new Error(`No text found on page ${pageNumber}`);
    }

    // Limit text length for OpenAI
    const maxLength = 8000; // Smaller limit for single page
    const truncatedText = pageText.length > maxLength 
      ? pageText.substring(0, maxLength) + '...'
      : pageText;

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert academic tutor helping students prepare for exams. Your page summaries should be:
- Clear, concise, and well-organized
- Structured for easy studying and quick review
- Focused on key concepts and important details from this specific page
- Formatted with proper paragraphs and clear sections

Format your response EXACTLY as follows:
SUMMARY:
[1-2 well-structured paragraphs covering the main concepts on this page]

KEY POINTS:
• [Point 1 - concise and specific]
• [Point 2 - concise and specific]
• [Continue with 3-7 key points]`,
        },
        {
          role: 'user',
          content: `Analyze page ${pageNumber} of this academic document and create a study-friendly summary:

${truncatedText}

Provide a concise analysis formatted as specified above.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0].message.content;

    // Parse the response to extract summary and key points
    const summary = extractSummary(responseText);
    const keyPoints = extractKeyPoints(responseText);

    const pageAnalysis = {
      summary: summary || responseText.substring(0, 300),
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Analysis completed'],
      analyzedAt: new Date(),
      pageNumber,
    };

    // Get existing page analyses or initialize
    const existingPageAnalyses = pdfFile.pageAnalyses || {};
    existingPageAnalyses[pageNumber] = pageAnalysis;

    // Update PDF file with page analysis
    await updatePDFFile(fileId, userId, { 
      pageAnalyses: existingPageAnalyses 
    });

    return pageAnalysis;
  } catch (error) {
    console.error('Error analyzing PDF page:', error);
    throw new Error(`Failed to analyze PDF page: ${error.message}`);
  }
}

module.exports = {
  analyzePDF,
  analyzePDFPage,
};

