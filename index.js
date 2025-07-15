require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

const token = process.env.BOT_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const appUrl = "https://bingo-telegram-bot.onrender.com"; // Your Render service URL, e.g., "https://your-app-name.onrender.com"

// ✅ Create Express app
const app = express();
app.use(bodyParser.json());

// ✅ Create bot in webhook mode
const bot = new TelegramBot(token);
bot.setWebHook(`${appUrl}/bot${token}`);

// ✅ Express route for webhook
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("✅ 1Bingo Telegram Bot is running with webhook!");
});

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "▶️ Play",
            url: "https://bingo-telegram-web.vercel.app" // Your frontend URL
          }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, "🎉 Welcome to 1Bingo! Click 'Play' to open the game.", options);
});

// /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Commands:\n/join — Join a game\n/bingo — Call bingo\n/status — Check game status"
  );
});

// /join
bot.onText(/\/join/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.post(`${backendUrl}/api/game/join`, {
      telegramId: chatId,
      username: msg.from.username || 'NoUsername'
    });

    bot.sendMessage(chatId, `✅ You joined the game! Your ticket: ${res.data.ticketNumber}`);
  } catch (error) {
    console.error("Join error:", error.message);
    bot.sendMessage(chatId, "❌ Failed to join game. Please try again later.");
  }
});

// /bingo
bot.onText(/\/bingo/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.post(`${backendUrl}/api/bingo`, {
      telegramId: chatId
    });

    if (res.data.success) {
      bot.sendMessage(chatId, "🎉 Congratulations! You called Bingo successfully!");
    } else {
      bot.sendMessage(chatId, "❌ You do not have Bingo yet!");
    }
  } catch (error) {
    console.error("Bingo error:", error.message);
    bot.sendMessage(chatId, "❌ Error calling Bingo. Please try again.");
  }
});

// /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.get(`${backendUrl}/api/status`, {
      params: { telegramId: chatId }
    });

    bot.sendMessage(chatId, `🎲 Your game status: ${res.data.status}`);
  } catch (error) {
    console.error("Status error:", error.message);
    bot.sendMessage(chatId, "❌ Unable to fetch status right now.");
  }
});

// ✅ Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});
