"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { createReauthorizeSession } from "./actions";

interface Props {
  poolId:   string;
  poolName: string;
  betAud:   number;
}

export default function UpdatePaymentForm({ poolId, poolName, betAud }: Props) {
  const [state, action, pending] = useActionState(createReauthorizeSession, null);

  useEffect(() => {
    if (state?.url) window.location.href = state.url;
  }, [state?.url]);

  const processingFee = +(betAud * 0.029 + 0.30).toFixed(2);
  const total = +(betAud + processingFee).toFixed(2);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ padding: "0.75rem 0 0" }}>
          <Link href={`/pool/${poolId}`} className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>← Back to Pool</Link>
        </div>
        <div className="auth-logo">Sweeppot</div>
        <div className="auth-hdr">
          <div className="auth-title">Update Payment</div>
          <div className="auth-sub">Re-authorise your payment to keep your spot in <strong>{poolName}</strong>.</div>
        </div>

        <form action={action}>
          <input type="hidden" name="pool_id"     value={poolId} />
          <div className="auth-body">
            {state?.error && (
              <div className="auth-global-err">{state.error}</div>
            )}

            <div style={{
              background: "var(--dark3)", border: "1px solid var(--border)",
              padding: "0.75rem 0.9rem", fontSize: "0.78rem", lineHeight: 1.8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Contribution</span>
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

            <p style={{ fontSize: "0.71rem", color: "var(--muted)", margin: "0.5rem 0 0", lineHeight: 1.6 }}>
              You have 48 hours from when you received the re-authorisation request to update your payment. After that, your spot will be released.
            </p>
          </div>

          <div className="auth-ftr">
            <button className="auth-btn" type="submit" disabled={pending || !!state?.url}>
              {pending || state?.url ? "Redirecting…" : `Re-authorise $${total.toFixed(2)} AUD →`}
            </button>
          </div>
        </form>
      </div>

      {/* Light mode toggle hidden — dark theme only for now, re-enable if needed */}
      {/* <button
        className="mode-toggle"
        onClick={() => document.body.classList.toggle("light-mode")}
        title="Switch mode"
      >
        ☀️
      </button> */}
    </div>
  );
}
