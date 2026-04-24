"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "@/app/auth/actions";

interface Props {
  code:      string | null;
  tokenHash: string | null;
}

export default function ResetPasswordForm({ code, tokenHash }: Props) {
  const [state, action, pending] = useActionState(resetPassword, null);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ padding: "0.75rem 0 0" }}>
          <Link href="/auth/login" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>← Sign In</Link>
        </div>
        <div className="auth-logo">Sweeppot</div>
        <div className="auth-hdr">
          <h1 className="auth-title">New Password</h1>
          <div className="auth-sub">Choose a new password for your account.</div>
        </div>

        <form action={action}>
          {/* Pass whichever token format Supabase used in the reset email */}
          {code      && <input type="hidden" name="code"       value={code} />}
          {tokenHash && <input type="hidden" name="token_hash" value={tokenHash} />}
          <input type="hidden" name="type" value="recovery" />

          <div className="auth-body">
            {state?.error && (
              <div className="auth-global-err">
                {state.error}{" "}
                {state.expired && (
                  <Link href="/auth/forgot-password" style={{ color: "inherit", fontWeight: 700 }}>
                    Request a new link.
                  </Link>
                )}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">New password</label>
              <input
                className="fi"
                id="password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="confirm_password">Confirm new password</label>
              <input
                className="fi"
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="auth-ftr">
            <button className="auth-btn" type="submit" disabled={pending}>
              {pending ? "Updating…" : "Update Password →"}
            </button>
          </div>
        </form>
      </div>

      <button
        className="mode-toggle"
        onClick={() => document.body.classList.toggle("light-mode")}
        title="Switch mode"
      >
        ☀️
      </button>
    </div>
  );
}
