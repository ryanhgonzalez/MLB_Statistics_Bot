import MLBStatsAPI from "mlb-stats-api";
import { MLBSportID, LeagueIDs } from "./constants.js";


const mlb = new MLBStatsAPI();

export async function fetchGamesSchedule(date: Date) {
  const dateStr = date.toISOString().split("T")[0];
  const response = await mlb.getSchedule({ params: { sportId: MLBSportID, date: dateStr } });
  const dates = response.data?.dates;
  const games = dates?.[0]?.games ?? [];
  return { dateStr, games };
}

export async function fetchTeamStandings(leagueId: number, date?: Date) {
  const params: Record<string, any> = { leagueId };
  if (date) params.date = date.toISOString().split("T")[0];
  const response = await mlb.getStandings({ params });
  return response.data.records ?? [];
}

export async function fetchTeamDetails(teamId: number) {
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

export async function fetchTeamRoster(teamId: number) {
  const response = await mlb.getTeamRoster({ pathParams: { teamId } });
  return response.data ?? response;
}