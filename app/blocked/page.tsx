import Link from "next/link";

export default function BlockedPage() {
  return (
    <div className="blocked-wrap">
      <div className="blocked-icon">🚫</div>
      <div className="blocked-title">Not Available in Your Region</div>
      <div className="blocked-sub">
        Sweeppot is not currently available in your country or region. We&apos;re working to
        expand — check back soon.
      </div>
      <Link href="/" className="nav-btn" style={{ textDecoration: "none" }}>
        ← Back to Home
      </Link>
    </div>
  );
}
