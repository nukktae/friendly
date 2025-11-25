const OpenAI = require('openai');
const { getPDFFileById, savePDFChatMessage, getPDFChatHistory } = require('./firestoreService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Chat with PDF - answer questions about PDF content
 * @param {string} fileId - PDF file ID
 * @param {string} userId - User ID
 * @param {string} question - User question
 * @param {string} selectedText - Optional selected text from PDF
 * @returns {Promise<{answer: string, chatId: string, pageReferences: string[]}>}
 */
async function chatWithPDF(fileId, userId, question, selectedText) {
  try {
    // Get PDF file
    const pdfFile = await getPDFFileById(fileId, userId);
    if (!pdfFile) {
      throw new Error('PDF not found');
    }

    // Check if text is extracted
    if (!pdfFile.extractedText || pdfFile.extractedText.trim().length === 0) {
      throw new Error('PDF text not extracted. Please extract text first.');
    }

    const text = pdfFile.extractedText;

    // Limit text length for OpenAI (max ~4000 tokens, ~16000 chars)
    const maxLength = 15000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...'
      : text;

    // Get chat history for context
    const chatHistory = await getPDFChatHistory(fileId, userId, 5);
    const historyMessages = chatHistory
      .reverse() // Oldest first
      .slice(0, 5) // Last 5 conversations
      .flatMap(chat => [
        { role: 'user', content: chat.question },
        { role: 'assistant', content: chat.answer },
      ]);

    // Build context
    let context = `PDF Title: ${pdfFile.title || 'Untitled PDF'}\n\n`;
    
    // If selected text is provided, prioritize it in the context
    if (selectedText && selectedText.trim().length > 0) {
      context += `Selected Text from PDF:\n"${selectedText.trim()}"\n\n`;
      context += `Full PDF Content (for reference):\n${truncatedText}\n\n`;
    } else {
      context += `PDF Content:\n${truncatedText}\n\n`;
    }
    
    if (pdfFile.analysis) {
      context += `Summary: ${pdfFile.analysis.summary}\n`;
      if (pdfFile.analysis.keyPoints && pdfFile.analysis.keyPoints.length > 0) {
        context += `Key Points:\n${pdfFile.analysis.keyPoints.map((point, idx) => `  ${idx + 1}. ${point}`).join('\n')}\n\n`;
      }
    }

    const systemMessage = selectedText && selectedText.trim().length > 0
      ? `You are an AI assistant helping a student understand a PDF document. The user has selected specific text from the PDF and is asking about it. Focus on the selected text first, but you can also reference the full PDF content for context. Be precise, helpful, and explain how the selected text relates to the broader document. Answer questions based on what is in the PDF.

Format your response clearly with:
- Use **bold** for key terms and concepts
- Use numbered lists (1., 2., 3.) for sequential points or steps
- Use bullet points (- or •) for related items or examples
- Separate paragraphs with clear spacing
- Keep responses organized and easy to scan`
      : `You are an AI assistant helping a student understand a PDF document. Focus ONLY on the PDF content provided. Answer questions based solely on what is in the PDF. Be precise, helpful, and reference specific parts of the content when relevant. If the question is not related to the PDF content, politely redirect the conversation back to the PDF. When referencing specific information, mention that it's from the PDF.

Format your response clearly with:
- Use **bold** for key terms and concepts
- Use numbered lists (1., 2., 3.) for sequential points or steps
- Use bullet points (- or •) for related items or examples
- Separate paragraphs with clear spacing
- Keep responses organized and easy to scan`;

    const messages = [
      {
        role: 'system',
        content: systemMessage,
      },
      ...historyMessages,
      {
        role: 'user',
        content: `${context}\n\nUser Question: ${question}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0].message.content;

    // Extract page references from answer (simple heuristic)
    const pageReferences = extractPageReferences(answer, pdfFile.pages || 1);

    // Save chat message
    const chatData = await savePDFChatMessage(fileId, userId, question, answer, pageReferences);

    return {
      answer,
      chatId: chatData.chatId,
      pageReferences,
    };
  } catch (error) {
    console.error('Error in PDF chat:', error);
    throw new Error(`PDF chat failed: ${error.message}`);
  }
}

/**
 * Extract page references from answer text
 * Simple heuristic to find page numbers mentioned
 */
function extractPageReferences(answer, totalPages) {
  const pageRefs = [];
  
  // Look for patterns like "page 5", "on page 3", "pages 10-12", etc.
  const pagePatterns = [
    /page\s+(\d+)/gi,
    /pages\s+(\d+)(?:\s*-\s*(\d+))?/gi,
    /p\.\s*(\d+)/gi,
  ];

  pagePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(answer)) !== null) {
      const pageNum = parseInt(match[1]);
      if (pageNum > 0 && pageNum <= totalPages) {
        pageRefs.push(`Page ${pageNum}`);
      }
      if (match[2]) {
        const endPage = parseInt(match[2]);
        if (endPage > pageNum && endPage <= totalPages) {
          pageRefs.push(`Pages ${pageNum}-${endPage}`);
        }
      }
    }
  });

  // Remove duplicates
  return [...new Set(pageRefs)];
}

module.exports = {
  chatWithPDF,
};

