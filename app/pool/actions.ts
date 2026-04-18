"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { COMP_TEAMS, assignTeams } from "@/lib/teams";

// ── Helpers ───────────────────────────────────────────────────

function genInviteCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Create Pool ───────────────────────────────────────────────

export async function createPool(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a pool." };
  }

  const comp         = formData.get("comp")          as string;
  const poolName     = formData.get("pool_name")     as string;
  const stage        = formData.get("stage")         as string;
  const koRound      = formData.get("ko_round")      as string | null;
  const playerCount  = parseInt(formData.get("player_count") as string, 10);
  const entryMode    = formData.get("entry_mode")    as string;
  const betAmt       = entryMode === "free" ? 0 : parseFloat(formData.get("bet_amt") as string);
  const visibility   = formData.get("visibility")    as string;
  const customExpiry = formData.get("custom_expiry") as string;
  const drawMode     = formData.get("draw_mode")     as string;

  const cfg = COMP_TEAMS[comp];
  if (!cfg) return { error: "Invalid competition." };

  const teamCount =
    stage === "group" ? cfg.group : cfg.ko[koRound ?? "r16"] ?? 16;

  if (teamCount % playerCount !== 0) {
    return { error: "Player count must divide evenly into team count." };
  }
  if (entryMode === "paid" && (isNaN(betAmt) || betAmt < 1)) {
    return { error: "Entry fee must be at least $1." };
  }

  const teamsPerPlayer = teamCount / playerCount;

  let expiresAt: string | null = null;
  if (customExpiry && customExpiry !== "none") {
    const ms: Record<string, number> = {
      "24h":  24 * 3600 * 1000,
      "48h":  48 * 3600 * 1000,
      "7d":   7  * 86400 * 1000,
      "30d":  30 * 86400 * 1000,
    };
    expiresAt = new Date(Date.now() + (ms[customExpiry] ?? 0)).toISOString();
  }

  const compLabels: Record<string, string> = {
    wc2026:    "FIFA World Cup 2026",
    ucl2526:   "UEFA Champions League",
    euros2028: "UEFA Euros 2028",
  };
  const name       = poolName?.trim() || compLabels[comp] || comp;
  const stageStr   = stage === "group" ? "group" : (koRound ?? "r16");
  const inviteCode = genInviteCode();

  const { data: pool, error: poolErr } = await supabase
    .from("pools")
    .insert({
      name,
      comp,
      stage:            stageStr,
      bet_aud:          betAmt,
      player_count:     playerCount,
      teams_per_player: teamsPerPlayer,
      status:           "waiting",
      visibility:       visibility || "private",
      organiser_id:     user.id,
      expires_at:       expiresAt,
      invite_code:      inviteCode,
      draw_mode:        drawMode || "automatic",
    })
    .select("id")
    .single();

  if (poolErr || !pool) {
    return { error: poolErr?.message ?? "Failed to create pool." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Organiser";

  const { error: partErr } = await supabase.from("participants").insert({
    pool_id:      pool.id,
    user_id:      user.id,
    display_name: displayName,
    paid:         true,
    spun:         false,
  });

  if (partErr) {
    return { error: partErr.message };
  }

  redirect(`/pool/${pool.id}`);
}

// ── Join Pool ─────────────────────────────────────────────────

export async function joinPool(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to join a pool." };
  }

  const poolId = formData.get("pool_id") as string;
  if (!poolId) return { error: "Invalid pool." };

  // Fetch pool to check it's joinable
  const { data: pool, error: poolErr } = await supabase
    .from("pools")
    .select("id, status, player_count")
    .eq("id", poolId)
    .single();

  if (poolErr || !pool) return { error: "Pool not found." };
  if (pool.status !== "waiting") return { error: "This pool is no longer open to join." };

  // Check not already a participant
  const { data: existing } = await supabase
    .from("participants")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) redirect(`/pool/${poolId}`);

  // Count current participants
  const { count } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("pool_id", poolId);

  if ((count ?? 0) >= pool.player_count) {
    return { error: "This pool is full." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Player";

  const { error: insertErr } = await supabase.from("participants").insert({
    pool_id:      poolId,
    user_id:      user.id,
    display_name: displayName,
    paid:         true,   // TODO: replace with Stripe payment gate
    spun:         false,
  });

  if (insertErr) return { error: insertErr.message };

  redirect(`/pool/${poolId}`);
}

// ── Start Draw ────────────────────────────────────────────────

export async function startDraw(poolId: string): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Fetch pool
  const { data: pool, error: poolErr } = await supabase
    .from("pools")
    .select("id, comp, stage, player_count, teams_per_player, status, organiser_id")
    .eq("id", poolId)
    .single();

  if (poolErr || !pool) return { error: "Pool not found." };
  if (pool.organiser_id !== user.id) return { error: "Only the organiser can start the draw." };
  if (pool.status !== "waiting") return { error: "Draw has already been triggered." };

  // Fetch paid participants
  const { data: participants, error: partErr } = await supabase
    .from("participants")
    .select("id, display_name, paid")
    .eq("pool_id", poolId)
    .order("joined_at", { ascending: true });

  if (partErr || !participants) return { error: "Could not load participants." };

  const paid = participants.filter((p) => p.paid);
  if (paid.length < 4) {
    return { error: "At least 4 paid players must have joined before the draw can start." };
  }

  // Determine team count
  const cfg = COMP_TEAMS[pool.comp];
  if (!cfg) return { error: "Unknown competition." };

  const teamCount =
    pool.stage === "group"
      ? cfg.group
      : cfg.ko[pool.stage] ?? 16;

  // Assign teams — use only the paid participants
  const assignments = assignTeams(
    paid.map((p) => p.id),
    pool.comp,
    teamCount,
    pool.teams_per_player,
  );

  // Build team_assignments rows
  const rows = assignments.flatMap(({ participantId, teams }) =>
    teams.map((t) => ({
      pool_id:        poolId,
      participant_id: participantId,
      team_name:      t.n,
      team_flag:      t.f,
      team_rank:      t.r,
      tier:           t.tier,
    }))
  );

  const { error: insertErr } = await supabase
    .from("team_assignments")
    .insert(rows);

  if (insertErr) return { error: insertErr.message };

  // Update pool status to active
  const { error: updateErr } = await supabase
    .from("pools")
    .update({ status: "active" })
    .eq("id", poolId);

  if (updateErr) return { error: updateErr.message };

  redirect(`/pool/${poolId}`);
}

// ── Mark Spun ─────────────────────────────────────────────────

export async function markSpun(poolId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Verify pool is active
  const { data: pool } = await supabase
    .from("pools")
    .select("status")
    .eq("id", poolId)
    .single();

  if (pool?.status !== "active") return { error: "Pool is not active." };

  // Find participant — reject if already spun (server enforces one-spin-only)
  const { data: participant } = await supabase
    .from("participants")
    .select("id, spun")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .single();

  if (!participant) return { error: "Not a participant." };
  if (participant.spun) return { error: "You have already spun for this pool." };

  const { error } = await supabase
    .from("participants")
    .update({ spun: true })
    .eq("id", participant.id);

  if (error) return { error: error.message };
  return {};
}
