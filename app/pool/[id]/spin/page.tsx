import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { COMP_TEAMS, getPoolTeams, COMP_META } from "@/lib/teams";
import SpinWheel from "./SpinWheel";

export default async function SpinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/auth/login?next=/pool/${id}/spin`);

  // Fetch pool
  const { data: pool, error: poolErr } = await supabase
    .from("pools")
    .select("id, name, comp, stage, bet_aud, player_count, teams_per_player, status, organiser_id")
    .eq("id", id)
    .single();

  if (poolErr || !pool) notFound();

  // Only accessible when active
  if (pool.status !== "active") redirect(`/pool/${id}`);

  // Find current user's participant record
  const { data: participant } = await supabase
    .from("participants")
    .select("id, spun, display_name")
    .eq("pool_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Not a participant or already spun → back to pool page
  if (!participant) redirect(`/pool/${id}`);
  if (participant.spun) redirect(`/pool/${id}`);

  // Fetch pre-assigned teams for this participant
  const { data: rawAssignments } = await supabase
    .from("team_assignments")
    .select("team_name, team_flag, team_rank, tier")
    .eq("participant_id", participant.id)
    .order("tier", { ascending: true });

  const myTeams = (rawAssignments ?? []).map(a => ({
    n: a.team_name,
    f: a.team_flag,
    r: a.team_rank,
    tier: a.tier,
  }));

  // Build all teams for the wheel
  const cfg = COMP_TEAMS[pool.comp];
  const teamCount = cfg
    ? pool.stage === "group"
      ? cfg.group
      : cfg.ko[pool.stage] ?? 16
    : 16;

  const allTeams = getPoolTeams(pool.comp, teamCount, pool.teams_per_player);

  const meta = COMP_META[pool.comp] ?? { label: pool.comp, icon: "⚽" };
  const poolDisplayName = `${meta.icon} ${pool.name}`;

  return (
    <SpinWheel
      poolId={id}
      poolName={poolDisplayName}
      comp={pool.comp}
      playerCount={pool.player_count}
      teamsPerPlayer={pool.teams_per_player}
      allTeams={allTeams}
      myTeams={myTeams}
      displayName={participant.display_name}
    />
  );
}
