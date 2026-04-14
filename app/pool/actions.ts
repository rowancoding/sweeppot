"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

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

  const comp        = formData.get("comp")         as string;
  const poolName    = formData.get("pool_name")    as string;
  const stage       = formData.get("stage")        as string;
  const koRound     = formData.get("ko_round")     as string | null;
  const playerCount = parseInt(formData.get("player_count") as string, 10);
  const entryMode   = formData.get("entry_mode")   as string;
  const betAmt      = entryMode === "free" ? 0 : parseFloat(formData.get("bet_amt") as string);
  const visibility  = formData.get("visibility")   as string;
  const customExpiry = formData.get("custom_expiry") as string;
  const drawMode    = formData.get("draw_mode")    as string;

  // Derive team count and teams-per-player
  const COMP_TEAMS: Record<string, { group: number; ko: Record<string, number> }> = {
    wc2026:    { group: 48, ko: { r32: 32, r16: 16, qf: 8, sf: 4 } },
    ucl2526:   { group: 36, ko: { r16: 16, qf: 8, sf: 4 } },
    euros2028: { group: 24, ko: { r16: 16, qf: 8, sf: 4 } },
  };

  const cfg = COMP_TEAMS[comp];
  if (!cfg) return { error: "Invalid competition." };

  const teamCount =
    stage === "group"
      ? cfg.group
      : cfg.ko[koRound ?? "r16"] ?? 16;

  if (teamCount % playerCount !== 0) {
    return { error: "Player count must divide evenly into team count." };
  }
  if (entryMode === "paid" && (isNaN(betAmt) || betAmt < 1)) {
    return { error: "Entry fee must be at least $1." };
  }

  const teamsPerPlayer = teamCount / playerCount;

  // Compute expires_at
  let expiresAt: string | null = null;
  if (customExpiry && customExpiry !== "none") {
    const ms: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "48h": 48 * 60 * 60 * 1000,
      "7d":  7  * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    expiresAt = new Date(Date.now() + (ms[customExpiry] ?? 0)).toISOString();
  }

  const compLabels: Record<string, string> = {
    wc2026:    "FIFA World Cup 2026",
    ucl2526:   "UEFA Champions League",
    euros2028: "UEFA Euros 2028",
  };
  const name = poolName?.trim() || compLabels[comp] || comp;

  // Build stage string for DB
  const stageStr = stage === "group" ? "group" : (koRound ?? "r16");

  // Insert pool
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
    })
    .select("id")
    .single();

  if (poolErr || !pool) {
    return { error: poolErr?.message ?? "Failed to create pool." };
  }

  // Get organiser display name
  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Organiser";

  // Insert organiser as first participant (paid = true, organiser pays no fee)
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

  redirect("/");
}
