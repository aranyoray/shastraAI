const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const upload = multer({ 
  dest: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

if (!process.env.GOOGLE_AI_API_KEY) {
  console.warn('GOOGLE_AI_API_KEY not found. AI features disabled.');
}
const aiClient = process.env.GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY) : null;

async function parseDocument(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    console.error('Parse error:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

const docCache = new Map();

function cleanEntityData(data) {
  const sanitize = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object') {
        return JSON.stringify(item).replace(/[{}"]/g, '').trim();
      }
      return String(item);
    }).filter(item => item && item.trim().length > 0);
  };

  return {
    parties: sanitize(data.parties || []),
    amounts: sanitize(data.amounts || []),
    dates: sanitize(data.dates || []),
    terms: sanitize(data.terms || [])
  };
}

module.exports = async (req, res) => {
  console.log('API call:', req.method, req.url);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST' && req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return new Promise((resolve, reject) => {
      upload.single('file')(req, res, (err) => {
        if (err) {
          console.error('Upload failed:', err);
          res.status(400).json({ error: 'Upload failed: ' + err.message });
          return;
        }
        handleRequest(req, res).then(resolve).catch(reject);
      });
    });
  }

  await handleRequest(req, res);
};

async function handleRequest(req, res) {

  if (req.method === 'POST') {
    const { action } = req.body;
    console.log('POST request with action:', action);
    
    try {
      if (action === 'ingest') {
        if (!aiClient) {
          res.status(503).json({ error: 'Tool not active' });
          return;
        }

        if (!req.file) {
          console.log('No file uploaded');
          res.status(400).json({ error: 'No file uploaded' });
          return;
        }

        console.log('Processing file:', req.file.originalname, 'Size:', req.file.size);

        try {
          const documentText = await parseDocument(req.file.path, req.file.originalname);
          console.log('Extracted text length:', documentText.length);
          
          fs.unlinkSync(req.file.path);
          
          if (!documentText || documentText.trim().length === 0) {
            res.status(400).json({ error: 'No text content found in the document' });
            return;
          }

          const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
          
          const prompt = `Analyze this legal document and extract key information.

DOCUMENT CONTENT:
${documentText.substring(0, 50000)} ${documentText.length > 50000 ? '... (truncated)' : ''}

Provide JSON response with:
1. chunks: estimated number of logical sections/chunks
2. parties: array of people/organizations mentioned
3. amounts: array of monetary values mentioned  
4. dates: array of important dates mentioned

Format as valid JSON only.`;
          
          const result = await model.generateContent(prompt);
          const response_text = result.response.text();
          
          let rawAiData;
          try {
            const jsonMatch = response_text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              rawAiData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found in response');
            }
          } catch (e) {
            console.error('Failed to parse AI response:', e);
            throw new Error('AI response parsing failed');
          }
          
          const aiData = {
            chunks: rawAiData.chunks || 0,
            ...cleanEntityData(rawAiData)
          };
          
          // Store the processed document
          const docId = req.body.doc_id || 'demo-doc';
          docCache.set(docId, {
            text: documentText,
            entities: aiData,
            filename: req.file.originalname,
            processedAt: new Date()
          });
          
          const response = {
            doc_id: docId,
            chunks: aiData.chunks || 0,
            message: "Document processed",
            entities: {
              parties: aiData.parties || [],
              amounts: aiData.amounts || [],
              dates: aiData.dates || []
            }
          };
          
          console.log('Document processed:', response);
          res.status(200).json(response);
          return;
          
        } catch (error) {
          console.error('Error processing document:', error);
          res.status(500).json({ error: error.message });
          return;
        }
      }
      
      if (action === 'entities') {
        const docId = req.body.doc_id || 'demo-doc';
        const document = docCache.get(docId);
        
        if (!document) {
          res.status(404).json({ error: 'Document not found. Please upload a document first.' });
          return;
        }
        
        if (!aiClient) {
          res.status(503).json({ error: 'Tool not active' });
          return;
        }
        
        try {
          const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
          
          const prompt = `Extract detailed entities from this legal document.

DOCUMENT CONTENT:
${document.text.substring(0, 50000)} ${document.text.length > 50000 ? '... (truncated)' : ''}

Return JSON with STRING arrays only:
- parties: array of strings with names and roles
- amounts: array of strings with monetary values and context
- dates: array of strings with dates and descriptions
- terms: array of strings with key terms and conditions

IMPORTANT: Each array must contain only STRING values, not objects. Format as valid JSON only.`;
          
          const result = await model.generateContent(prompt);
          const response_text = result.response.text();
          
          let rawEntities;
          try {
            const jsonMatch = response_text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              rawEntities = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found in response');
            }
          } catch (e) {
            console.error('Failed to parse AI entities response:', e);
            throw new Error('AI entities response parsing failed');
          }
          
          const entities = cleanEntityData(rawEntities);
          entities.doc_id = docId;
          
          console.log('Sending entities response:', entities);
          res.status(200).json(entities);
          return;
          
        } catch (error) {
          console.error('Error extracting entities:', error);
          res.status(500).json({ error: error.message });
          return;
        }
      }
      
      if (action === 'ask') {
        const { q } = req.body;
        const docId = req.body.doc_id || 'demo-doc';
        const document = docCache.get(docId);
        
        if (!document) {
          res.status(404).json({ error: 'Document not found. Please upload a document first.' });
          return;
        }
        
        if (!aiClient) {
          res.status(503).json({ error: 'Tool not active' });
          return;
        }
        
        try {
          const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
          
          const prompt = `You are ShastraAI, a legal document analysis assistant. 
          Answer this question about the legal document: "${q}"
          
          DOCUMENT CONTENT:
          ${document.text.substring(0, 50000)} ${document.text.length > 50000 ? '... (truncated)' : ''}
          
          Provide a detailed, helpful answer with specific citations from the document content above. 
          Include relevant quotes and section references when possible.
          
          Format your response as a clear, professional answer with proper citations.`;
          
          const result = await model.generateContent(prompt);
          const answer = result.response.text();
          
          const response = {
            answer: answer,
            hits: [1, 2, 3],
            doc_id: docId
          };
          console.log('Sending ask response:', response);
          res.status(200).json(response);
          return;
          
        } catch (error) {
          console.error('Error processing question:', error);
          res.status(500).json({ error: error.message });
          return;
        }
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message });
      return;
    }
  }

  const response = { 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  };
  console.log('Sending default response:', response);
  res.status(200).json(response);
}
