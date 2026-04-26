import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "https://api.football-data.org/v4";

// Fetch Champions League knockout-round teams by scraping the R16 matches
async function getCLTeams(apiKey: string): Promise<string[]> {
  // Try round of 16 matches first to get the actual knockout teams
  const r16Res = await fetch(`${BASE_URL}/competitions/CL/matches?stage=ROUND_OF_16`, {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 3600 },
  });
  if (r16Res.ok) {
    const data = await r16Res.json();
    const teams = new Set<string>();
    for (const match of data.matches ?? []) {
      const home = match.homeTeam?.shortName || match.homeTeam?.name;
      const away = match.awayTeam?.shortName || match.awayTeam?.name;
      if (home) teams.add(home);
      if (away) teams.add(away);
    }
    if (teams.size >= 8) return [...teams];
  }

  // Fall back to all CL teams (new 36-team format), capped at 16
  const allRes = await fetch(`${BASE_URL}/competitions/CL/teams`, {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 3600 },
  });
  if (!allRes.ok) throw new Error("CL fetch failed");
  const data = await allRes.json();
  return (data.teams ?? [])
    .slice(0, 16)
    .map((t: { shortName?: string; name: string }) => t.shortName || t.name);
}

async function getPLTeams(apiKey: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/competitions/PL/teams?season=2024`, {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 86400 }, // PL teams don't change mid-season
  });
  if (!res.ok) throw new Error("PL fetch failed");
  const data = await res.json();
  return (data.teams ?? []).map(
    (t: { shortName?: string; name: string }) => t.shortName || t.name
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }

  try {
    let teams: string[] = [];
    if (competition === "CL") {
      teams = await getCLTeams(apiKey);
    } else if (competition === "PL") {
      teams = await getPLTeams(apiKey);
    } else {
      return NextResponse.json({ error: "Unknown competition" }, { status: 400 });
    }
    return NextResponse.json({ teams });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
