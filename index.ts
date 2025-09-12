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
  buildRosterKeyboard,
  buildStartKeyboard,
  buildTeamsKeyboard,
} from "./keyboards.js";

import { LeagueIDs, MLBSportID, successMessage } from "./constants.js";

dotenv.config();
const mlb = new MLBStatsAPI();
const bot = new Bot(process.env.TELEGRAM_BOT_AUTH_TOKEN!);

/* -------------------------------------------------------------------------- */
/*                               API Fetchers                                 */
/* -------------------------------------------------------------------------- */

async function fetchGamesSchedule(date: Date) {
  const dateStr = date.toISOString().split("T")[0];
  const response = await mlb.getSchedule({ params: { sportId: MLBSportID, date: dateStr } });
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

async function fetchTeamDetails(teamId: number) {
  const [al, nl] = await Promise.all([
    mlb.getStandings({ params: { leagueId: LeagueIDs.AL } }),
    mlb.getStandings({ params: { leagueId: LeagueIDs.NL } }),
  ]);

  const allRecords = [...(al.data.records ?? []), ...(nl.data.records ?? [])];
  for (const division of allRecords) {
    const teamRecord = division.teamRecords?.find((tr: any) => tr.team?.id === teamId);
    if (teamRecord) return { teamRecord };
  }
  return null;
}

async function fetchTeamRoster(teamId: number) {
  const response = await mlb.getTeamRoster({ pathParams: { teamId } });
  return response.data ?? response;
}

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
    const msg = await fetchGamesSchedule(new Date());
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
    await updateMessage(ctx, "Select a team to view detailed stats:", buildTeamsKeyboard());
  },

  rosters: async (ctx) => {
    await updateMessage(
      ctx,
      "Select a team to view detailed roster information:",
      buildRosterKeyboard()
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
    const date = new Date(`${dateStr}T00:00:00Z`);
    const msg = await fetchGamesSchedule(date);
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
      return updateMessage(ctx, "Select a team to view detailed stats:", buildTeamsKeyboard());
    if (target === "rosters")
      return updateMessage(
        ctx,
        "Select a team to view detailed roster information:",
        buildRosterKeyboard()
      );
  }
});

/* -------------------------------------------------------------------------- */
/*                                Start the bot                               */
/* -------------------------------------------------------------------------- */

bot.start();
console.log(successMessage);
