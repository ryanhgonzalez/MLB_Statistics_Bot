// index.ts
import { Bot } from "grammy";
import dotenv from "dotenv";
import MLBStatsAPI from "mlb-stats-api";

import {
  buildGamesScheduleMessage,
  buildStandingsMessage,
  buildTeamDetailsMessage,
} from "./messages.js";

import {
  buildGamesScheduleKeyboard,
  buildStandingsKeyboard,
  buildStartKeyboard,
  buildTeamsKeyboard,
} from "./keyboards.js";

import { MLBSportID } from "./constants.js";

dotenv.config();
const mlb = new MLBStatsAPI();
const token = process.env.TELEGRAM_BOT_AUTH_TOKEN!;
const bot = new Bot(token);

/* -------------------------------------------------------------------------- */
/*                                API Methods                                 */
/* -------------------------------------------------------------------------- */

// Fetch games for a given date
async function getGamesScheduleMessage(date: Date): Promise<string> {
  const dateStr = date.toISOString().split("T")[0];
  const response = await mlb.getSchedule({
    params: { sportId: MLBSportID, date: dateStr },
  });
  const dates = response.data.dates;
  if (!dates?.length) return `No MLB games scheduled for ${dateStr}.`;
  return buildGamesScheduleMessage(dateStr, dates[0].games).trim();
}

// Fetch league standings
async function getLeagueStandings(leagueId: number, date?: Date) {
  const params: Record<string, any> = { leagueId };
  if (date) params.date = date.toISOString().split("T")[0];

  const response = await mlb.getStandings({ params });
  return response.data.records ?? [];
}

// Fetch single team stats
export async function fetchTeamDetails(teamId: number) {
  // Get AL and NL standings
  const standingsAL = await mlb.getStandings({ params: { leagueId: 103 } });
  const standingsNL = await mlb.getStandings({ params: { leagueId: 104 } });

  const allRecords = [...(standingsAL.data.records ?? []), ...(standingsNL.data.records ?? [])];

  for (const division of allRecords) {
    if (!division.teamRecords) continue;

    const teamRecord = division.teamRecords.find((tr: any) => tr.team?.id === teamId);

    if (teamRecord) {
      return {
        teamRecord,
        divisionName: division.division?.name ?? "N/A",
        leagueName: division.league?.name ?? "N/A",
      };
    }
  }

  return null; // Team not found
}




/* -------------------------------------------------------------------------- */
/*                                Bot Commands                                */
/* -------------------------------------------------------------------------- */

// /start command
bot.command("start", (ctx) => {
  ctx.reply("Welcome to the MLB Statistics Bot! Choose an option to get started:", {
    reply_markup: buildStartKeyboard(),
  });
});

// Main unified handler for all callback queries
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data!;

  /* --------------------- Today's Schedule (main menu) --------------------- */
  if (data === "scores") {
    const msg = await getGamesScheduleMessage(new Date());
    await ctx.editMessageText(msg, { reply_markup: buildGamesScheduleKeyboard(new Date()) });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Games navigation --------------------------- */
  if (data.startsWith("games:") || data.startsWith("refresh:")) {
    const dateStr = data.split(":")[1];
    const date = new Date(dateStr + "T00:00:00Z");
    const msg = await getGamesScheduleMessage(date);
    await ctx.editMessageText(msg, { reply_markup: buildGamesScheduleKeyboard(date) });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Standings menu ----------------------------- */
  if (data === "standings_menu") {
    await ctx.editMessageText("Select a league:", {
      reply_markup: buildStandingsKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------- Individual league standings ---------------------- */
  if (data.startsWith("standings:")) {
    const leagueId = parseInt(data.split(":")[1], 10);
    const records = await getLeagueStandings(leagueId);
    const msg = buildStandingsMessage(records);
    await ctx.editMessageText(msg);
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Teams menu --------------------------------- */
  if (data === "teams") {
    await ctx.reply("Select a team to view detailed stats:", {
      reply_markup: buildTeamsKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Team details ------------------------------- */
  if (data.startsWith("team:")) {
    const teamId = parseInt(data.split(":")[1], 10);

    const details = await fetchTeamDetails(teamId);
    const msg = buildTeamDetailsMessage(details);

    await ctx.editMessageText(msg);
    await ctx.answerCallbackQuery();
    return;
  }

});

/* -------------------------------------------------------------------------- */
/*                                Start the bot                               */
/* -------------------------------------------------------------------------- */

bot.start();
console.log("⚾ MLB Statistics Bot is running…");
