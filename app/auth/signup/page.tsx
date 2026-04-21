"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signup } from "@/app/auth/actions";

function SignupForm() {
  const [state, action, pending] = useActionState(signup, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";

  // Max date = 18 years ago today
  const maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  })();

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ padding: "0.75rem 0 0" }}>
          <Link href="/" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>← Home</Link>
        </div>
        <div className="auth-logo">Sweeppot</div>
        <div className="auth-hdr">
          <div className="auth-title">Create Account</div>
          <div className="auth-sub">
            Set up your account to start or join sweepstakes.
          </div>
        </div>

        <form action={action}>
          {next && <input type="hidden" name="next" value={next} />}
          <div className="auth-body">
            {state?.emailExists && (
              <div className="auth-global-err">
                An account with this email already exists.{" "}
                <Link
                  href={next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login"}
                  style={{ color: "inherit", fontWeight: 700 }}
                >
                  Please sign in instead.
                </Link>
              </div>
            )}
            {state?.error && !state.emailExists && (
              <div className="auth-global-err">{state.error}</div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="display_name">
                Display name
              </label>
              <input
                className="fi"
                id="display_name"
                name="display_name"
                type="text"
                placeholder="How you appear in pools"
                autoComplete="name"
                required
              />
            </div>

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
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="date_of_birth">
                Date of birth{" "}
                <span>(must be 18 or older)</span>
              </label>
              <input
                className="fi"
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                max={maxDob}
                required
              />
            </div>
          </div>

          <div className="auth-ftr">
            <button className="auth-btn" type="submit" disabled={pending}>
              {pending ? "Creating account…" : "Create Account →"}
            </button>
            <div className="auth-link">
              Already have an account?{" "}
              <Link href={next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login"}>
                Sign in
              </Link>
            </div>
            <div
              className="auth-link"
              style={{ fontSize: "0.67rem", color: "var(--dim)" }}
            >
              By creating an account you agree to our terms. 18+ only. Please
              participate responsibly.
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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
