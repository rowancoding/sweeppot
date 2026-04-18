"use client";

import { useActionState, useEffect } from "react";
import { joinPool } from "@/app/pool/actions";
import { createCheckoutSession } from "@/app/pool/payment-actions";

interface Props {
  poolId: string;
  betAud: number;
  inviteCode: string;
}

export default function JoinForm({ poolId, betAud, inviteCode }: Props) {
  return betAud > 0
    ? <PayForm poolId={poolId} betAud={betAud} inviteCode={inviteCode} />
    : <FreeJoinForm poolId={poolId} />;
}

// ── Free pool ─────────────────────────────────────────────────

function FreeJoinForm({ poolId }: { poolId: string }) {
  const [state, action, pending] = useActionState(joinPool, null);

  return (
    <form action={action}>
      <input type="hidden" name="pool_id" value={poolId} />
      {state?.error && <ErrorBox msg={state.error} />}
      <button className="btn-gold" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Joining…" : "Join Free Sweepstake →"}
      </button>
    </form>
  );
}

// ── Paid pool — Stripe Checkout ───────────────────────────────

function PayForm({ poolId, betAud, inviteCode }: Props) {
  const [state, action, pending] = useActionState(createCheckoutSession, null);

  // Redirect to Stripe once we have the checkout URL
  useEffect(() => {
    if (state?.url) {
      window.location.href = state.url;
    }
  }, [state?.url]);

  return (
    <form action={action}>
      <input type="hidden" name="pool_id"     value={poolId} />
      <input type="hidden" name="invite_code" value={inviteCode} />
      {state?.error && <ErrorBox msg={state.error} />}
      <button className="btn-gold" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending || state?.url
          ? "Redirecting to payment…"
          : `Pay $${betAud} AUD & Reserve Spot →`}
      </button>
      <p style={{ fontSize: "0.71rem", color: "var(--muted)", marginTop: "0.5rem", lineHeight: 1.6 }}>
        Secure payment via Stripe. Held in escrow — auto-refunded if the pool doesn&apos;t fill before the deadline.
      </p>
    </form>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.3)",
      padding: "0.6rem 0.9rem", fontSize: "0.8rem", color: "var(--red)", marginBottom: "0.75rem",
    }}>
      {msg}
    </div>
  );
}
