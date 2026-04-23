import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPoolExpiredEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Validate Vercel cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const now      = new Date().toISOString();

  // Find expired waiting pools
  const { data: expiredPools } = await supabase
    .from("pools")
    .select("id, name, invite_code")
    .eq("status", "waiting")
    .lt("expires_at", now)
    .not("expires_at", "is", null);

  if (!expiredPools || expiredPools.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  let cancelled = 0;

  for (const pool of expiredPools) {
    // Mark pool expired
    await supabase
      .from("pools")
      .update({ status: "expired" })
      .eq("id", pool.id);

    // Fetch participants with held PaymentIntents
    const { data: participants } = await supabase
      .from("participants")
      .select("id, user_id, display_name, payment_intent_id, payment_status")
      .eq("pool_id", pool.id)
      .eq("payment_status", "held")
      .not("payment_intent_id", "is", null);

    if (!participants) continue;

    for (const part of participants) {
      try {
        // Cancel the hold
        await stripe.paymentIntents.cancel(part.payment_intent_id as string);
        await supabase
          .from("participants")
          .update({ payment_status: "cancelled" })
          .eq("id", part.id);
        cancelled++;

        // Fetch user email for notification
        const { data: authUser } = await supabase.auth.admin.getUserById(part.user_id);
        const email = authUser?.user?.email;
        if (email) {
          await sendPoolExpiredEmail({
            to: email,
            displayName: part.display_name,
            poolName: pool.name,
          });
        }
      } catch {
        // Continue processing remaining participants
      }
    }
  }

  return NextResponse.json({ expired: expiredPools.length, cancelled });
}
