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

    // Retrieve the PaymentIntent to get payment_method and customer
    let paymentIntentId: string | null = null;
    let paymentMethodId: string | null = null;
    const customerId = typeof session.customer === "string" ? session.customer : null;
    const heldAt = new Date().toISOString();
    // Authorization holds expire after 7 days (Stripe limit)
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    if (session.payment_intent) {
      paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent.id;

      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        paymentMethodId = typeof pi.payment_method === "string"
          ? pi.payment_method
          : (pi.payment_method?.id ?? null);
      } catch {
        // Non-fatal — we still have the PI ID
      }
    }

    const isReauth = meta.reauth === "true";

    // Idempotency — skip if participant already exists and is paid (unless reauth)
    const { data: existing } = await supabase
      .from("participants")
      .select("id, paid")
      .eq("pool_id", pool_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      if (!existing.paid || isReauth) {
        await supabase
          .from("participants")
          .update({
            paid: true,
            payment_intent_id:  paymentIntentId,
            payment_method_id:  paymentMethodId,
            stripe_customer_id: customerId,
            payment_status:     "held",
            payment_held_at:    heldAt,
            payment_expires_at: expiresAt,
          })
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
            display_name:       display_name || "Player",
            paid:               true,
            spun:               false,
            payment_intent_id:  paymentIntentId,
            payment_method_id:  paymentMethodId,
            stripe_customer_id: customerId,
            payment_status:     "held",
            payment_held_at:    heldAt,
            payment_expires_at: expiresAt,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
