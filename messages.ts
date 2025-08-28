// messages.ts
import { TeamAbbreviations } from "./constants.js";
import { formatToHourBucket, formatToChicagoTime } from "./formatters.js";

export function buildGamesScheduleMessage(dateStr: string, games: any[]): string {
  const buckets: Record<string, string[]> = {};

  for (const game of games) {
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

    const bucket = formatToHourBucket(game.gameDate);
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(line);
  }

  let message = `⚾ MLB Games for ${dateStr}\n\n`;
  for (const bucket of Object.keys(buckets).sort((a, b) => {
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

// Fetch standings for a given league (103 = AL, 104 = NL)
export function buildStandingsMessage(records: any[], date?: Date): string {
  if (!records?.length) return `No standings data available${date ? " for " + date.toISOString().split("T")[0] : ""}.`;

  let message = `📊 Standings ${date ? `(${date.toISOString().split("T")[0]})` : ""}\n\n`;

  for (const record of records) {
    message += `🏆 ${record.division.name}\n`;
    for (const teamRecord of record.teamRecords) {
      const team = teamRecord.team.name;
      const wins = teamRecord.wins;
      const losses = teamRecord.losses;
      const pct = teamRecord.winningPercentage;
      message += `   • ${team}: ${wins}-${losses} (${pct})\n`;
    }
    message += "\n";
  }

  return message.trim();
}

// messages.ts
export function buildTeamDetailsMessage(details: any): string {
  if (!details || !details.teamRecord) return "No data available for this team.";

  const { teamRecord, divisionName, leagueName } = details;

  const teamName = teamRecord.team?.name ?? "Unknown Team";
  const wins = teamRecord.wins ?? "N/A";
  const losses = teamRecord.losses ?? "N/A";
  const wp = teamRecord.winningPercentage ?? "N/A";
  const gb = teamRecord.gamesBack ?? "N/A";
  const wcgb = teamRecord.wildCardGamesBack ?? "N/A";
  const streak = teamRecord.streak?.streakCode ?? "N/A";
  const homeWins = teamRecord.home?.wins ?? "N/A";
  const homeLosses = teamRecord.home?.losses ?? "N/A";
  const awayWins = teamRecord.away?.wins ?? "N/A";
  const awayLosses = teamRecord.away?.losses ?? "N/A";
  const divRank = teamRecord.divisionRank ?? "N/A";
  const leagueRank = teamRecord.leagueRank ?? "N/A";
  const runDiff = teamRecord.runDifferential ?? "N/A";
  const lastTen = teamRecord.lastTen ?? "N/A";

  return `📊 ${teamName} Stats
🏆 League: ${leagueName}
📍 Division: ${divisionName}

💪 Record: ${wins}-${losses} (${wp})
📊 Games Back: ${gb} | Wild Card GB: ${wcgb}
🔥 Streak: ${streak}
🏠 Home: ${homeWins}-${homeLosses}
✈️ Away: ${awayWins}-${awayLosses}
🏅 Division Rank: ${divRank}
🏆 League Rank: ${leagueRank}
⚡ Run Differential: ${runDiff}
📅 Last 10: ${lastTen}`;
}



