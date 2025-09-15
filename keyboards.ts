import { InlineKeyboard } from "grammy";
import { TeamIDs } from "./constants.js";

// Start menu keyboard
export function buildStartKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text("Get Latest Standings", "standings")
        .row()
        .text("Get Team Details", "teams")
        .row()
        .text("Get Team Roster", "rosters")
        .row()
        .text("Get Today's Schedule", "scores");
}

// Schedule navigation keyboard (Yesterday/Today/Tomorrow/Refresh) + Back
export function buildGamesScheduleKeyboard(date: Date): InlineKeyboard {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return new InlineKeyboard()
        .text("Refresh", `refresh:${date.toISOString().split("T")[0]}`)
        .row()
        .text("Back", "back:start");
}

export function buildFranchiseKeyboard(prefix: string): InlineKeyboard {
  const kb = new InlineKeyboard();

  Object.entries(TeamIDs).forEach(([teamName, teamId], i) => {
    kb.text(teamName, `${prefix}:${teamId}`);
    if ((i + 1) % 2 === 0) kb.row();
  });

  kb.row().text("Back", "back:start");
  return kb;
}

export function buildBackKeyboard(target: "start" | "teams" | "rosters"): InlineKeyboard {
  return new InlineKeyboard().text("Back", `back:${target}`);
}
