"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/app/auth/actions";

function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPassword, null);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ padding: "0.75rem 0 0" }}>
          <Link href="/auth/login" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>← Sign In</Link>
        </div>
        <div className="auth-logo">Sweeppot</div>
        <div className="auth-hdr">
          <div className="auth-title">Reset Password</div>
          <div className="auth-sub">Enter your email and we&apos;ll send you a reset link.</div>
        </div>

        <form action={action}>
          <div className="auth-body">
            {state?.error && (
              <div className="auth-global-err">{state.error}</div>
            )}
            {state?.success ? (
              <div className="auth-global-ok">
                Check your inbox — a password reset link is on its way.
              </div>
            ) : (
              <div className="auth-field">
                <label className="auth-label" htmlFor="email">Email address</label>
                <input
                  className="fi"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            )}
          </div>

          {!state?.success && (
            <div className="auth-ftr">
              <button className="auth-btn" type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send Reset Link →"}
              </button>
              <div className="auth-link">
                Remembered it?{" "}
                <Link href="/auth/login">Sign in</Link>
              </div>
            </div>
          )}
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

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
