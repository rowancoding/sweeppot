import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { COMP_META } from "@/lib/teams";
import JoinForm from "./JoinForm";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Look up pool by invite code (public read — no auth required)
  const { data: pool, error } = await supabase
    .from("pools")
    .select(`
      id, name, comp, stage, bet_aud, player_count, teams_per_player,
      status, visibility, organiser_id, expires_at, invite_code,
      participants ( id, paid )
    `)
    .eq("invite_code", code)
    .single();

  if (error || !pool) notFound();

  const participants = (pool.participants as { id: string; paid: boolean }[]) ?? [];
  const paidCount = participants.filter((p) => p.paid).length;
  const spotsLeft = pool.player_count - participants.length;
  const isFull = spotsLeft <= 0;
  const isClosed = pool.status !== "waiting";

  const meta = COMP_META[pool.comp] ?? { label: pool.comp, icon: "⚽", ranking: "" };

  const pot =
    pool.bet_aud > 0 ? `$${(pool.bet_aud * pool.player_count).toFixed(0)} AUD` : "Free";

  // Check if current user is already in this pool
  let alreadyIn = false;
  if (user) {
    const { data: myPart } = await supabase
      .from("participants")
      .select("id")
      .eq("pool_id", pool.id)
      .eq("user_id", user.id)
      .maybeSingle();
    alreadyIn = !!myPart;
  }

  // Already in pool — redirect directly
  if (alreadyIn) redirect(`/pool/${pool.id}`);

  return (
    <div className="join-wrap">
      <div className="join-card">
        <div style={{ padding: "0.9rem 1.8rem 0" }}>
          <Link
            href="/"
            className="nav-btn"
            style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}
          >
            ← Home
          </Link>
        </div>

        {/* Pool summary */}
        <div className="ipc">
          <div className="ipc-comp">
            {meta.icon} {meta.label} · {pool.visibility === "private" ? "🔒 Private Pool" : "🌐 Public Pool"}
          </div>
          <div className="ipc-name">{pool.name}</div>
          <div className="ipc-stats">
            <div className="ipc-stat">
              <div className="ipc-sv">{pool.player_count}</div>
              <div className="ipc-sl">Players</div>
            </div>
            <div className="ipc-stat">
              <div className="ipc-sv">{Math.max(0, spotsLeft)}</div>
              <div className="ipc-sl">Spots Left</div>
            </div>
            <div className="ipc-stat">
              <div className="ipc-sv">
                {pool.bet_aud > 0 ? `$${pool.bet_aud}` : "Free"}
              </div>
              <div className="ipc-sl">Entry AUD</div>
            </div>
            <div className="ipc-stat">
              <div className="ipc-sv">{pot}</div>
              <div className="ipc-sl">Total Pot</div>
            </div>
          </div>
        </div>

        {/* Closed / full banner */}
        {(isClosed || isFull) && (
          <div className="pool-closed-banner">
            {isClosed
              ? pool.status === "active"
                ? "The draw has already happened — this pool is now active."
                : "This pool has ended."
              : "This pool is full — no spots remaining."}
          </div>
        )}

        {/* Action section */}
        {!isClosed && !isFull && (
          <div className="invite-action">
            <h3>You&apos;ve been invited to join</h3>
            <p>
              {pool.bet_aud > 0
                ? `Your card won't be charged until the pool is full. Once everyone has joined — or the deadline arrives — teams are drawn simultaneously and your payment is captured. If the pool doesn't fill, your hold is released automatically — no charge made.`
                : "Join this free sweepstake. Once everyone is in, teams are drawn simultaneously and revealed to all players at the same moment."}
            </p>

            {!user ? (
              // Not signed in — prompt to sign up or log in
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <Link
                  href={`/auth/signup?next=${encodeURIComponent(`/join/${code}`)}`}
                  className="btn-gold"
                  style={{ textDecoration: "none", textAlign: "center" }}
                >
                  Create Account to Join →
                </Link>
                <Link
                  href={`/auth/login?next=${encodeURIComponent(`/join/${code}`)}`}
                  className="btn-ghost"
                  style={{ textDecoration: "none", textAlign: "center" }}
                >
                  Sign In
                </Link>
                <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: 0 }}>
                  18+ only. By joining you agree to the Sweeppot Terms.
                  {pool.bet_aud > 0 &&
                    " Payment held in escrow — auto-refunded if pool doesn't fill before the deadline."}
                </p>
              </div>
            ) : (
              // Signed in — show join form
              <JoinForm poolId={pool.id} betAud={pool.bet_aud} inviteCode={code} />
            )}
          </div>
        )}

        {/* Already in pool — link through */}
        {user && isClosed && pool.status === "active" && (
          <div className="invite-action">
            <Link
              href={`/pool/${pool.id}`}
              className="btn-gold"
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              View Pool →
            </Link>
          </div>
        )}
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

