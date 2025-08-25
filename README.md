# ⚾ MLB Telegram Bot

A simple Telegram bot that fetches and displays MLB game schedules, scores, and statuses.  
Built with **Node.js**, **TypeScript**, and the **MLB Stats API**.

---

## 🚀 Features
- Get **today’s**, **yesterday’s**, or **tomorrow’s** MLB games.
- Shows:
  - Team abbreviations (e.g., `BOS @ NYY`)
  - Game status (`Scheduled`, `In Progress`, `Final`)
  - Start times in **Central Time (CT)**
  - Live and final scores

---

## 📦 Setup

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/mlb-telegram-bot.git
cd mlb-telegram-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment variables
Create a `.env` file in the project root:

```
TELEGRAM_BOT_AUTH_TOKEN=your-telegram-bot-token-here
```

### 4. Run the bot
```bash
npm run dev
```
or for production:
```bash
npm run build && npm start
```

---

## 🤖 Usage
Interact with your bot using the inline buttons in Telegram:

- **Get Today's Scores** → Shows all MLB games for today with team abbreviations, start times in CT, and current scores/status.
- **Get Player Stats** → Prompts you to enter a player name (e.g., Mike Trout) to fetch their stats.

Example response when you tap **Get Today's Scores**:

Example response:
```
⚾ MLB Games for 2025-08-25 (today)

🕓 6 PM CT
━━━━━━━━━━━━
BOS @ BAL — Scheduled for 6:35 PM CT
TB @ CLE — Scheduled for 6:40 PM CT

🕖 7 PM CT
━━━━━━━━━━━━
WSH @ NYY — Scheduled for 7:05 PM CT
MIN @ TOR — Scheduled for 7:07 PM CT
```

---

## 🛠 Tech Stack
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)
- [GrammY](https://grammy.dev/) (Telegram Bot Framework)
- MLB Stats API (public)

---

## 📌 Notes
- All game times are shown in **Central Time (CT)**.
- If no games are scheduled, the bot will respond with:  
  `No MLB games today.`

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
