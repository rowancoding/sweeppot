"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Sweeppot</div>
        <div className="auth-hdr">
          <div className="auth-title">Sign In</div>
          <div className="auth-sub">Welcome back — enter your details to continue.</div>
        </div>

        <form action={action}>
          <div className="auth-body">
            {state?.error && (
              <div className="auth-global-err">{state.error}</div>
            )}

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

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                className="fi"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div className="auth-ftr">
            <button className="auth-btn" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign In →"}
            </button>
            <div className="auth-link">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup">Create one</Link>
            </div>
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
