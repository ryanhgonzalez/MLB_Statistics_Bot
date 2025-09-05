import { InlineKeyboard } from "grammy";
import { LeagueIDs, TeamIDs } from "./constants.js";

// Start menu keyboard
export function buildStartKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text("Get Today's Schedule", "scores")
        .row()
        .text("Get Latest Standings", "standings_menu")
        .row()
        .text("Get Team Details", "teams");
}

// Schedule navigation keyboard (Yesterday/Today/Tomorrow/Refresh) + Back
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
        .text("🔄 Refresh", `refresh:${date.toISOString().split("T")[0]}`)
        .row()
        .text("⬅ Back", "back:start"); // Back to main menu
}

// Standings navigation keyboard + Back
export function buildStandingsKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text("American League", `standings:${LeagueIDs["AL"]}`)
        .text("National League", `standings:${LeagueIDs["NL"]}`)
        .row()
        .text("⬅ Back", "back:start"); // Back to main menu
}

// Teams keyboard + Back
export function buildTeamsKeyboard(): InlineKeyboard {
    const kb = new InlineKeyboard();
    Object.keys(TeamIDs).forEach((teamName, i) => {
        kb.text(teamName, `team:${TeamIDs[teamName]}`);
        if ((i + 1) % 2 === 0) kb.row(); // 2 columns
    });
    kb.row().text("⬅ Back", "back:start"); // Back to main menu
    return kb;
}
