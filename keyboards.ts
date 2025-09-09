import { InlineKeyboard } from "grammy";
import { TeamIDs } from "./constants.js";

// Start menu keyboard
export function buildStartKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
        .text("Get Today's Schedule", "scores")
        .row()
        .text("Get Latest Standings", "standings")
        .row()
        .text("Get Team Details", "teams")
        .row()
        .text("Get Team Roster", "rosters");
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

// Teams keyboard + Back
export function buildTeamsKeyboard(): InlineKeyboard {
    const kb = new InlineKeyboard();
    Object.keys(TeamIDs).forEach((teamName, i) => {
        kb.text(teamName, `team:${TeamIDs[teamName]}`);
        if ((i + 1) % 2 === 0) kb.row();
    });
    kb.row().text("Back", "back:start");
    return kb;
}

// Roster keyboard + Back
export function buildRosterKeyboard(): InlineKeyboard {
    const kb = new InlineKeyboard();
    Object.keys(TeamIDs).forEach((teamName, i) => {
        kb.text(teamName, `roster:${TeamIDs[teamName]}`);
        if ((i + 1) % 2 === 0) kb.row();
    });
    kb.row().text("Back", "back:start");
    return kb;
}
