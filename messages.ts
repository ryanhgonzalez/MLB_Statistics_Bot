// messages.ts
import { TeamAbbreviations, TeamNamesById } from "./constants.js";
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
    if (status === "Final" || status === "In Progress" || status === "Game Over") {
      line = `• [${status}] ${away} ${awayScore} @ ${home} ${homeScore}`;
    } else if (status === "Scheduled" || status === "Pre-Game") {
      const startTime = formatToChicagoTime(game.gameDate);
      line = `• [${status}] ${away} @ ${home} (${startTime})`;
    } else {
      line = `• [${status}] ${away} @ ${home}`;
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
    message += `${bucket} CT\n`;
    message += buckets[bucket].join("\n") + "\n\n";
  }

  return message.trim();
}

export function buildStandingsMessage(records: any[], date?: Date): string {
  if (!records?.length) {
    return `No standings data available${
      date ? " for " + date.toISOString().split("T")[0] : ""
    }.`;
  }

  let message = `📊 Latest Division Standings ${date ? `(${date.toISOString().split("T")[0]})` : ""}\n\n`;

  for (const record of records) {
    const divisionId = record.division?.id;
    let divisionName = "Unknown Division";

    if (divisionId && record.teamRecords?.length > 0) {
      const sampleTeam = record.teamRecords[0];
      const foundDivision = sampleTeam.records?.divisionRecords?.find(
        (dr: any) => dr.division?.id === divisionId
      );
      if (foundDivision?.division?.name) {
        divisionName = foundDivision.division.name;
      }
    }

    message += `🏅 ${divisionName}\n`;

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

  const { teamRecord } = details;

  const teamName = teamRecord.team?.name ?? "Unknown Team";
  const wins = teamRecord.wins ?? "N/A";
  const losses = teamRecord.losses ?? "N/A";
  const wp = teamRecord.winningPercentage ?? "N/A";
  const gb = teamRecord.gamesBack ?? "N/A";
  const wcgb = teamRecord.wildCardGamesBack ?? "N/A";
  const streak = teamRecord.streak?.streakCode ?? "N/A";
  const divRank = teamRecord.divisionRank ?? "N/A";
  const leagueRank = teamRecord.leagueRank ?? "N/A";
  const runDiff = teamRecord.runDifferential ?? "N/A";

  // --- Pull splitRecords for home/away/lastTen ---
  const splitRecords = teamRecord.records?.splitRecords ?? [];
  const homeRecord = splitRecords.find((r: { type: string; }) => r.type === "home");
  const awayRecord = splitRecords.find((r: { type: string; }) => r.type === "away");
  const lastTenRecord = splitRecords.find((r: { type: string; }) => r.type === "lastTen");

  const homeWins = homeRecord?.wins ?? "N/A";
  const homeLosses = homeRecord?.losses ?? "N/A";
  const awayWins = awayRecord?.wins ?? "N/A";
  const awayLosses = awayRecord?.losses ?? "N/A";
  const lastTenWins = lastTenRecord?.wins ?? "N/A";
  const lastTenLosses = lastTenRecord?.losses ?? "N/A";
  const lastTenPct = lastTenRecord?.pct ?? "N/A";

  return `📊 ${teamName} Stats
  
• Record: ${wins}-${losses} (${wp})
• Games Back: ${gb} | Wild Card GB: ${wcgb}
• Streak: ${streak}
• Home: ${homeWins}-${homeLosses}
• Away: ${awayWins}-${awayLosses}
• Division Rank: ${divRank}
• League Rank: ${leagueRank}
• Run Differential: ${runDiff}
• Last 10: ${lastTenWins}-${lastTenLosses} (${lastTenPct})`;
}

export function buildTeamRosterMessage(teamId: number, rosterData: any): string {
  const teamName = TeamNamesById[teamId] ?? `Team ${teamId}`;
  const roster = rosterData?.roster ?? [];

  if (!roster.length) {
    return `No active roster found for ${teamName}.`;
  }

  // Group players by position type
  const grouped: Record<string, any[]> = {};
  for (const player of roster) {
    const pos = player.position?.type ?? "Unknown";
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(player);
  }

  let message = `📋 Roster for ${teamName} (${rosterData.rosterType?.toUpperCase() ?? "UNKNOWN"})\n\n`;

  for (const [position, players] of Object.entries(grouped)) {
    message += `🏅 ${position}\n`;
    for (const p of players) {
      message += `• #${p.jerseyNumber ?? "??"} ${p.person?.fullName ?? "Unknown"} (${p.position?.abbreviation ?? ""})\n`;
    }
    message += "\n";
  }

  return message.trim();
}