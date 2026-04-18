import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Disable body parsing — Stripe needs the raw body for signature verification
export async function POST(request: Request) {
  const body = await request.text();
  const sig  = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object as Stripe.Checkout.Session;
    const meta     = session.metadata;

    if (!meta?.pool_id || !meta?.user_id) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const { pool_id, user_id, display_name } = meta;
    const supabase = createAdminClient();

    // Idempotency — skip if participant already exists and is paid
    const { data: existing } = await supabase
      .from("participants")
      .select("id, paid")
      .eq("pool_id", pool_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      if (!existing.paid) {
        await supabase
          .from("participants")
          .update({ paid: true })
          .eq("id", existing.id);
      }
    } else {
      // Verify pool is still open
      const { data: pool } = await supabase
        .from("pools")
        .select("status, player_count")
        .eq("id", pool_id)
        .single();

      if (pool?.status === "waiting") {
        // Check capacity (race-condition guard)
        const { count } = await supabase
          .from("participants")
          .select("id", { count: "exact", head: true })
          .eq("pool_id", pool_id);

        if ((count ?? 0) < (pool.player_count ?? 0)) {
          await supabase.from("participants").insert({
            pool_id,
            user_id,
            display_name: display_name || "Player",
            paid: true,
            spun: false,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
