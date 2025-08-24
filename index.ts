import { Bot, InlineKeyboard } from "grammy";
import dotenv from "dotenv";
import MLBStatsAPI from "mlb-stats-api";

dotenv.config();
const mlb = new MLBStatsAPI();
const token = process.env.TELEGRAM_BOT_AUTH_TOKEN!;
const bot = new Bot(token);

// Helper to format game time
function formatGameTime(gameDate: string) {
  const date = new Date(gameDate);
  return date.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Fetch games for a given date
async function getGamesMessage(date: Date, label: string): Promise<string> {
  const dateStr = date.toISOString().split("T")[0];
  const response = await mlb.getSchedule({ params: { sportId: 1, date: dateStr } });
  const dates = response.data.dates;
  if (!dates?.length) return `No MLB games ${label}.`;

  let message = `⚾ MLB Games for ${dateStr} (${label})\n\n`;
  for (const game of dates[0].games) {
    const home = game.teams.home.team.name;
    const away = game.teams.away.team.name;
    const status = game.status.detailedState;
    const awayScore = game.teams.away.score ?? game.linescore?.teams?.away?.runs ?? 0;
    const homeScore = game.teams.home.score ?? game.linescore?.teams?.home?.runs ?? 0;

    if (status === "Final" || status === "In Progress") {
      message += `${away} (${awayScore}) @ ${home} (${homeScore}) — ${status}\n`;
    } else if (status === "Scheduled") {
      const startTime = formatGameTime(game.gameDate);
      message += `${away} @ ${home} — Scheduled for ${startTime} ET\n`;
    } else {
      message += `${away} @ ${home} — ${status}\n`;
    }
  }
  return message;
}

// Build navigation keyboard
function buildKeyboard(date: Date): InlineKeyboard {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return new InlineKeyboard()
    .text("⬅ Yesterday", `games:${yesterday.toISOString().split("T")[0]}`)
    .text("Today", `games:${new Date().toISOString().split("T")[0]}`)
    .text("Tomorrow ➡", `games:${tomorrow.toISOString().split("T")[0]}`)
    .row()
    .text("🔄 Refresh", `refresh:${date.toISOString().split("T")[0]}`);
}

// /start command
bot.command("start", (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("Get Today's Scores", "scores")
    .row()
    .text("Get Player Stats", "player");

  ctx.reply("Welcome to MLB Bot! Choose an option:", { reply_markup: keyboard });
});

// "Get Today's Scores" button
bot.callbackQuery("scores", async (ctx) => {
  await ctx.answerCallbackQuery();
  const msg = await getGamesMessage(new Date(), "today");
  await ctx.reply(msg, { reply_markup: buildKeyboard(new Date()) });
});

// Navigation & Refresh buttons
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data!;
  if (!data.startsWith("games:") && !data.startsWith("refresh:")) return;

  const dateStr = data.split(":")[1];
  const date = new Date(dateStr);
  const label =
    date.toDateString() === new Date().toDateString()
      ? "today"
      : date < new Date()
      ? "yesterday"
      : "upcoming";

  const msg = await getGamesMessage(date, label);
  await ctx.editMessageText(msg, { reply_markup: buildKeyboard(date) });
  await ctx.answerCallbackQuery();
});

// "Get Player Stats" button
bot.callbackQuery("player", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.reply("Send me a player name to fetch stats (e.g., Mike Trout).");
});

// Handle player name messages dynamically
bot.on("message:text", async (ctx) => {
  const playerName = ctx.message.text.trim();

  try {
    // Search for the player by name
    const searchRes = await mlb.getPeople({ params: { name: playerName } });
    const person = searchRes.data.people?.[0];
    if (!person) {
      ctx.reply(`Player "${playerName}" not found.`);
      return;
    }

    // Fetch detailed player info
    const playerRes = await mlb.getPerson({ pathParams: { personId: person.id } });
    const player = playerRes.data.people?.[0];
    if (!player) {
      ctx.reply(`Player "${playerName}" not found in API.`);
      return;
    }

    // Build stats message
    let stats = `📊 Stats for ${player.fullName}\n`;
    stats += `Team: ${player.currentTeam?.name ?? "N/A"}\n`;
    stats += `Position: ${player.primaryPosition?.name ?? "N/A"}\n`;

    ctx.reply(stats);
  } catch (err) {
    console.error(err);
    ctx.reply("Failed to fetch player stats.");
  }
});

bot.start();
console.log("MLB Bot is running…");