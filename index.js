const TelegramBot = require('node-telegram-bot-api');

// Render-এর Environment Variable থেকে টোকেন নেওয়া হবে
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// বট চালু হলে কনসোলেতে মেসেজ দেখাবে
console.log("TUKNBD Notification Bot চালু হয়েছে...");

// বটে /start কমান্ড দিলে যা রিপ্লাই দেবে
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "আসসালামু আলাইকুম! আমি TUKNBD নোটিফিকেশন বট।");
});

// গ্রুপে বা চ্যাটে যেকোনো নতুন মেসেজ আসলে যা করবে
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // কমান্ড বাদে অন্য মেসেজগুলো নোটিফাই করবে
    if (text && !text.startsWith('/')) {
        bot.sendMessage(chatId, `নোটিফিকেশন: নতুন মেসেজ এসেছে - "${text}"`);
    }
});
