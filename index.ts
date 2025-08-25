import { Bot, InlineKeyboard } from "grammy";
import dotenv from "dotenv";
import MLBStatsAPI from "mlb-stats-api";

dotenv.config();
const mlb = new MLBStatsAPI();
const token = process.env.TELEGRAM_BOT_AUTH_TOKEN!;
const bot = new Bot(token);

const teamAbbreviations: Record<string, string> = {
  "Boston Red Sox": "BOS",
  "New York Yankees": "NYY",
  "Tampa Bay Rays": "TB",
  "Toronto Blue Jays": "TOR",
  "Baltimore Orioles": "BAL",
  "Washington Nationals": "WSH",
  "Atlanta Braves": "ATL",
  "Miami Marlins": "MIA",
  "New York Mets": "NYM",
  "Philadelphia Phillies": "PHI",
  "Chicago White Sox": "CWS",
  "Minnesota Twins": "MIN",
  "Cleveland Guardians": "CLE",
  "Detroit Tigers": "DET",
  "Kansas City Royals": "KC",
  "Cincinnati Reds": "CIN",
  "St. Louis Cardinals": "STL",
  "Pittsburgh Pirates": "PIT",
  "Houston Astros": "HOU",
  "Texas Rangers": "TEX",
  "Los Angeles Angels": "LAA",
  "Seattle Mariners": "SEA",
  "Athletics": "ATH",
  "Los Angeles Dodgers": "LAD",
  "San Francisco Giants": "SF",
  "San Diego Padres": "SD",
  "Colorado Rockies": "COL",
  "Arizona Diamondbacks": "ARI",
  "Milwaukee Brewers": "MIL",
  "Chicago Cubs": "CHC"
};

// Format start time in CT and return hour bucket (e.g. "6 PM")
function getHourBucket(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = 
  { 
    hour: "numeric", 
    hour12: true, 
    timeZone: "America/Chicago" 
  };
  return new Intl.DateTimeFormat("en-US", options).format(date); // e.g. "6 PM"
}


function formatGameTime(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = 
  { 
    hour: "numeric", 
    minute: "2-digit", 
    hour12: true, 
    timeZone: "America/Chicago" 
  };
  return new Intl.DateTimeFormat("en-US", options).format(date); // e.g. "6:35 PM"
}

// Fetch games for a given date
async function getGamesMessage(date: Date, label: string): Promise<string> {
  const dateStr = date.toISOString().split("T")[0];
  const response = await mlb.getSchedule({ params: { sportId: 1, date: dateStr } });
  const dates = response.data.dates;
  if (!dates?.length) return `No MLB games ${label}.`;

  // Bucket games by start hour
  const buckets: Record<string, string[]> = {};

  for (const game of dates[0].games) {
    const home = teamAbbreviations[game.teams.home.team.name] ?? game.teams.home.team.name;
    const away = teamAbbreviations[game.teams.away.team.name] ?? game.teams.away.team.name;
    const status = game.status.detailedState;
    const awayScore = game.teams.away.score ?? game.linescore?.teams?.away?.runs ?? 0;
    const homeScore = game.teams.home.score ?? game.linescore?.teams?.home?.runs ?? 0;

    let line: string;
    if (status === "Final" || status === "In Progress") {
      line = `\`${away} ${awayScore} @ ${home} ${homeScore} — ${status}\``;
    } else if (status === "Scheduled") {
      const startTime = formatGameTime(game.gameDate);
      line = `\`${away} @ ${home} — ${startTime}\``;
    } else {
      line = `\`${away} @ ${home} — ${status}\``;
    }

    // Group into hour bucket
    const bucket = getHourBucket(game.gameDate);
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(line);
  }

  // Build message text
  let message = `⚾ MLB Games for ${dateStr} (${label})\n\n`;
  for (const bucket of Object.keys(buckets).sort((a, b) => {
    // Sort by hour
    const getHour = (t: string) => {
      const [hour, ampm] = t.split(" ");
      let h = parseInt(hour, 10);
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h;
    };
    return getHour(a) - getHour(b);
  })) {
    message += `🕒 ${bucket} CT\n`;
    message += buckets[bucket].join("\n") + "\n\n";
  }

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