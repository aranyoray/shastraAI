// Simple test script to verify bot setup
const { Telegraf } = require('telegraf');

console.log('🤖 Testing Telegram Bot Setup...\n');

// Check if token exists
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.log('❌ TELEGRAM_BOT_TOKEN environment variable is missing');
  console.log('📝 Please set it with: vercel env add TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

console.log('✅ TELEGRAM_BOT_TOKEN found');

// Test bot initialization
try {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  console.log('✅ Bot initialized successfully');
  
  // Test bot info
  bot.telegram.getMe().then(botInfo => {
    console.log('✅ Bot info retrieved:');
    console.log(`   Name: ${botInfo.first_name}`);
    console.log(`   Username: @${botInfo.username}`);
    console.log(`   ID: ${botInfo.id}`);
    console.log('\n🎉 Bot setup is working correctly!');
    console.log('\n📝 Next steps:');
    console.log('1. Set webhook: https://api.telegram.org/bot[YOUR_TOKEN]/setWebhook?url=https://shastraai-p48u54uuk-aranyorays-projects.vercel.app/api/telegram-webhook');
    console.log('2. Test with /start command in your bot');
    process.exit(0);
  }).catch(error => {
    console.log('❌ Failed to get bot info:', error.message);
    console.log('📝 Check if your bot token is correct');
    process.exit(1);
  });
  
} catch (error) {
  console.log('❌ Failed to initialize bot:', error.message);
  process.exit(1);
}
