import { InlineKeyboard } from "grammy";
import { LeagueIDs, TeamIDs } from "./constants.js";

export function buildStartKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text("Get Today's Schedule", "scores")
        .row()
        .text("Get Latest Standings", "standings_menu")
        .row()
        .text("Get Team Details", "teams");
}

// Build navigation keyboard for getGamesMessage() function. 
export function buildGamesScheduleKeyboard(date: Date): InlineKeyboard {
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

// Build navigation keyboard for getStandingsMessage() function. 
export function buildStandingsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("American League", `standings:${LeagueIDs["AL"]}`)
    .text("National League", `standings:${LeagueIDs["NL"]}`);
}

export function buildTeamsKeyboard(): InlineKeyboard {
    const kb = new InlineKeyboard();
    Object.keys(TeamIDs).forEach((teamName, i) => {
        kb.text(teamName, `team:${TeamIDs[teamName]}`);
        if ((i + 1) % 2 === 0) kb.row(); // 2 columns
    });
    return kb;
}
