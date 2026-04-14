"use client";

import { useActionState } from "react";
import { joinPool } from "@/app/pool/actions";

export default function JoinForm({ poolId, betAud }: { poolId: string; betAud: number }) {
  const [state, action, pending] = useActionState(joinPool, null);

  return (
    <form action={action}>
      <input type="hidden" name="pool_id" value={poolId} />
      {state?.error && (
        <div
          style={{
            background: "rgba(255,82,82,0.08)",
            border: "1px solid rgba(255,82,82,0.3)",
            padding: "0.6rem 0.9rem",
            fontSize: "0.8rem",
            color: "var(--red)",
            marginBottom: "0.75rem",
          }}
        >
          {state.error}
        </div>
      )}
      <button className="btn-gold" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending
          ? "Joining…"
          : betAud > 0
          ? `Pay $${betAud} AUD & Reserve Spot →`
          : "Join Free Sweepstake →"}
      </button>
      {betAud > 0 && (
        <p style={{ fontSize: "0.71rem", color: "var(--muted)", marginTop: "0.5rem", lineHeight: 1.6 }}>
          Payment held in escrow. Auto-refunded if pool doesn&apos;t fill before the deadline.
        </p>
      )}
    </form>
  );
}
