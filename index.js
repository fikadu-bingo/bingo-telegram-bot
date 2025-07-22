require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");

const token = process.env.BOT_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const appUrl = "https://bingo-telegram-bot.onrender.com"; // Your Render domain

// ✅ Create Express app
const app = express();
app.use(bodyParser.json());

// ✅ Create bot in webhook mode
const bot = new TelegramBot(token, { webHook: { port: 3000 } });
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

// ✅ /start - Show Share Contact button
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const contactOptions = {
    reply_markup: {
      keyboard: [
        [
          {
            text: "📞 Share Your Phone",
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };

  bot.sendMessage(chatId, "👋 Welcome to 1Bingo!\n\nPlease share your phone number to continue:", contactOptions);
});

// ✅ Handle contact
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;
  const username = msg.from.username || "NoUsername";
  const phoneNumber = contact.phone_number;
  const firstName = contact.first_name || "";

  try {
    // ✅ Send contact to backend
    await axios.post(`${backendUrl}/api/user/telegram-auth`, {
      telegram_id: chatId,
      username: username,
      phone_number: phoneNumber,
    });

    console.log(`✅ Contact saved for ${username}`);

    // ✅ Show play button after contact is saved
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "▶️ Play",
              url: "https://bingo-telegram-web.vercel.app", // Your frontend
            },
          ],
        ],
      },
    };

    bot.sendMessage(chatId, "✅ Phone received! Tap 'Play' to continue 🎮", options);
  } catch (error) {
    console.error("❌ Error saving contact:", error.message);
    bot.sendMessage(chatId, "❌ Error saving your contact. Please try again later.");
  }
});

// ✅ /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Commands:\n/join — Join a game\n/bingo — Call bingo\n/status — Check game status"
  );
});

// ✅ /join
bot.onText(/\/join/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.post(`${backendUrl}/api/game/join`, {
      telegramId: chatId,
      username: msg.from.username || "NoUsername",
    });

    bot.sendMessage(chatId, `✅ You joined the game! Your ticket: ${res.data.ticketNumber}`);
  } catch (error) {
    console.error("Join error:", error.message);
    bot.sendMessage(chatId, "❌ Failed to join game. Please try again later.");
  }
});

// ✅ /bingo
bot.onText(/\/bingo/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.post(`${backendUrl}/api/bingo`, {
      telegramId: chatId,
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

// ✅ /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.get(`${backendUrl}/api/status`, {
      params: { telegramId: chatId },
    });

    bot.sendMessage(chatId, `🎲 Your game status: ${res.data.status}`);
  } catch (error) {
    console.error("Status error:", error.message);
    bot.sendMessage(chatId, "❌ Unable to fetch status right now.");
  }
});
// ✅ Start Express server (only needed for webhook on Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});