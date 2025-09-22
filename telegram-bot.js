const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use((ctx, next) => {
  console.log('Message:', ctx.message?.text || ctx.message?.document?.file_name || 'unknown');
  return next();
});

async function setupBotCommands() {
  try {
    const commands = [
      { command: 'start', description: 'Welcome message and bot introduction' },
      { command: 'help', description: 'Show all available commands' },
      { command: 'upload', description: 'Upload a PDF or DOCX document for analysis' },
      { command: 'entities', description: 'Extract all entities (parties, amounts, dates, terms)' },
      { command: 'amounts', description: 'Show only monetary amounts from the document' },
      { command: 'dates', description: 'Show only important dates from the document' },
      { command: 'deadlines', description: 'Show critical deadlines and due dates' },
      { command: 'ask', description: 'Ask questions about your document' },
      { command: 'lang', description: 'Change language (en/hi/bn)' },
      { command: 'clear', description: 'Clear current document from memory' },
      { command: 'setup', description: 'Set up bot commands menu' }
    ];
    
    await bot.telegram.setMyCommands(commands);
    console.log('Bot commands set up');
  } catch (error) {
    console.error('Failed to set up bot commands:', error);
  }
}

const userDocs = new Map();
const userDocuments = new Map();
const userLanguages = new Map();
const languages = {
  en: {
    welcome: `Welcome to ShastraAI - Legal Document Analysis Bot!

I can help you analyze legal documents using AI. Here's what I can do:

Upload Document: Send me a PDF or DOCX file (up to 10MB)
Extract Entities: Use /entities to find parties, amounts, dates, terms
Get Amounts: Use /amounts to see all monetary values
Get Dates: Use /dates to see all important dates
Get Deadlines: Use /deadlines to see critical deadlines
Ask Questions: Use /ask <question> to ask about your document
Language: Use /lang to change language (English/Hindi/Bengali)
Get Help: Use /help for all commands

How to use:
1. Send me a PDF or DOCX document
2. I'll process it with AI
3. Use specific commands to extract information
4. Use /ask to ask questions

Example: /ask What is the rent amount?

Ready to analyze your legal documents!`,
    help: `ShastraAI Bot Commands:

/upload - Upload a PDF or DOCX document
/entities - Extract all entities from document
/amounts - Show all monetary amounts
/dates - Show all important dates
/deadlines - Show critical deadlines
/ask <question> - Ask a question about document
/lang - Change language (English/Hindi/Bengali)
/clear - Clear current document
/start - Show welcome message
/help - Show this help

Note: Documents are stored per user session.`,
    noDoc: "No document found. Please upload a document first.",
    processing: "Processing document...",
    extracting: "Extracting information...",
    thinking: "Thinking about your question...",
    docProcessed: "Document processed successfully!",
    docCleared: "Document cleared from memory.",
    langSet: "Language set to: English"
  },
  hi: {
    welcome: `ShastraAI में आपका स्वागत है - कानूनी दस्तावेज़ विश्लेषण बॉट!

मैं AI का उपयोग करके कानूनी दस्तावेज़ों का विश्लेषण करने में आपकी सहायता कर सकता हूं। यहाँ मैं क्या कर सकता हूं:

दस्तावेज़ अपलोड करें: मुझे PDF या DOCX फ़ाइल भेजें (10MB तक)
संस्थाएं निकालें: पार्टियों, राशियों, तारीखों को खोजने के लिए /entities का उपयोग करें
राशियां देखें: सभी मौद्रिक मूल्य देखने के लिए /amounts का उपयोग करें
तारीखें देखें: सभी महत्वपूर्ण तारीखें देखने के लिए /dates का उपयोग करें
समय सीमाएं देखें: महत्वपूर्ण समय सीमाएं देखने के लिए /deadlines का उपयोग करें
प्रश्न पूछें: अपने दस्तावेज़ के बारे में प्रश्न पूछने के लिए /ask <प्रश्न> का उपयोग करें
भाषा: भाषा बदलने के लिए /lang का उपयोग करें (English/Hindi/Bengali)
सहायता: सभी कमांड के लिए /help का उपयोग करें

उपयोग कैसे करें:
1. मुझे PDF या DOCX दस्तावेज़ भेजें
2. मैं इसे AI के साथ प्रोसेस करूंगा
3. जानकारी निकालने के लिए विशिष्ट कमांड का उपयोग करें
4. प्रश्न पूछने के लिए /ask का उपयोग करें

उदाहरण: /ask किराया राशि क्या है?

आपके कानूनी दस्तावेज़ों का विश्लेषण करने के लिए तैयार!`,
    help: `ShastraAI बॉट कमांड:

/upload - PDF या DOCX दस्तावेज़ अपलोड करें
/entities - दस्तावेज़ से सभी संस्थाएं निकालें
/amounts - सभी मौद्रिक राशियां दिखाएं
/dates - सभी महत्वपूर्ण तारीखें दिखाएं
/deadlines - महत्वपूर्ण समय सीमाएं दिखाएं
/ask <प्रश्न> - दस्तावेज़ के बारे में प्रश्न पूछें
/lang - भाषा बदलें (English/Hindi/Bengali)
/clear - वर्तमान दस्तावेज़ साफ़ करें
/start - स्वागत संदेश दिखाएं
/help - यह सहायता दिखाएं

नोट: दस्तावेज़ प्रति उपयोगकर्ता सत्र में संग्रहीत हैं।`,
    noDoc: "कोई दस्तावेज़ नहीं मिला। कृपया पहले दस्तावेज़ अपलोड करें।",
    processing: "दस्तावेज़ प्रोसेस हो रहा है...",
    extracting: "जानकारी निकाली जा रही है...",
    thinking: "आपके प्रश्न के बारे में सोच रहा हूं...",
    docProcessed: "दस्तावेज़ सफलतापूर्वक प्रोसेस हो गया!",
    docCleared: "दस्तावेज़ मेमोरी से साफ़ हो गया।",
    langSet: "भाषा सेट की गई: हिंदी"
  },
  bn: {
    welcome: `ShastraAI-এ আপনাকে স্বাগতম - আইনি নথি বিশ্লেষণ বট!

আমি AI ব্যবহার করে আপনার আইনি নথি বিশ্লেষণ করতে সাহায্য করতে পারি। আমি কী করতে পারি:

নথি আপলোড: আমাকে PDF বা DOCX ফাইল পাঠান (10MB পর্যন্ত)
সত্তা বের করুন: পক্ষ, পরিমাণ, তারিখ খুঁজতে /entities ব্যবহার করুন
পরিমাণ দেখুন: সমস্ত আর্থিক মূল্য দেখতে /amounts ব্যবহার করুন
তারিখ দেখুন: সমস্ত গুরুত্বপূর্ণ তারিখ দেখতে /dates ব্যবহার করুন
সময়সীমা দেখুন: গুরুত্বপূর্ণ সময়সীমা দেখতে /deadlines ব্যবহার করুন
প্রশ্ন জিজ্ঞাসা: আপনার নথি সম্পর্কে প্রশ্ন জিজ্ঞাসা করতে /ask <প্রশ্ন> ব্যবহার করুন
ভাষা: ভাষা পরিবর্তন করতে /lang ব্যবহার করুন (English/Hindi/Bengali)
সাহায্য: সমস্ত কমান্ডের জন্য /help ব্যবহার করুন

কীভাবে ব্যবহার করবেন:
1. আমাকে PDF বা DOCX নথি পাঠান
2. আমি এটিকে AI দিয়ে প্রক্রিয়া করব
3. তথ্য বের করতে নির্দিষ্ট কমান্ড ব্যবহার করুন
4. প্রশ্ন জিজ্ঞাসা করতে /ask ব্যবহার করুন

উদাহরণ: /ask ভাড়ার পরিমাণ কত?

আপনার আইনি নথি বিশ্লেষণ করতে প্রস্তুত!`,
    help: `ShastraAI বট কমান্ড:

/upload - PDF বা DOCX নথি আপলোড করুন
/entities - নথি থেকে সমস্ত সত্তা বের করুন
/amounts - সমস্ত আর্থিক পরিমাণ দেখান
/dates - সমস্ত গুরুত্বপূর্ণ তারিখ দেখান
/deadlines - গুরুত্বপূর্ণ সময়সীমা দেখান
/ask <প্রশ্ন> - নথি সম্পর্কে প্রশ্ন জিজ্ঞাসা করুন
/lang - ভাষা পরিবর্তন করুন (English/Hindi/Bengali)
/clear - বর্তমান নথি সাফ করুন
/start - স্বাগত বার্তা দেখান
/help - এই সাহায্য দেখান

নোট: নথি প্রতি ব্যবহারকারী সেশনে সংরক্ষিত।`,
    noDoc: "কোন নথি পাওয়া যায়নি। অনুগ্রহ করে প্রথমে নথি আপলোড করুন।",
    processing: "নথি প্রক্রিয়াকরণ হচ্ছে...",
    extracting: "তথ্য বের করা হচ্ছে...",
    thinking: "আপনার প্রশ্ন নিয়ে চিন্তা করছি...",
    docProcessed: "নথি সফলভাবে প্রক্রিয়াকরণ হয়েছে!",
    docCleared: "নথি মেমরি থেকে সাফ হয়েছে।",
    langSet: "ভাষা সেট করা হয়েছে: বাংলা"
  }
};

function getUserLanguage(userId) {
  return userLanguages.get(userId.toString()) || 'en';
}

function getText(userId, key) {
  const lang = getUserLanguage(userId);
  return languages[lang][key] || languages.en[key];
}

async function callAPI(action, docId, question = null, fileBuffer = null, filename = null) {
  const apiUrl = process.env.API_URL || 'https://shastraai-5ehqdc52q-aranyorays-projects.vercel.app/api';
  
  console.log(`API Call - Action: ${action}, DocId: ${docId}, Question: ${question}, HasFile: ${!!fileBuffer}`);
  
  try {
    if (action === 'ingest' && fileBuffer) {
      // Handle file upload
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      formData.append('doc_id', docId);
      formData.append('action', 'ingest');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      console.log(`API Response for ${action}:`, result);
      return result;
    } else {
      // Handle regular API calls
      const body = { action, doc_id: docId };
      if (question) body.q = question;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      console.log(`API Response for ${action}:`, result);
      return result;
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

bot.command('setup', async (ctx) => {
  await setupBotCommands();
  ctx.reply('Bot commands menu has been set up!');
});

bot.start((ctx) => {
  ctx.reply(getText(ctx.from.id, 'welcome'), { parse_mode: 'Markdown' });
});

bot.help((ctx) => {
  ctx.reply(getText(ctx.from.id, 'help'), { parse_mode: 'Markdown' });
});

bot.command('clear', (ctx) => {
  const userId = ctx.from.id.toString();
  userDocs.delete(userId);
  userDocuments.delete(userId);
  ctx.reply(getText(ctx.from.id, 'docCleared'));
});

bot.command('lang', (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ');
  
  if (args.length > 1) {
    const lang = args[1].toLowerCase();
    if (['en', 'english', 'hi', 'hindi', 'bn', 'bengali'].includes(lang)) {
      let selectedLang = 'en';
      if (['hi', 'hindi'].includes(lang)) selectedLang = 'hi';
      else if (['bn', 'bengali'].includes(lang)) selectedLang = 'bn';
      
      userLanguages.set(userId, selectedLang);
      
      const langNames = { en: 'English', hi: 'हिंदी', bn: 'বাংলা' };
      ctx.reply(`Language set to: ${langNames[selectedLang]}`);
    } else {
      ctx.reply('Available languages:\n• en/english - English\n• hi/hindi - हिंदी\n• bn/bengali - বাংলা\n\nUsage: /lang en');
    }
  } else {
    const currentLang = getUserLanguage(ctx.from.id);
    const langNames = { en: 'English', hi: 'हिंदी', bn: 'বাংলা' };
    ctx.reply(`Current language: ${langNames[currentLang]}\n\nAvailable languages:\n• /lang en - English\n• /lang hi - हिंदी\n• /lang bn - বাংলা`);
  }
});

// Amounts command - Extract only monetary amounts
bot.command('amounts', async (ctx) => {
  const userId = ctx.from.id.toString();
  const docId = userDocs.get(userId);
  
  if (!docId) {
    ctx.reply(getText(ctx.from.id, 'noDoc'));
    return;
  }
  
  ctx.reply('Extracting monetary amounts...');
  
  try {
    // Get locally stored document
    const userDoc = userDocuments.get(userId);
    let entities;
    
    if (userDoc && userDoc.entities) {
      entities = userDoc.entities;
    } else {
      const result = await callAPI('entities', docId);
      if (result.error) {
        ctx.reply(`Error: ${result.error}`);
        return;
      }
      entities = result;
    }
    
    const amounts = entities.amounts || [];
    if (amounts.length === 0) {
      ctx.reply('No monetary amounts found in the document.');
      return;
    }
    
    const amountsList = amounts.map((amount, index) => `${index + 1}. ${amount}`).join('\n');
    ctx.reply(`MONETARY AMOUNTS FOUND:\n\n${amountsList}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Amounts extraction failed:', error);
    ctx.reply('Failed to extract amounts. Please try again.');
  }
});

// Dates command - Extract only dates
bot.command('dates', async (ctx) => {
  const userId = ctx.from.id.toString();
  const docId = userDocs.get(userId);
  
  if (!docId) {
    ctx.reply(getText(ctx.from.id, 'noDoc'));
    return;
  }
  
  ctx.reply('Extracting dates...');
  
  try {
    // Get locally stored document
    const userDoc = userDocuments.get(userId);
    let entities;
    
    if (userDoc && userDoc.entities) {
      entities = userDoc.entities;
    } else {
      const result = await callAPI('entities', docId);
      if (result.error) {
        ctx.reply(`Error: ${result.error}`);
        return;
      }
      entities = result;
    }
    
    const dates = entities.dates || [];
    if (dates.length === 0) {
      ctx.reply('No dates found in the document.');
      return;
    }
    
    const datesList = dates.map((date, index) => `${index + 1}. ${date}`).join('\n');
    ctx.reply(`DATES FOUND:\n\n${datesList}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Dates extraction failed:', error);
    ctx.reply('Failed to extract dates. Please try again.');
  }
});

// Deadlines command - Extract critical deadlines
bot.command('deadlines', async (ctx) => {
  const userId = ctx.from.id.toString();
  const docId = userDocs.get(userId);
  
  if (!docId) {
    ctx.reply(getText(ctx.from.id, 'noDoc'));
    return;
  }
  
  ctx.reply('Analyzing deadlines...');
  
  try {
    const result = await callAPI('ask', docId, 'What are the important deadlines, due dates, or time-sensitive obligations mentioned in this document? Please list all critical dates with their purposes.');
    
    if (result.error) {
      ctx.reply(`Error: ${result.error}`);
      return;
    }
    
    ctx.reply(`CRITICAL DEADLINES & DUE DATES:\n\n${result.answer}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Deadlines extraction failed:', error);
    ctx.reply('Failed to analyze deadlines. Please try again.');
  }
});

// Upload command
bot.command('upload', (ctx) => {
  ctx.reply('Please send me a PDF or DOCX file to analyze. I support files up to 10MB.');
});

// Entities command
bot.command('entities', async (ctx) => {
  const userId = ctx.from.id.toString();
  const docId = userDocs.get(userId);
  
  console.log(`Entities command - User ID: ${userId}, Doc ID: ${docId}`);
  console.log(`Current userDocs map:`, Array.from(userDocs.entries()));
  
  if (!docId) {
    ctx.reply('No document found. Please upload a document first using /upload or send me a file.');
    return;
  }
  
  try {
    ctx.reply('Extracting entities from your document...');
    
    // Get locally stored document
    const userDoc = userDocuments.get(userId);
    let result;
    
    if (userDoc && userDoc.entities) {
      // Use locally stored entities
      result = userDoc.entities;
      console.log('Using locally stored entities');
    } else {
      // Fallback to API call
      result = await callAPI('entities', docId);
      
      if (result.error) {
        ctx.reply(`Error: ${result.error}`);
        return;
      }
    }
    
    let message = 'EXTRACTED ENTITIES\n\n';
    
    if (result.parties && result.parties.length > 0) {
      message += 'PARTIES:\n';
      result.parties.forEach(party => message += `• ${party}\n`);
      message += '\n';
    }
    
    if (result.amounts && result.amounts.length > 0) {
      message += 'MONETARY AMOUNTS:\n';
      result.amounts.forEach(amount => message += `• ${amount}\n`);
      message += '\n';
    }
    
    if (result.dates && result.dates.length > 0) {
      message += 'DATES & DEADLINES:\n';
      result.dates.forEach(date => message += `• ${date}\n`);
      message += '\n';
    }
    
    if (result.terms && result.terms.length > 0) {
      message += 'KEY TERMS:\n';
      result.terms.forEach(term => message += `• ${term}\n`);
    }
    
    if (message === 'EXTRACTED ENTITIES\n\n') {
      message += 'No entities found in the document.';
    }
    
    ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Entities extraction failed:', error);
    ctx.reply('Failed to extract entities. Please try again.');
  }
});

// Ask command
bot.command('ask', async (ctx) => {
  const userId = ctx.from.id.toString();
  const docId = userDocs.get(userId);
  
  if (!docId) {
    ctx.reply('No document found. Please upload a document first using /upload or send me a file.');
    return;
  }
  
  const question = ctx.message.text.replace('/ask', '').trim();
  
  if (!question) {
    ctx.reply('Please provide a question. Example: /ask What is the rent amount?');
    return;
  }
  
  try {
    ctx.reply('Thinking about your question...');
    
    const result = await callAPI('ask', docId, question);
    
    if (result.error) {
      ctx.reply(`Error: ${result.error}`);
      return;
    }
    
    ctx.reply(`Answer:\n\n${result.answer}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Question processing failed:', error);
    ctx.reply('Failed to process your question. Please try again.');
  }
});

// Handle document uploads
bot.on('document', async (ctx) => {
  const document = ctx.message.document;
  const userId = ctx.from.id.toString();
  
  // Check file size (10MB limit)
  if (document.file_size > 10 * 1024 * 1024) {
    ctx.reply('File too large. Please send a file smaller than 10MB.');
    return;
  }
  
  // Check file type
  const fileName = document.file_name.toLowerCase();
  if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx')) {
    ctx.reply('Unsupported file type. Please send a PDF or DOCX file.');
    return;
  }
  
  try {
    ctx.reply('Processing your document...');
    
    // Get file from Telegram
    const fileLink = await ctx.telegram.getFileLink(document.file_id);
    const fileResponse = await fetch(fileLink);
    const fileBuffer = await fileResponse.buffer();
    
    // Generate simple document ID for this user
    const docId = `user_${userId}`;
    
    console.log(`Processing document for user ${userId} with docId: ${docId}`);
    
    // Process document through our API
    const result = await callAPI('ingest', docId, null, fileBuffer, document.file_name);
    
    if (result.error) {
      ctx.reply(`Error processing document: ${result.error}`);
      return;
    }
    
    // Store document ID and content for this user
    userDocs.set(userId, docId);
    userDocuments.set(userId, {
      docId: docId,
      filename: document.file_name,
      fileBuffer: fileBuffer,
      processedAt: new Date(),
      entities: result.entities
    });
    console.log(`Document stored for user ${userId}: ${docId}`);
    console.log(`Current userDocs map:`, Array.from(userDocs.entries()));
    
    let message = `Document processed successfully!\n\n`;
    message += `Extracted ${result.chunks} chunks\n`;
    message += `Found ${result.entities.parties.length} parties, ${result.entities.amounts.length} amounts, ${result.entities.dates.length} dates\n\n`;
    message += `Now you can:\n`;
    message += `• Use /entities to see detailed extraction\n`;
    message += `• Use /amounts to see monetary values\n`;
    message += `• Use /dates to see important dates\n`;
    message += `• Use /deadlines to see critical deadlines\n`;
    message += `• Use /ask <question> to ask questions\n`;
    message += `• Use /help for more commands`;
    
    ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Document processing failed:', error);
    ctx.reply('Failed to process your document. Please try again.');
  }
});

// Handle text messages that aren't commands
bot.on('text', (ctx) => {
  const text = ctx.message.text;
  
  // If it's not a command, treat it as a question
  if (!text.startsWith('/')) {
    const userId = ctx.from.id.toString();
    const docId = userDocs.get(userId);
    
    if (!docId) {
      ctx.reply('No document found. Please upload a document first using /upload or send me a file.');
      return;
    }
    
    // Process as question
    ctx.reply('Thinking about your question...');
    
    callAPI('ask', docId, text)
      .then(result => {
        if (result.error) {
          ctx.reply(`Error: ${result.error}`);
          return;
        }
        ctx.reply(`Answer:\n\n${result.answer}`, { parse_mode: 'Markdown' });
      })
      .catch(error => {
        console.error('Question processing failed:', error);
        ctx.reply('Failed to process your question. Please try again.');
      });
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('An error occurred. Please try again.');
});

// Export bot for Vercel
module.exports = bot;

// Start bot if running locally
if (require.main === module) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN environment variable is required');
    process.exit(1);
  }
  
  bot.launch();
  console.log('ShastraAI Telegram bot is running...');
  
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
