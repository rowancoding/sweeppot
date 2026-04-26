import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { COMP_META } from "@/lib/teams";
import CopyButton from "./CopyButton";
import Countdown from "./Countdown";
import StartDrawButton from "./StartDrawButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pool } = await supabase
    .from("pools")
    .select("name, comp")
    .eq("id", id)
    .single();

  const meta = pool ? (COMP_META[pool.comp] ?? { label: pool.comp }) : null;
  return {
    title: pool ? pool.name : "Pool",
    description: pool && meta ? `${pool.name} — ${meta.label} sweepstake on Sweeppot.` : undefined,
    robots: { index: false, follow: false },
  };
}

// ── Types ─────────────────────────────────────────────────────

interface TeamAssignment {
  id: string;
  team_name: string;
  team_flag: string;
  team_rank: number;
  tier: number;
  participant_id: string;
}

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  paid: boolean;
  spun: boolean;
  joined_at: string;
  team_assignments: TeamAssignment[];
}

interface Pool {
  id: string;
  name: string;
  comp: string;
  stage: string;
  bet_aud: number;
  player_count: number;
  teams_per_player: number;
  status: "waiting" | "active" | "complete";
  visibility: string;
  organiser_id: string;
  expires_at: string | null;
  invite_code: string;
  draw_mode: string;
  created_at: string;
}

// ── Page ──────────────────────────────────────────────────────

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch pool
  const { data: pool, error: poolErr } = await supabase
    .from("pools")
    .select("*")
    .eq("id", id)
    .single();

  if (poolErr || !pool) notFound();

  const typedPool = pool as Pool;

  // Fetch participants + their team assignments
  const { data: rawParticipants } = await supabase
    .from("participants")
    .select(`
      id, user_id, display_name, paid, spun, joined_at,
      team_assignments ( id, team_name, team_flag, team_rank, tier, participant_id )
    `)
    .eq("pool_id", id)
    .order("joined_at", { ascending: true });

  const participants: Participant[] = (rawParticipants ?? []) as Participant[];
  const paidCount = participants.filter((p) => p.paid).length;
  const isOrganiser = user?.id === typedPool.organiser_id;
  const myParticipant = participants.find((p) => p.user_id === user?.id);
  const myTeams = myParticipant?.team_assignments ?? [];

  const meta = COMP_META[typedPool.comp] ?? { label: typedPool.comp, icon: "⚽", ranking: "" };
  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://sweeppot.vercel.app"}/join/${typedPool.invite_code}`;

  // ── Waiting Room ────────────────────────────────────────────
  if (typedPool.status === "waiting") {
    return (
      <div className="pool-page">
        <PoolNav poolName={typedPool.name} />

        <div className="pool-body">
          <div className="card">
            {/* Hero */}
            <div className="waiting-hero">
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    marginBottom: "0.45rem",
                  }}
                >
                  <div className="wh-title">Waiting for players</div>
                </div>
                <p className="wh-sub">
                  {meta.icon} {meta.label} · {typedPool.bet_aud > 0 ? `$${typedPool.bet_aud} AUD entry` : "Free sweepstake"} ·{" "}
                  {typedPool.player_count} players · {typedPool.teams_per_player} team
                  {typedPool.teams_per_player !== 1 ? "s" : ""} each
                  <br />
                  Share the link below. When the pool fills, the draw happens automatically.
                </p>
              </div>

              {/* My team toggle — only shown post-draw (not relevant yet in waiting) */}
              {myTeams.length > 0 && (
                <MyTeamToggle teams={myTeams} />
              )}
            </div>

            {/* Countdown */}
            {typedPool.expires_at ? (
              <Countdown expiresAt={typedPool.expires_at} />
            ) : (
              <div className="cd-wrap">
                <div className="cd-unit" style={{ flex: 1 }}>
                  <div className="cd-num" style={{ fontSize: "0.9rem", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.04em" }}>
                    No custom deadline
                  </div>
                  <div className="cd-lbl">Closes 1 hr before first game</div>
                </div>
              </div>
            )}

            {/* Pool Progress */}
            <div className="pool-prog">
              <div className="pp-hdr">
                <div className="pp-title">Pool Progress</div>
                <div className="pp-count">
                  {paidCount} of {typedPool.player_count} joined &amp; paid
                </div>
              </div>
              <div className="pp-grid">
                {/* Filled slots */}
                {participants.map((p) => {
                  const isYou = p.user_id === user?.id;
                  const cls = isYou ? "you" : p.paid ? "paid" : "empty";
                  const init = p.display_name?.charAt(0).toUpperCase() ?? "?";
                  return (
                    <div key={p.id} className={`pp-slot ${cls}`}>
                      <div className="pp-av">{init}</div>
                      <div className="pp-info">
                        <div className="pp-name">
                          {isYou ? "You" : p.display_name}
                        </div>
                        <div className="pp-st">
                          {p.paid
                            ? isYou
                              ? "You — joined & paid ✓"
                              : "Joined & paid ✓"
                            : "Waiting to pay"}
                        </div>
                      </div>
                      {p.paid && <div className="pp-lock">✓</div>}
                    </div>
                  );
                })}
                {/* Empty slots */}
                {Array.from({
                  length: Math.max(0, typedPool.player_count - participants.length),
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="pp-slot empty">
                    <div className="pp-av">?</div>
                    <div className="pp-info">
                      <div className="pp-name">Open spot</div>
                      <div className="pp-st">Waiting to join</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer — invite link */}
            <div className="waiting-footer">
              <CopyButton url={joinUrl} />
            </div>

            {/* Organiser controls */}
            {isOrganiser && (
              <StartDrawButton poolId={typedPool.id} paidCount={paidCount} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Active / Complete — Draw Results ────────────────────────
  const isComplete = typedPool.status === "complete";
  const myHasSpun  = myParticipant?.spun ?? false;
  const needsSpin  = !isComplete && myParticipant && !myHasSpun;

  const winner = isComplete
    ? participants.find((p) => p.spun && p.team_assignments.length > 0) ?? null
    : null;

  return (
    <div className="pool-page">
      <PoolNav poolName={typedPool.name} />

      <div className="pool-body">
        <div className="card">
          {/* Reveal hero */}
          <div className="reveal-hero">
            {isComplete ? (
              <>
                <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>🏆</div>
                <div className="reveal-title">Pool Complete!</div>
                <p className="reveal-sub">
                  {winner
                    ? `${winner.display_name} wins with ${winner.team_assignments[0]?.team_flag} ${winner.team_assignments[0]?.team_name}`
                    : "Tournament complete."}
                  {typedPool.bet_aud > 0 &&
                    ` · $${(typedPool.bet_aud * paidCount * 0.90).toFixed(0)} AUD`}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>🎡</div>
                <div className="reveal-title">The Draw!</div>
                <p className="reveal-sub">
                  {meta.icon} {meta.label} · Each player spins to reveal their team.
                </p>
              </>
            )}
          </div>

          {/* Spin prompt — shown when current user hasn't spun */}
          {needsSpin && (
            <div className="spin-prompt">
              <div>
                <div className="spin-prompt-title">Your pool is ready — spin to find out your team</div>
                <div className="spin-prompt-text">
                  The wheel shows all teams. Spin once — wherever it lands is your team. Other players&apos; results stay hidden until they spin too.
                </div>
              </div>
              <Link
                href={`/pool/${typedPool.id}/spin`}
                style={{
                  background: "var(--green)", color: "var(--dark)", border: "none",
                  padding: "0.78rem 1.8rem", fontFamily: "var(--font-barlow-condensed), sans-serif",
                  fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.08em",
                  textTransform: "uppercase", textDecoration: "none", whiteSpace: "nowrap",
                  clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                }}
              >
                🎡 Spin to Reveal →
              </Link>
            </div>
          )}

          {/* Team assignments grid */}
          <div className="reveal-grid">
            {participants.map((p, i) => {
              const isYou  = p.user_id === user?.id;
              const delay  = i * 80;
              const teamsVisible = p.spun; // only show teams after participant has spun
              return (
                <div
                  key={p.id}
                  className={`reveal-card${isYou ? " you" : ""}`}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <div className={`rc-player${isYou ? " yt" : ""}`}>
                    {isYou ? "⭐ You" : p.display_name}
                  </div>
                  <div className="rc-teams">
                    {teamsVisible ? (
                      p.team_assignments
                        .sort((a, b) => a.tier - b.tier)
                        .map((t) => (
                          <div key={t.id} className="rc-team">
                            <span className="rc-flag">{t.team_flag}</span>
                            <span>{t.team_name}</span>
                            <span className="rc-rank">#{t.team_rank}</span>
                          </div>
                        ))
                    ) : (
                      <div className="rc-hidden">
                        🛡️ <span>Waiting to spin</span>
                      </div>
                    )}
                  </div>
                  {isYou && !p.spun && (
                    <Link
                      href={`/pool/${typedPool.id}/spin`}
                      style={{ fontSize: "0.65rem", color: "var(--green)", textDecoration: "none", marginTop: "0.3rem" }}
                    >
                      Spin now →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="reveal-footer">
            <Link href="/" className="btn-ghost" style={{ textDecoration: "none" }}>
              ⌂ Back to My Pools
            </Link>
            {!isComplete && (
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", alignSelf: "center" }}>
                <span className="sdot" /> Pool active — teams revealed as players spin
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────

function PoolNav({ poolName }: { poolName: string }) {
  return (
    <nav className="pool-nav">
      <Link
        href="/"
        className="nav-btn"
        style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}
      >
        ← My Pools
      </Link>
      <span
        style={{
          fontFamily: "var(--font-bebas-neue), sans-serif",
          fontSize: "1rem",
          color: "var(--muted)",
          letterSpacing: "0.06em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "50%",
        }}
      >
        {poolName}
      </span>
      <span className="pool-nav-logo">Sweeppot</span>
    </nav>
  );
}

function MyTeamToggle({
  teams,
}: {
  teams: { team_name: string; team_flag: string; team_rank: number }[];
}) {
  // Server-rendered shell; toggle interaction would need a client island.
  // For now render as always-visible reveal (post-draw the teams are public anyway).
  return (
    <div className="mt-toggle-wrap">
      <div className="mt-reveal show">
        <div className="mt-reveal-lbl">Your team{teams.length > 1 ? "s" : ""}</div>
        {teams.map((t, i) => (
          <div key={i} className="mt-team">
            {t.team_flag} {t.team_name}
            <span style={{ fontSize: "0.63rem", color: "var(--muted)", marginLeft: "0.3rem" }}>
              #{t.team_rank}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
