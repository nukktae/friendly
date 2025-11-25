const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * Extract text content from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<{text: string, pages: number, metadata: Object}>}
 */
async function extractTextFromPDF(filePath) {
  let parser = null;
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    return {
      text: textResult.text,
      pages: textResult.total,
      metadata: {
        info: infoResult.info,
        metadata: infoResult.metadata,
      },
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

/**
 * Extract text from PDF buffer (for uploaded files)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{text: string, pages: number, metadata: Object}>}
 */
async function extractTextFromPDFBuffer(pdfBuffer) {
  let parser = null;
  try {
    parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    return {
      text: textResult.text,
      pages: textResult.total,
      metadata: {
        info: infoResult.info,
        metadata: infoResult.metadata,
      },
    };
  } catch (error) {
    console.error('Error extracting text from PDF buffer:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

/**
 * Get page count from PDF
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<number>}
 */
async function getPDFPageCount(filePath) {
  let parser = null;
  try {
    const dataBuffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: dataBuffer });
    const infoResult = await parser.getInfo();
    return infoResult.total;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw new Error(`Failed to get PDF page count: ${error.message}`);
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

/**
 * Extract text from a specific page of PDF
 * Note: pdf-parse doesn't support page-specific extraction directly,
 * so we extract all pages and get the text for the specific page
 * @param {string} filePath - Path to PDF file
 * @param {number} pageNumber - Page number (1-indexed)
 * @returns {Promise<string>}
 */
async function extractTextFromPage(filePath, pageNumber) {
  let parser = null;
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: dataBuffer });
    
    // Extract text for specific page
    const textResult = await parser.getText({
      partial: [pageNumber],
    });
    
    if (pageNumber < 1 || pageNumber > textResult.total) {
      throw new Error(`Page ${pageNumber} is out of range. PDF has ${textResult.total} pages.`);
    }

    // Get the text for the specific page
    const pageData = textResult.pages.find(p => p.num === pageNumber);
    if (pageData) {
      return pageData.text || '';
    }
    
    // Fallback: If page-specific extraction didn't work, use the full text
    // and try to estimate page boundaries
    const fullTextResult = await parser.getText();
    const fullText = fullTextResult.text || '';
    
    // Try to estimate page boundaries (rough approximation)
    // Split text by common page break patterns
    const pages = fullText.split(/\n\s*\n\s*\n/); // Triple newlines often indicate page breaks
    
    if (pages.length >= pageNumber) {
      return pages[pageNumber - 1] || '';
    }
    
    // If splitting didn't work, return a portion based on page count
    const charsPerPage = Math.floor(fullText.length / textResult.total);
    const start = (pageNumber - 1) * charsPerPage;
    const end = pageNumber * charsPerPage;
    return fullText.substring(start, end).trim();
  } catch (error) {
    console.error(`Error extracting text from page ${pageNumber}:`, error);
    throw new Error(`Failed to extract text from page ${pageNumber}: ${error.message}`);
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromPDFBuffer,
  getPDFPageCount,
  extractTextFromPage,
};

