const { Telegraf } = require('telegraf');
const FormData = require('form-data');
const fetch = require('node-fetch');

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const userDocs = new Map();

async function callAPI(action, docId, question = null, fileBuffer = null, filename = null) {
  const apiUrl = process.env.API_URL || 'https://shastraai-l3e6fnw7r-aranyorays-projects.vercel.app/api';
  
  try {
    if (action === 'ingest' && fileBuffer) {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      formData.append('doc_id', docId);
      formData.append('action', 'ingest');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });
      
      return await response.json();
    } else {
      const body = { action, doc_id: docId };
      if (question) body.q = question;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      return await response.json();
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

bot.start((ctx) => {
  const welcomeMessage = `🏛️ **Welcome to ShastraAI - Legal Document Analysis Bot!**

I can help you analyze legal documents using AI. Here's what I can do:

📄 **Upload Document**: Send me a PDF or DOCX file (up to 10MB)
🔍 **Extract Entities**: Use /entities to find parties, amounts, dates, terms
❓ **Ask Questions**: Use /ask <question> to ask about your document
📋 **Get Help**: Use /help for all commands

**How to use:**
1. Send me a PDF or DOCX document
2. I'll process it with AI
3. Use /entities to see extracted information
4. Use /ask to ask questions

**Example:** /ask What is the rent amount?

Ready to analyze your legal documents! 🚀`;
  
  ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

bot.help((ctx) => {
  const helpMessage = `🏛️ ShastraAI Bot Commands:

📄 /upload - Upload a PDF or DOCX document
🔍 /entities - Extract entities from document
❓ /ask <question> - Ask questions about document
📋 /help - Show this help message
🔄 /clear - Clear your current document

How to use:
1. Upload a document with /upload or just send a file
2. Use /entities to see extracted information
3. Ask questions with /ask

Supported formats: PDF, DOCX`;
  
  ctx.reply(helpMessage);
});

bot.command('clear', (ctx) => {
  const userId = ctx.from.id.toString();
  userDocs.delete(userId);
  ctx.reply('✅ Your document has been cleared. Upload a new document to continue.');
});

bot.command('upload', (ctx) => {
  ctx.reply('📄 Please send me a PDF or DOCX file to analyze. I support files up to 10MB.');
});

bot.command('entities', async (ctx) => {
  const userId = ctx.from.id.toString();
  const docId = userDocs.get(userId);
  
  if (!docId) {
    ctx.reply('❌ No document found. Please upload a document first using /upload or send me a file.');
    return;
  }
  
  try {
    ctx.reply('🔍 Extracting entities from your document...');
    
    const result = await callAPI('entities', docId);
    
    if (result.error) {
      ctx.reply(`❌ Error: ${result.error}`);
      return;
    }
    
    let message = '📋 **EXTRACTED ENTITIES**\n\n';
    
    if (result.parties && result.parties.length > 0) {
      message += '🏢 **PARTIES:**\n';
      result.parties.forEach(party => message += `• ${party}\n`);
      message += '\n';
    }
    
    if (result.amounts && result.amounts.length > 0) {
      message += '💰 **MONETARY AMOUNTS:**\n';
      result.amounts.forEach(amount => message += `• ${amount}\n`);
      message += '\n';
    }
    
    if (result.dates && result.dates.length > 0) {
      message += '📅 **DATES & DEADLINES:**\n';
      result.dates.forEach(date => message += `• ${date}\n`);
      message += '\n';
    }
    
    if (result.terms && result.terms.length > 0) {
      message += '📝 **KEY TERMS:**\n';
      result.terms.forEach(term => message += `• ${term}\n`);
    }
    
    if (message === '📋 **EXTRACTED ENTITIES**\n\n') {
      message += 'No entities found in the document.';
    }
    
    ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Entities extraction failed:', error);
    ctx.reply('❌ Failed to extract entities. Please try again.');
  }
});

bot.command('ask', async (ctx) => {
  const userId = ctx.from.id.toString();
  const docId = userDocs.get(userId);
  
  if (!docId) {
    ctx.reply('❌ No document found. Please upload a document first using /upload or send me a file.');
    return;
  }
  
  const question = ctx.message.text.replace('/ask', '').trim();
  
  if (!question) {
    ctx.reply('❓ Please provide a question. Example: /ask What is the rent amount?');
    return;
  }
  
  try {
    ctx.reply('🤔 Thinking about your question...');
    
    const result = await callAPI('ask', docId, question);
    
    if (result.error) {
      ctx.reply(`❌ Error: ${result.error}`);
      return;
    }
    
    ctx.reply(`💡 **Answer:**\n\n${result.answer}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Question processing failed:', error);
    ctx.reply('❌ Failed to process your question. Please try again.');
  }
});

bot.on('document', async (ctx) => {
  const document = ctx.message.document;
  const userId = ctx.from.id.toString();
  
  if (document.file_size > 10 * 1024 * 1024) {
    ctx.reply('❌ File too large. Please send a file smaller than 10MB.');
    return;
  }
  
  const fileName = document.file_name.toLowerCase();
  if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx')) {
    ctx.reply('❌ Unsupported file type. Please send a PDF or DOCX file.');
    return;
  }
  
  try {
    ctx.reply('📄 Processing your document...');
    
    const fileLink = await ctx.telegram.getFileLink(document.file_id);
    const fileResponse = await fetch(fileLink);
    const fileBuffer = await fileResponse.buffer();
    
    const docId = `user_${userId}_${Date.now()}`;
    
    const result = await callAPI('ingest', docId, null, fileBuffer, document.file_name);
    
    if (result.error) {
      ctx.reply(`❌ Error processing document: ${result.error}`);
      return;
    }
    
    userDocs.set(userId, docId);
    
    let message = `✅ **Document processed successfully!**\n\n`;
    message += `📊 Extracted ${result.chunks} chunks\n`;
    message += `🔍 Found ${result.entities.parties.length} parties, ${result.entities.amounts.length} amounts, ${result.entities.dates.length} dates\n\n`;
    message += `Now you can:\n`;
    message += `• Use /entities to see detailed extraction\n`;
    message += `• Use /ask <question> to ask questions\n`;
    message += `• Use /help for more commands`;
    
    ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Document processing failed:', error);
    ctx.reply('❌ Failed to process your document. Please try again.');
  }
});

bot.on('text', (ctx) => {
  const text = ctx.message.text;
  
  if (!text.startsWith('/')) {
    const userId = ctx.from.id.toString();
    const docId = userDocs.get(userId);
    
    if (!docId) {
      ctx.reply('❌ No document found. Please upload a document first using /upload or send me a file.');
      return;
    }
    
    ctx.reply('🤔 Thinking about your question...');
    
    callAPI('ask', docId, text)
      .then(result => {
        if (result.error) {
          ctx.reply(`❌ Error: ${result.error}`);
          return;
        }
        ctx.reply(`💡 **Answer:**\n\n${result.answer}`, { parse_mode: 'Markdown' });
      })
      .catch(error => {
        console.error('Question processing failed:', error);
        ctx.reply('❌ Failed to process your question. Please try again.');
      });
  }
});

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again.');
});

if (require.main === module) {
  bot.launch();
  console.log('🤖 ShastraAI Telegram bot is running...');
  
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = bot;
