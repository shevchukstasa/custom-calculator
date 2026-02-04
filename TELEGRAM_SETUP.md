# 🔔 Telegram Integration Setup

This application can automatically send calculation results to a Telegram group.

## Prerequisites

1. **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)
2. **Group Chat ID** where bot will send messages

## Step-by-Step Setup

### 1. Create Telegram Bot

1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow instructions to name your bot
4. Copy the **Bot Token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Create Telegram Group

1. Create a new group in Telegram
2. Add your bot to the group (search by bot username)
3. Make the bot an **administrator** (required to send messages)

### 3. Get Group Chat ID

**Option A: Using @userinfobot**
1. Add [@userinfobot](https://t.me/userinfobot) to your group
2. The bot will show the group Chat ID (e.g., `-1001234567890`)
3. Remove @userinfobot from the group

**Option B: Using API**
1. Send any message to your group
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for `"chat":{"id":-1001234567890}` in the response

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file:
   ```env
   VITE_TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   VITE_TELEGRAM_CHAT_ID=-1001234567890
   ```

3. Restart the dev server:
   ```bash
   npm run dev
   ```

## Message Format

When a calculation is completed, the bot will send a message like:

```
🔥 New Calculation by Stas

📅 Date: Jan 5, 2026, 3:45 PM

📦 Product: tile (rectangle)
📏 Dimensions: 10 × 10 × 1 cm
🎨 Glaze: face-only

🏭 Kiln: Small (new)
📊 Loading: 7.80 m² (780 pcs)

💰 Stone Cost: 1.50 million IDR/m²
📦 Order Qty: 100 pcs

💵 Final Price:
  • Per piece: 0.25 million IDR
  • Per m²: 25.00 million IDR

💎 Market Price:
  • Per piece: 0.35 million IDR
  • Per m²: 35.00 million IDR

━━━━━━━━━━━━━━━━━━━━
🆔 ID: calc_1704444000000_abc123
```

## Troubleshooting

### Bot not sending messages?

1. **Check bot is admin**: Bot must be an administrator in the group
2. **Verify environment variables**: Check `.env` file is properly configured
3. **Check console**: Look for errors in browser console (F12)
4. **Test connection**: The app will log warnings if Telegram is not configured

### Bot token not working?

1. Make sure token is copied correctly (no spaces)
2. Check token is still valid in @BotFather
3. Create a new token if needed: `/token` in @BotFather

### Chat ID not working?

1. Make sure Chat ID starts with minus sign for groups: `-1001234567890`
2. Bot must be added to the group before getting Chat ID
3. Try using @userinfobot method (most reliable)

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to git
- Keep bot token secret
- Only share Chat ID with trusted team members
- Regularly rotate bot token if compromised

## Disabling Telegram Integration

To disable Telegram integration:
1. Remove or leave empty the environment variables in `.env`
2. The app will work normally, just won't send notifications

## Testing

To test if Telegram is working:
1. Complete a calculation with all fields filled
2. Check your Telegram group for the notification
3. Check browser console for success/error messages
