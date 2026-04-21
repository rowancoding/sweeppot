"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/auth/actions";

function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const searchParams = useSearchParams();
  const next    = searchParams.get("next") || "";
  const message = searchParams.get("message");

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ padding: "0.75rem 0 0" }}>
          <Link href="/" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>← Home</Link>
        </div>
        <div className="auth-logo">Sweeppot</div>
        <div className="auth-hdr">
          <div className="auth-title">Sign In</div>
          <div className="auth-sub">Welcome back — enter your details to continue.</div>
        </div>

        <form action={action}>
          {next && <input type="hidden" name="next" value={next} />}
          <div className="auth-body">
            {message === "password-updated" && (
              <div className="auth-global-ok">Password updated. Please sign in.</div>
            )}
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
              <div style={{ textAlign: "right", marginTop: "0.3rem" }}>
                <Link href="/auth/forgot-password" style={{ fontSize: "0.7rem", color: "var(--muted)", textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          <div className="auth-ftr">
            <button className="auth-btn" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign In →"}
            </button>
            <div className="auth-link">
              Don&apos;t have an account?{" "}
              <Link href={next ? `/auth/signup?next=${encodeURIComponent(next)}` : "/auth/signup"}>
                Create one
              </Link>
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
