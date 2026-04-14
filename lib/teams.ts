export interface Team {
  n: string;   // name
  f: string;   // flag emoji
  r: number;   // rank / seed
}

// All teams ordered by seeding / ranking.
// Used server-side for the draw — slice to the team count the pool uses.
export const TEAMS: Record<string, Team[]> = {
  wc2026: [
    {n:"France",f:"🇫🇷",r:1},{n:"Brazil",f:"🇧🇷",r:2},{n:"England",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:3},{n:"Portugal",f:"🇵🇹",r:4},
    {n:"Spain",f:"🇪🇸",r:5},{n:"Argentina",f:"🇦🇷",r:6},{n:"Germany",f:"🇩🇪",r:7},{n:"Netherlands",f:"🇳🇱",r:8},
    {n:"USA",f:"🇺🇸",r:9},{n:"Croatia",f:"🇭🇷",r:10},{n:"Switzerland",f:"🇨🇭",r:11},{n:"Mexico",f:"🇲🇽",r:12},
    {n:"Japan",f:"🇯🇵",r:13},{n:"Morocco",f:"🇲🇦",r:14},{n:"Australia",f:"🇦🇺",r:15},{n:"South Korea",f:"🇰🇷",r:16},
    {n:"Colombia",f:"🇨🇴",r:17},{n:"Senegal",f:"🇸🇳",r:18},{n:"Ukraine",f:"🇺🇦",r:19},{n:"Iran",f:"🇮🇷",r:20},
    {n:"Ecuador",f:"🇪🇨",r:21},{n:"Hungary",f:"🇭🇺",r:22},{n:"Algeria",f:"🇩🇿",r:23},{n:"Denmark",f:"🇩🇰",r:24},
    {n:"Poland",f:"🇵🇱",r:25},{n:"Serbia",f:"🇷🇸",r:26},{n:"Sweden",f:"🇸🇪",r:27},{n:"Turkey",f:"🇹🇷",r:28},
    {n:"Chile",f:"🇨🇱",r:29},{n:"Romania",f:"🇷🇴",r:30},{n:"Norway",f:"🇳🇴",r:31},{n:"Qatar",f:"🇶🇦",r:32},
    {n:"Costa Rica",f:"🇨🇷",r:33},{n:"Slovakia",f:"🇸🇰",r:34},{n:"Greece",f:"🇬🇷",r:35},{n:"Egypt",f:"🇪🇬",r:36},
    {n:"Ghana",f:"🇬🇭",r:37},{n:"Cameroon",f:"🇨🇲",r:38},{n:"Paraguay",f:"🇵🇾",r:39},{n:"New Zealand",f:"🇳🇿",r:40},
    {n:"Canada",f:"🇨🇦",r:41},{n:"Saudi Arabia",f:"🇸🇦",r:42},{n:"Uruguay",f:"🇺🇾",r:43},{n:"Nigeria",f:"🇳🇬",r:44},
    {n:"Panama",f:"🇵🇦",r:45},{n:"South Africa",f:"🇿🇦",r:46},{n:"Honduras",f:"🇭🇳",r:47},{n:"Jamaica",f:"🇯🇲",r:48},
  ],
  ucl2526: [
    {n:"Man City",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:1},{n:"Real Madrid",f:"🇪🇸",r:2},{n:"Bayern Munich",f:"🇩🇪",r:3},{n:"PSG",f:"🇫🇷",r:4},
    {n:"Liverpool",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:5},{n:"Barcelona",f:"🇪🇸",r:6},{n:"Chelsea",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:7},{n:"Atlético",f:"🇪🇸",r:8},
    {n:"Arsenal",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:9},{n:"Leverkusen",f:"🇩🇪",r:10},{n:"Inter Milan",f:"🇮🇹",r:11},{n:"Juventus",f:"🇮🇹",r:12},
    {n:"Dortmund",f:"🇩🇪",r:13},{n:"Porto",f:"🇵🇹",r:14},{n:"Ajax",f:"🇳🇱",r:15},{n:"Benfica",f:"🇵🇹",r:16},
    {n:"Atalanta",f:"🇮🇹",r:17},{n:"Tottenham",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:18},{n:"AC Milan",f:"🇮🇹",r:19},{n:"Napoli",f:"🇮🇹",r:20},
    {n:"Villarreal",f:"🇪🇸",r:21},{n:"Salzburg",f:"🇦🇹",r:22},{n:"Shakhtar",f:"🇺🇦",r:23},{n:"PSV",f:"🇳🇱",r:24},
    {n:"Copenhagen",f:"🇩🇰",r:25},{n:"Celtic",f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",r:26},{n:"Galatasaray",f:"🇹🇷",r:27},{n:"Feyenoord",f:"🇳🇱",r:28},
    {n:"Braga",f:"🇵🇹",r:29},{n:"Lazio",f:"🇮🇹",r:30},{n:"Newcastle",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:31},{n:"Lens",f:"🇫🇷",r:32},
    {n:"Union Berlin",f:"🇩🇪",r:33},{n:"Real Sociedad",f:"🇪🇸",r:34},{n:"Antwerp",f:"🇧🇪",r:35},{n:"Young Boys",f:"🇨🇭",r:36},
  ],
  euros2028: [
    {n:"France",f:"🇫🇷",r:1},{n:"England",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:2},{n:"Spain",f:"🇪🇸",r:3},{n:"Germany",f:"🇩🇪",r:4},
    {n:"Portugal",f:"🇵🇹",r:5},{n:"Netherlands",f:"🇳🇱",r:6},{n:"Belgium",f:"🇧🇪",r:7},{n:"Italy",f:"🇮🇹",r:8},
    {n:"Croatia",f:"🇭🇷",r:9},{n:"Denmark",f:"🇩🇰",r:10},{n:"Austria",f:"🇦🇹",r:11},{n:"Switzerland",f:"🇨🇭",r:12},
    {n:"Poland",f:"🇵🇱",r:13},{n:"Ukraine",f:"🇺🇦",r:14},{n:"Serbia",f:"🇷🇸",r:15},{n:"Turkey",f:"🇹🇷",r:16},
    {n:"Norway",f:"🇳🇴",r:17},{n:"Czech Rep",f:"🇨🇿",r:18},{n:"Hungary",f:"🇭🇺",r:19},{n:"Scotland",f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",r:20},
    {n:"Romania",f:"🇷🇴",r:21},{n:"Slovakia",f:"🇸🇰",r:22},{n:"Wales",f:"🏴󠁧󠁢󠁷󠁬󠁳󠁿",r:23},{n:"Greece",f:"🇬🇷",r:24},
  ],
};

// Knockout team counts per comp+round
export const COMP_TEAMS: Record<string, { group: number; ko: Record<string, number> }> = {
  wc2026:    { group: 48, ko: { r32: 32, r16: 16, qf: 8, sf: 4 } },
  ucl2526:   { group: 36, ko: { r16: 16, qf: 8, sf: 4 } },
  euros2028: { group: 24, ko: { r16: 16, qf: 8, sf: 4 } },
};

export const COMP_META: Record<string, { label: string; icon: string; ranking: string }> = {
  wc2026:    { label: "FIFA World Cup 2026",     icon: "🌍", ranking: "FIFA World Ranking" },
  ucl2526:   { label: "UEFA Champions League",   icon: "⭐", ranking: "UEFA Club Coefficient" },
  euros2028: { label: "UEFA Euros 2028",          icon: "🏆", ranking: "UEFA Nations League Ranking" },
};

/**
 * Get the team list for a pool, sliced to `teamCount` and tiered.
 * Returns teams with an added `tier` field (1 = top seed tier).
 */
export function getPoolTeams(
  comp: string,
  teamCount: number,
  teamsPerPlayer: number,
): (Team & { tier: number })[] {
  const base = TEAMS[comp] ?? TEAMS["wc2026"];
  const slice = base.slice(0, teamCount);
  const tierSize = teamCount / teamsPerPlayer;
  return slice.map((t, i) => ({ ...t, tier: Math.floor(i / tierSize) + 1 }));
}

/**
 * Fisher-Yates shuffle — mutates array in place, returns it.
 */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Assign teams to participants using tier-balanced draw.
 * Each participant gets `teamsPerPlayer` teams, one from each tier.
 * Returns array of { participantId, teams[] } in original participant order.
 */
export function assignTeams(
  participantIds: string[],
  comp: string,
  teamCount: number,
  teamsPerPlayer: number,
): { participantId: string; teams: (Team & { tier: number })[] }[] {
  const tieredTeams = getPoolTeams(comp, teamCount, teamsPerPlayer);

  // Group into tiers and shuffle each tier independently
  const tierBuckets: Map<number, (Team & { tier: number })[]> = new Map();
  for (const t of tieredTeams) {
    if (!tierBuckets.has(t.tier)) tierBuckets.set(t.tier, []);
    tierBuckets.get(t.tier)!.push(t);
  }
  for (const [tier, bucket] of tierBuckets) {
    tierBuckets.set(tier, shuffle([...bucket]));
  }

  // Assign one team per tier per participant
  const tiers = Array.from(tierBuckets.keys()).sort();
  return participantIds.map((participantId, idx) => {
    const teams = tiers.map((tier) => tierBuckets.get(tier)![idx]);
    return { participantId, teams };
  });
}
