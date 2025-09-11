// index.ts
import { Bot } from "grammy";
import dotenv from "dotenv";
import MLBStatsAPI from "mlb-stats-api";

import {
  buildGamesScheduleMessage,
  buildStandingsMessage,
  buildTeamDetailsMessage,
  buildTeamRosterMessage,
} from "./messages.js";

import {
  buildBackKeyboard,
  buildGamesScheduleKeyboard,
  buildGenericBackKeyboard,
  buildRosterKeyboard,
  buildStartKeyboard,
  buildTeamsKeyboard,
} from "./keyboards.js";

import { 
  LeagueIDs,
  MLBSportID, 
  successMessage, 
} from "./constants.js";

dotenv.config();
const mlb = new MLBStatsAPI();
const token = process.env.TELEGRAM_BOT_AUTH_TOKEN!;
const bot = new Bot(token);

/* -------------------------------------------------------------------------- */
/*                                API Methods                                 */
/* -------------------------------------------------------------------------- */

async function fetchGamesSchedule(date: Date): Promise<string> {
  const dateStr = date.toISOString().split("T")[0];
  const response = await mlb.getSchedule({
    params: { sportId: MLBSportID, date: dateStr },
  });
  const dates = response.data.dates;
  if (!dates?.length) return `No MLB games scheduled for ${dateStr}.`;
  return buildGamesScheduleMessage(dateStr, dates[0].games).trim();
}

async function fetchTeamStandings(leagueId: number, date?: Date) {
  const params: Record<string, any> = { leagueId };
  if (date) params.date = date.toISOString().split("T")[0];

  const response = await mlb.getStandings({ params });
  return response.data.records ?? [];
}

export async function fetchTeamDetails(teamId: number) {
  const standingsAL = await mlb.getStandings({ params: { leagueId: 103 } });
  const standingsNL = await mlb.getStandings({ params: { leagueId: 104 } });

  const allRecords = [...(standingsAL.data.records ?? []), ...(standingsNL.data.records ?? [])];

  for (const division of allRecords) {
    if (!division.teamRecords) continue;

    const teamRecord = division.teamRecords.find((tr: any) => tr.team?.id === teamId);

    if (teamRecord) {
      return {
        teamRecord      
      };
    }
  }

  return null;
}

export async function fetchTeamRoster(teamId: number) {
  const response = await mlb.getTeamRoster({
    pathParams: { teamId }
  });

  // If the library nests under `.data`, unwrap here
  return response.data ?? response;
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
    const msg = await fetchGamesSchedule(new Date());
    await ctx.editMessageText(msg, { reply_markup: buildGamesScheduleKeyboard(new Date()) });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Games navigation --------------------------- */
  if (data.startsWith("games:") || data.startsWith("refresh:")) {
    const dateStr = data.split(":")[1];
    const date = new Date(dateStr + "T00:00:00Z");
    const msg = await fetchGamesSchedule(date);
    await ctx.editMessageText(msg, { reply_markup: buildGamesScheduleKeyboard(date) });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------- Individual league standings ---------------------- */
  if (data.startsWith("standings")) {
    const alRecords = await fetchTeamStandings(Number(LeagueIDs["AL"]));
    const nlRecords = await fetchTeamStandings(Number(LeagueIDs["NL"]));
    const allRecords = [...alRecords, ...nlRecords];

    const msg = buildStandingsMessage(allRecords, new Date());
    await ctx.editMessageText(msg, { reply_markup: buildBackKeyboard("start") });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Teams menu --------------------------------- */
  if (data === "teams") {
    await ctx.editMessageText("Select a team to view detailed stats:", {
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

    await ctx.editMessageText(msg, { reply_markup: buildBackKeyboard("teams") });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Roster menu --------------------------------- */
  if (data === "rosters") {
    await ctx.editMessageText("Select a team to view detailed roster information:", {
      reply_markup: buildRosterKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Roster details ------------------------------- */
  if (data.startsWith("roster:")) {
    const teamId = parseInt(data.split(":")[1], 10);
    const details = await fetchTeamRoster(teamId);
    const msg = buildTeamRosterMessage(teamId, details);

    await ctx.editMessageText(msg, { reply_markup: buildBackKeyboard("rosters") });
    await ctx.answerCallbackQuery();
    return;
  }

  /* ---------------------------- Back buttons ------------------------------- */
  if (data.startsWith("back:")) {
    const target = data.split(":")[1];

    if (target === "start") {
      await ctx.editMessageText(
        "Welcome to the MLB Statistics Bot! Choose an option to get started:",
        { reply_markup: buildStartKeyboard() }
      );
    } else if (target === "teams") {
      await ctx.editMessageText("Select a team to view detailed stats:", {
        reply_markup: buildTeamsKeyboard(),
      });
    } else if (target === "rosters") {
      await ctx.editMessageText("Select a team to view detailed roster information:", {
        reply_markup: buildRosterKeyboard(),
      });
    }

    await ctx.answerCallbackQuery();
    return;
  }
});

/* -------------------------------------------------------------------------- */
/*                                Start the bot                               */
/* -------------------------------------------------------------------------- */

bot.start();
console.log(successMessage);