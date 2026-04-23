"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

function processingFee(amountAud: number): number {
  return Math.round(amountAud * 0.029 * 100 + 30); // cents
}

export async function createReauthorizeSession(
  _prev: { url?: string; error?: string } | null,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const poolId     = formData.get("pool_id")     as string;
  const inviteCode = formData.get("invite_code") as string;

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, status, bet_aud")
    .eq("id", poolId)
    .single();

  if (!pool) return { error: "Pool not found." };
  if (pool.status !== "waiting") return { error: "This pool is no longer open." };

  const { data: participant } = await supabase
    .from("participants")
    .select("id, payment_status")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) return { error: "You are not a participant in this pool." };
  if (participant.payment_status !== "payment_required") {
    return { error: "No payment update is required for your spot." };
  }

  const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";

  const entryAmountCents = Math.round(pool.bet_aud * 100);
  const feeAmountCents   = processingFee(pool.bet_aud);

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Player";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_creation: "always",
    payment_intent_data: {
      capture_method: "manual",
      setup_future_usage: "off_session",
    },
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: { name: `${pool.name} — Entry Fee (Re-authorisation)` },
          unit_amount: entryAmountCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "aud",
          product_data: { name: "Stripe Processing Fee" },
          unit_amount: feeAmountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/pool/${poolId}?payment=success`,
    cancel_url:  `${siteUrl}/pool/${poolId}/update-payment?payment=cancelled`,
    metadata: {
      pool_id:      poolId,
      user_id:      user.id,
      display_name: displayName,
      reauth:       "true",
    },
  });

  return { url: session.url! };
}
