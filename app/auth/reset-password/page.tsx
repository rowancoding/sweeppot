import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; code?: string }>;
}) {
  const { token_hash, type, code } = await searchParams;

  // Accept either the PKCE code (most common with @supabase/ssr) or the OTP token_hash
  const hasToken = !!code || (!!token_hash && type === "recovery");

  if (!hasToken) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div style={{ padding: "0.75rem 0 0" }}>
            <Link href="/auth/login" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>← Sign In</Link>
          </div>
          <div className="auth-logo">Sweeppot</div>
          <div className="auth-hdr">
            <h1 className="auth-title">Reset Password</h1>
          </div>
          <div className="auth-body">
            <div className="auth-global-err">
              This reset link has expired. Please request a new one.
            </div>
            <div className="auth-ftr" style={{ paddingTop: "0.5rem" }}>
              <Link href="/auth/forgot-password" className="auth-btn" style={{ textDecoration: "none", textAlign: "center" }}>
                Request New Link →
              </Link>
            </div>
          </div>
        </div>
        <button
          className="mode-toggle"
          onClick={() => (document as Document & { body: HTMLBodyElement }).body.classList.toggle("light-mode")}
          title="Switch mode"
          suppressHydrationWarning
        >
          ☀️
        </button>
      </div>
    );
  }

  return (
    <ResetPasswordForm
      code={code ?? null}
      tokenHash={token_hash ?? null}
    />
  );
}
