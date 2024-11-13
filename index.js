import { Client } from 'node-telegram-bot-api';
import axios from 'axios';

// Telegram Bot token
const token = '7450786770:AAHeRvsxhmd3gbwL110Di-zuStJQDwLbrLQ'; // সরাসরি টোকেন দিয়ে দেবেন না, এটি পরিবেশ ভেরিয়েবল হিসেবে ব্যবহার করুন
const bot = new Client(token, { polling: false });

// Channels for verification
const channels = ["@jiohackerteam", "@nkcyber2400", "@NeonNexus69"];

// Admin chat IDs (Only these users can access admin commands)
const adminChatIds = [7192531319, 6280543576];

// User tracking and banning lists
let bannedUsers = [];
let userActivity = {};

// Webhook handler
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body;
    const chatId = body.message.chat.id;
    const text = body.message.text;
    const firstName = body.message.from.first_name;
    const username = body.message.from.username || "N/A";

    if (bannedUsers.includes(chatId)) {
      bot.sendMessage(chatId, "You are banned from using this bot.");
      return res.status(200).send('OK');
    }

    if (text === "/start") {
      // Send welcome message and check channel subscription
      await checkChannelsAndSendMessage(chatId, firstName, username);
    } else if (text === "🖼️ Generate Image") {
      bot.sendMessage(chatId, "Please enter a prompt to generate an image:");
    } else if (text === "ℹ️ My Generated Images") {
      await sendUserGeneratedImages(chatId);
    } else if (text.startsWith("/adminpanel") && adminChatIds.includes(chatId)) {
      bot.sendMessage(chatId, "Admin logged in successfully.");
    } else if (text.startsWith("/ban") && adminChatIds.includes(chatId)) {
      const userIdToBan = parseInt(text.split(' ')[1]);
      if (userIdToBan) {
        bannedUsers.push(userIdToBan);
        bot.sendMessage(chatId, `✅ User ID ${userIdToBan} has been banned.`);
      } else {
        bot.sendMessage(chatId, "⚠️ Invalid user ID.");
      }
    } else if (text.startsWith("Generate: ")) {
      const prompt = text.replace("Generate: ", "").split(" ").join("+"); // Convert each word with '+'
      await generateImage(chatId, prompt, body.message.from);
    }

    res.status(200).send('OK');
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

// Function to check if the user joined all channels
async function checkChannelsAndSendMessage(chatId, firstName, username) {
  let allJoined = true;
  for (const channel of channels) {
    try {
      const member = await bot.getChatMember(channel, chatId);
      if (member.status === 'left') {
        allJoined = false;
      }
    } catch (error) {
      allJoined = false;
    }
  }

  if (!allJoined) {
    let joinMessage = `Hello ${firstName}! To use this bot, please join the following channels:\n\n`;
    channels.forEach(channel => joinMessage += `${channel}\n`);
    joinMessage += "\nOnce you've joined, click the button below to verify.";

    bot.sendMessage(chatId, joinMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Verify", callback_data: "verify" }]
        ]
      }
    });
  } else {
    bot.sendMessage(chatId, `Welcome, ${firstName}! You can now use the bot.`);
  }
}

// Function to send user's generated images
async function sendUserGeneratedImages(chatId) {
  if (userActivity[chatId] && userActivity[chatId].length > 0) {
    userActivity[chatId].forEach((img, index) => {
      bot.sendPhoto(chatId, img.url, { caption: `${index + 1}. ${img.prompt}` });
    });
  } else {
    bot.sendMessage(chatId, "You haven't generated any images yet.");
  }
}

// Function to generate an image based on the user's prompt
async function generateImage(chatId, prompt, user) {
  try {
    const response = await axios.get(`https://api.pikaapis.my.id/ImgGen/BlackBox.php?prompt=${prompt}`);
    const imageUrl = response.data.image_url;

    if (!userActivity[chatId]) {
      userActivity[chatId] = [];
    }
    userActivity[chatId].push({ prompt, url: imageUrl, username: user.username });

    bot.sendPhoto(chatId, imageUrl, { caption: `Generated image for prompt: "${prompt.split("+").join(" ")}"` });
  } catch (error) {
    bot.sendMessage(chatId, "Error generating image. Please try again.");
  }
}

// Set the webhook URL (for Vercel)
bot.setWebHook(`https://your-vercel-url/api/telegram`); // Replace with your actual Vercel URL
