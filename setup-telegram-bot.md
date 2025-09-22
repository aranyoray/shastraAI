# 🤖 ShastraAI Telegram Bot - Complete Setup Guide

## 🚨 **The Bot Commands ARE in the Code!**

Your bot already has all the commands built-in:
- `/start` - Welcome message
- `/help` - Show help
- `/upload` - Upload document
- `/entities` - Extract entities (like the middle button)
- `/ask` - Ask questions (like the last button)
- `/clear` - Clear document

## 🔧 **Step-by-Step Fix**

### 1. **Add Environment Variables to Vercel**

The bot token needs to be added to Vercel:

```bash
# Add your bot token
vercel env add TELEGRAM_BOT_TOKEN

# When prompted, paste your bot token from BotFather
```

### 2. **Set Up Webhook**

Use this URL in your browser (replace `[YOUR_BOT_TOKEN]` with your actual token):

```
https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook?url=https://shastraai-4uzl6b4k2-aranyorays-projects.vercel.app/api/telegram-webhook
```

### 3. **Deploy the Updated Code**

```bash
git add .
git commit -m "Add bot command setup and debugging"
git push origin main
vercel --prod --yes
```

### 4. **Test Your Bot**

1. **Send `/start`** to your bot
2. **Send `/setup`** to set up the command menu
3. **Upload a PDF/DOCX** file
4. **Try `/entities`** (like the middle button)
5. **Try `/ask What is the rent amount?`** (like the last button)

## 🎯 **Bot Features (All Working)**

### **Document Upload:**
- Send any PDF or DOCX file (up to 10MB)
- Bot processes it with Google Gemini AI
- Stores the document for your session

### **Extract Entities (Middle Button Equivalent):**
```
/entities
```
Shows:
- 🏢 Parties (people/organizations)
- 💰 Monetary amounts
- 📅 Dates & deadlines  
- 📝 Key terms

### **Ask Questions (Last Button Equivalent):**
```
/ask What is the rent amount?
/ask Who are the parties involved?
/ask What are the payment terms?
```

### **Other Commands:**
- `/help` - Show all commands
- `/clear` - Clear current document
- `/upload` - Upload prompt

## 🔍 **Troubleshooting**

### **Bot Not Responding to /start?**

1. **Check webhook status:**
   ```
   https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getWebhookInfo
   ```

2. **Check Vercel logs:**
   ```bash
   vercel logs --follow
   ```

3. **Test webhook endpoint:**
   Visit: `https://shastraai-4uzl6b4k2-aranyorays-projects.vercel.app/api/telegram-webhook`

### **Commands Not Showing in Menu?**

1. **Send `/setup`** to your bot to set up the command menu
2. **Or manually set commands** with BotFather:
   - Go to @BotFather
   - Send `/setcommands`
   - Select your bot
   - Send the command list

### **Environment Variables Not Working?**

1. **Check Vercel dashboard:** https://vercel.com/aranyorays-projects/shastraai-api/settings/environment-variables
2. **Redeploy after adding variables:**
   ```bash
   vercel --prod --yes
   ```

## ✅ **Verification Checklist**

- [ ] Bot token added to Vercel environment variables
- [ ] Webhook set up correctly
- [ ] Code deployed to Vercel
- [ ] Bot responds to `/start`
- [ ] Bot processes uploaded documents
- [ ] `/entities` extracts information (like middle button)
- [ ] `/ask` answers questions (like last button)

## 🎉 **Your Bot Will Have All 3 Button Functionalities:**

1. **Upload & Process** → Send PDF/DOCX file
2. **Extract Entities** → Use `/entities` command  
3. **Ask Questions** → Use `/ask <question>` command

The bot is essentially a Telegram version of your web app with the same AI-powered features!
