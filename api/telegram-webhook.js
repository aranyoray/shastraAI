const bot = require('../telegram-bot');

module.exports = async (req, res) => {
  console.log('Telegram webhook called:', req.method, req.url);
  console.log('Environment check - TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      console.log('Processing webhook update:', JSON.stringify(req.body, null, 2));
      
      await bot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(200).json({ 
      message: 'ShastraAI Telegram Bot Webhook',
      status: 'active',
      hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
      timestamp: new Date().toISOString(),
      webhook: 'ready'
    });
  }
};
