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
  buildFranchiseKeyboard,
  buildGamesScheduleKeyboard,
  buildStartKeyboard,
} from "./keyboards.js";

import { 
  LeagueIDs, 
  successMessage
} from "./constants.js";

import {
  fetchTeamStandings,
  fetchTeamDetails,
  fetchTeamRoster,
  fetchGamesSchedule
} from "./fetchers.js"

dotenv.config();
const mlb = new MLBStatsAPI();
const bot = new Bot(process.env.TELEGRAM_BOT_AUTH_TOKEN!);

/* -------------------------------------------------------------------------- */
/*                              Helper functions                              */
/* -------------------------------------------------------------------------- */

async function updateMessage(ctx: any, text: string, keyboard: any) {
  await ctx.editMessageText(text, { reply_markup: keyboard });
  await ctx.answerCallbackQuery();
}

/* -------------------------------------------------------------------------- */
/*                                Handlers                                    */
/* -------------------------------------------------------------------------- */

const handlers: Record<string, (ctx: any, data: string) => Promise<void>> = {
  scores: async (ctx) => {
    const { dateStr, games } = await fetchGamesSchedule(new Date());
    const msg = games.length
      ? buildGamesScheduleMessage(dateStr, games).trim()
      : `No MLB games scheduled for ${dateStr}.`;
    await updateMessage(ctx, msg, buildGamesScheduleKeyboard(new Date()));
  },

  standings: async (ctx) => {
    const [al, nl] = await Promise.all([
      fetchTeamStandings(Number(LeagueIDs["AL"])),
      fetchTeamStandings(Number(LeagueIDs["NL"])),
    ]);
    const msg = buildStandingsMessage([...al, ...nl], new Date());
    await updateMessage(ctx, msg, buildBackKeyboard("start"));
  },

  teams: async (ctx) => {
    await updateMessage(ctx, "Select a team to view detailed stats:", buildFranchiseKeyboard("team"));
  },

  rosters: async (ctx) => {
    await updateMessage(
      ctx,
      "Select a team to view detailed roster information:",
      buildFranchiseKeyboard("roster")
    );
  },
};

/* -------------------------------------------------------------------------- */
/*                             Bot Command Setup                              */
/* -------------------------------------------------------------------------- */

bot.command("start", (ctx) =>
  ctx.reply("Welcome to the MLB Statistics Bot! Choose an option to get started:", {
    reply_markup: buildStartKeyboard(),
  })
);

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data!;

  // Direct matches
  if (handlers[data]) return handlers[data](ctx, data);

  // Games navigation
  if (data.startsWith("games:") || data.startsWith("refresh:")) {
    const dateStr = data.split(":")[1];
    // keep using UTC day parsing to be consistent with other code
    const date = new Date(`${dateStr}T00:00:00Z`);
    const { dateStr: fetchedDateStr, games } = await fetchGamesSchedule(date);
    const msg = games.length
      ? buildGamesScheduleMessage(fetchedDateStr, games).trim()
      : `No MLB games scheduled for ${fetchedDateStr}.`;
    return updateMessage(ctx, msg, buildGamesScheduleKeyboard(date));
  }

  // Team details
  if (data.startsWith("team:")) {
    const teamId = Number(data.split(":")[1]);
    const details = await fetchTeamDetails(teamId);
    const msg = buildTeamDetailsMessage(details);
    return updateMessage(ctx, msg, buildBackKeyboard("teams"));
  }

  // Roster details
  if (data.startsWith("roster:")) {
    const teamId = Number(data.split(":")[1]);
    const details = await fetchTeamRoster(teamId);
    const msg = buildTeamRosterMessage(teamId, details);
    return updateMessage(ctx, msg, buildBackKeyboard("rosters"));
  }

  // Back buttons
  if (data.startsWith("back:")) {
    const target = data.split(":")[1];
    if (target === "start")
      return updateMessage(
        ctx,
        "Welcome to the MLB Statistics Bot! Choose an option to get started:",
        buildStartKeyboard()
      );
    if (target === "teams")
      return updateMessage(ctx, "Select a team to view detailed stats:", buildFranchiseKeyboard("team"));
    if (target === "rosters")
      return updateMessage(
        ctx,
        "Select a team to view detailed roster information:",
        buildFranchiseKeyboard("roster")
      );
  }
});

/* -------------------------------------------------------------------------- */
/*                                Start the bot                               */
/* -------------------------------------------------------------------------- */

bot.start();
console.log(successMessage);
