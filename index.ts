import { Bot, InlineKeyboard } from "grammy";
import { formatToHourBucket, formatToChicagoTime } from "./formatters.js";
import { buildGameScheduleMessage } from "./messages.js";
import { TeamAbbreviations } from "./constants.js";
import dotenv from "dotenv";
import MLBStatsAPI from "mlb-stats-api";

dotenv.config();
const mlb = new MLBStatsAPI();
const token = process.env.TELEGRAM_BOT_AUTH_TOKEN!;
const bot = new Bot(token);

// Fetch games for a given date
async function getGamesMessage(date: Date): Promise<string> {
  const dateStr = date.toISOString().split("T")[0];
  const response = await mlb.getSchedule({ params: { sportId: 1, date: dateStr } });
  const dates = response.data.dates;
  if (!dates?.length) return `No MLB games`;

  // Bucket games by start hour
  const buckets: Record<string, string[]> = {};

  for (const game of dates[0].games) {
    const home = TeamAbbreviations[game.teams.home.team.name] ?? game.teams.home.team.name;
    const away = TeamAbbreviations[game.teams.away.team.name] ?? game.teams.away.team.name;
    const status = game.status.detailedState;
    const awayScore = game.teams.away.score ?? game.linescore?.teams?.away?.runs ?? 0;
    const homeScore = game.teams.home.score ?? game.linescore?.teams?.home?.runs ?? 0;

    let line: string;
    if (status === "Final" || status === "In Progress") {
      line = `\`${away} ${awayScore} @ ${home} ${homeScore} — ${status}\``;
    } else if (status === "Scheduled") {
      const startTime = formatToChicagoTime(game.gameDate);
      line = `\`${away} @ ${home} — ${startTime}\``;
    } else {
      line = `\`${away} @ ${home} — ${status}\``;
    }

    // Group into hour bucket
    const bucket = formatToHourBucket(game.gameDate);
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(line);
  }

  // Build message text
  let message = buildGameScheduleMessage(dateStr, buckets);

  return message.trim();
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
    .text("Get Today's Schedule", "scores");

  ctx.reply("Welcome to the MLB Statistics Bot! Choose an option to get started:", { reply_markup: keyboard });
});

// "Get Today's Scores" button
bot.callbackQuery("scores", async (ctx) => {
  await ctx.answerCallbackQuery();
  const msg = await getGamesMessage(new Date());
  await ctx.reply(msg, { reply_markup: buildKeyboard(new Date()) });
});

// Navigation & Refresh buttons
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data!;
  if (!data.startsWith("games:") && !data.startsWith("refresh:")) return;

  const dateStr = data.split(":")[1];
  const date = new Date(dateStr);

  const msg = await getGamesMessage(date);
  await ctx.editMessageText(msg, { reply_markup: buildKeyboard(date) });
  await ctx.answerCallbackQuery();
});

bot.start();
console.log("MLB Statistics Bot is running…");