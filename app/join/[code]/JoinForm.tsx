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

  const processingFee = +(betAud * 0.029 + 0.30).toFixed(2);
  const total = +(betAud + processingFee).toFixed(2);

  return (
    <form action={action}>
      <input type="hidden" name="pool_id"     value={poolId} />
      <input type="hidden" name="invite_code" value={inviteCode} />
      {state?.error && <ErrorBox msg={state.error} />}

      {/* Fee breakdown */}
      <div style={{
        background: "var(--dark3)", border: "1px solid var(--border)",
        padding: "0.75rem 0.9rem", marginBottom: "0.75rem", fontSize: "0.78rem", lineHeight: 1.8,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>Entry fee</span>
          <span>${betAud.toFixed(2)} AUD</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>Processing fee (2.9% + $0.30)</span>
          <span>${processingFee.toFixed(2)} AUD</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", marginTop: "0.4rem", paddingTop: "0.4rem", fontWeight: 700 }}>
          <span>Total charged today</span>
          <span>${total.toFixed(2)} AUD</span>
        </div>
      </div>

      <button className="btn-gold" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending || state?.url
          ? "Redirecting to payment…"
          : `Pay $${total.toFixed(2)} AUD & Reserve Spot →`}
      </button>
      <p style={{ fontSize: "0.71rem", color: "var(--muted)", marginTop: "0.5rem", lineHeight: 1.6 }}>
        Your card won&apos;t be charged until the pool is full. If the pool doesn&apos;t fill before the deadline, your hold is released automatically — no charge made.
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
