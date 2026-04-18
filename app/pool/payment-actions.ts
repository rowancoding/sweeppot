"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

export async function createCheckoutSession(
  _prev: { url?: string; error?: string } | null,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to join a pool." };

  const poolId     = formData.get("pool_id")     as string;
  const inviteCode = formData.get("invite_code") as string;

  if (!poolId || !inviteCode) return { error: "Invalid request." };

  // Fetch pool
  const { data: pool, error: poolErr } = await supabase
    .from("pools")
    .select("id, name, comp, status, bet_aud, player_count, invite_code")
    .eq("id", poolId)
    .single();

  if (poolErr || !pool) return { error: "Pool not found." };
  if (pool.status !== "waiting") return { error: "This pool is no longer open to join." };
  if (pool.bet_aud <= 0) return { error: "This pool is free — use the standard join flow." };

  // Check not already in pool
  const { data: existing } = await supabase
    .from("participants")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: "You are already in this pool." };

  // Check not full
  const { count } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("pool_id", poolId);

  if ((count ?? 0) >= pool.player_count) return { error: "This pool is full." };

  // Get display name
  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Player";

  // Determine currency — default AUD
  const currency = "aud";

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: `${pool.name} — Entry Fee` },
          unit_amount: Math.round(pool.bet_aud * 100), // cents
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/pool/${poolId}?payment=success`,
    cancel_url:  `${siteUrl}/join/${inviteCode}?payment=cancelled`,
    metadata: {
      pool_id:      poolId,
      user_id:      user.id,
      display_name: displayName,
    },
  });

  return { url: session.url! };
}
