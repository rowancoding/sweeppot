import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  sendPaymentRequiredEmail,
  sendSpotReleasedEmail,
  sendWaitlistNotificationEmail,
} from "@/lib/email";

export const runtime = "nodejs";

// Runs daily. Handles two cases:
// 1. Participants whose hold is expiring in ≤1 day — attempt off-session re-auth
// 2. Participants in payment_required status for >48h — release spot

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const now      = new Date();

  // ── 1. Re-authorise holds expiring within 24 hours ─────────────
  const oneDayFromNow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

  const { data: expiringParts } = await supabase
    .from("participants")
    .select(`
      id, user_id, display_name, payment_intent_id, payment_method_id,
      stripe_customer_id, pool_id,
      pools ( id, name, status, invite_code, bet_aud )
    `)
    .eq("payment_status", "held")
    .lt("payment_expires_at", oneDayFromNow)
    .not("payment_intent_id", "is", null);

  for (const part of expiringParts ?? []) {
    const pool = Array.isArray(part.pools) ? part.pools[0] : part.pools;
    if (!pool || pool.status !== "waiting") continue;
    if (!part.stripe_customer_id || !part.payment_method_id) continue;

    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

    try {
      // Create a new off-session PaymentIntent for the same amount
      const amountCents = Math.round(pool.bet_aud * 100);
      const pi = await stripe.paymentIntents.create({
        amount:          amountCents,
        currency:        "aud",
        customer:        part.stripe_customer_id,
        payment_method:  part.payment_method_id,
        capture_method:  "manual",
        confirm:         true,
        off_session:     true,
      });

      // Cancel old hold, store new one
      try {
        await stripe.paymentIntents.cancel(part.payment_intent_id as string);
      } catch {
        // Old PI may already be in an uncancellable state — ignore
      }

      await supabase
        .from("participants")
        .update({
          payment_intent_id:  pi.id,
          payment_status:     "held",
          payment_held_at:    now.toISOString(),
          payment_expires_at: newExpiresAt,
        })
        .eq("id", part.id);
    } catch {
      // Re-auth failed — mark payment_required and notify player
      await supabase
        .from("participants")
        .update({
          payment_status:       "payment_required",
          payment_required_at:  now.toISOString(),
        })
        .eq("id", part.id);

      const { data: authUser } = await supabase.auth.admin.getUserById(part.user_id);
      const email = authUser?.user?.email;
      if (email) {
        await sendPaymentRequiredEmail({
          to: email,
          displayName: part.display_name,
          poolName: pool.name,
          poolId: pool.id,
        });
      }
    }
  }

  // ── 2. Release spots where payment_required >48 hours ago ──────
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();

  const { data: staleParts } = await supabase
    .from("participants")
    .select(`
      id, user_id, display_name, pool_id,
      pools ( id, name, status, invite_code, organiser_id )
    `)
    .eq("payment_status", "payment_required")
    .lt("payment_required_at", fortyEightHoursAgo);

  for (const part of staleParts ?? []) {
    const pool = Array.isArray(part.pools) ? part.pools[0] : part.pools;
    if (!pool || pool.status !== "waiting") continue;

    // Remove the participant (release spot)
    await supabase
      .from("participants")
      .delete()
      .eq("id", part.id);

    // Notify the player
    const { data: authUser } = await supabase.auth.admin.getUserById(part.user_id);
    const email = authUser?.user?.email;
    if (email) {
      await sendSpotReleasedEmail({
        to: email,
        displayName: part.display_name,
        poolName: pool.name,
      });
    }

    // Notify waitlisted users (any user who has viewed the join page is a
    // candidate — for now we notify the organiser who can re-share the link)
    const { data: organiserAuth } = await supabase.auth.admin.getUserById(pool.organiser_id);
    const organiserEmail = organiserAuth?.user?.email;
    if (organiserEmail && organiserAuth?.user?.id !== part.user_id) {
      await sendWaitlistNotificationEmail({
        to: organiserEmail,
        displayName: "there",
        poolName: pool.name,
        inviteCode: pool.invite_code,
      });
    }
  }

  return NextResponse.json({
    reauthorised: (expiringParts ?? []).length,
    released:     (staleParts ?? []).length,
  });
}
