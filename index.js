require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");

const token = process.env.BOT_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const appUrl = "https://bingo-telegram-bot.onrender.com";

// Create Express app
const app = express();
app.use(bodyParser.json());

// Create bot in webhook mode
const bot = new TelegramBot(token, { webHook: { port: 3000 } });
bot.setWebHook(`${appUrl}/bot${token}`);

// Webhook route
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ 1Bingo Telegram Bot is running with webhook!");
});

// /start — Ask phone only if not registered
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const response = await axios.get(`${backendUrl}/api/user/check/${chatId}`);
    const exists = response.data.exists;

    if (exists) {
const frontendBaseUrl = "https://bingo-telegram-web.vercel.app";
const playUrl = `${frontendBaseUrl}?telegram_id=${chatId}&first_name=${encodeURIComponent(msg.from.first_name || "")}&username=${encodeURIComponent(msg.from.username || "")}`;

bot.sendMessage(chatId, "✅ You're already registered!\nTap below to play 🎮", {
  reply_markup: {
    inline_keyboard: [[
      {
        text: "▶️ Play",
        url: playUrl,
      }
    ]]
  }
});
    } else {
      const contactOptions = {
        reply_markup: {
          keyboard: [
            [{ text: "📞 Share Your Phone", request_contact: true }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };
      bot.sendMessage(chatId, "👋 Welcome to 1Bingo!\nPlease share your phone number to continue:", contactOptions);
    }
  } catch (error) {
    console.error("Error checking user:", error.message);
    bot.sendMessage(chatId, "❌ Error checking registration. Try again.");
  }
});

// Handle contact share
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;
  const phoneNumber = contact.phone_number;
  const firstName = contact.first_name || "";
  const username = msg.from.username || "NoUsername";

  let profile_picture = "";
  try {
    const userPhotos = await bot.getUserProfilePhotos(chatId, { limit: 1 });
    if (userPhotos.total_count > 0) {
      profile_picture = userPhotos.photos[0][0].file_id;
    }
  } catch (err) {
    console.log("Could not fetch user photo:", err.message);
  }

  try {
    await axios.post(`${backendUrl}/api/user/telegram-auth`, {
      telegram_id: chatId,
      username,
      phone_number: phoneNumber,
      first_name: firstName,
      profile_picture,
    });

    console.log(`✅ Contact saved for ${username}`);

  const frontendBaseUrl = "https://bingo-telegram-web.vercel.app";
const playUrl = `${frontendBaseUrl}?telegram_id=${chatId}&first_name=${encodeURIComponent(firstName)}&username=${encodeURIComponent(username)}`;

bot.sendMessage(chatId, "✅ Phone received! Tap below to play 🎮", {
  reply_markup: {
    inline_keyboard: [[{ text: "▶️ Play", url: playUrl }]],
  },
});
  } catch (error) {
    console.error("❌ Error saving contact:", error.message);
    bot.sendMessage(chatId, "❌ Error saving your contact. Please try again later.");
  }
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
      username: msg.from.username || "NoUsername",
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
    const res = await axios.post(`${backendUrl}/api/bingo`, { telegramId: chatId });
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
      params: { telegramId: chatId },
    });
    bot.sendMessage(chatId, `🎲 Your game status: ${res.data.status}`);
  } catch (error) {
    console.error("Status error:", error.message);
    bot.sendMessage(chatId, "❌ Unable to fetch status right now.");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});