"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSpun } from "@/app/pool/actions";

interface Team {
  n: string;
  f: string;
  r: number;
  tier: number;
}

interface Props {
  poolId: string;
  poolName: string;
  comp: string;
  playerCount: number;
  teamsPerPlayer: number;
  allTeams: Team[];
  myTeams: Team[];         // pre-assigned teams ordered by tier
  displayName: string;
}

// Wheel segment colours — dark / light mode (4 tiers × 8 shades)
const TC_DARK = [
  ["#1E3A2A","#16301F","#254D35","#1A3D27","#2A5C3C","#122B1A","#203A26","#183025"],
  ["#263545","#1E2936","#2D3E50","#243345","#303F55","#1A2A3A","#283A4A","#1F2F40"],
  ["#2A1F3D","#201630","#352A50","#281D42","#3C2860","#1A1028","#2F2245","#231630"],
  ["#3D2A1A","#301E10","#4A3520","#3A2715","#522E10","#281A0A","#402A12","#33200E"],
];
const TC_LIGHT = [
  ["#E8F5E9","#C8E6C9","#DCEDC8","#F1F8E9","#B9F6CA","#CCFF90","#D4E8D0","#E0F0DC"],
  ["#E3F2FD","#BBDEFB","#C5E1F5","#D6EAF8","#B3E5FC","#CFE8F7","#D0E8F7","#C8E0F2"],
  ["#F3E5F5","#E1BEE7","#EDD8F2","#F5E6F5","#D7B8F5","#E8D0EF","#EDD5F0","#E5CCE8"],
  ["#FFF3E0","#FFE0B2","#FDEBD0","#FFF8E1","#FFD180","#FFECB3","#FDEACC","#FDE5BB"],
];

export default function SpinWheel({
  poolId, poolName, comp, playerCount, teamsPerPlayer,
  allTeams, myTeams, displayName,
}: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef  = useRef(0);
  const [curTier, setCurTier]       = useState(1);
  const [spinning, setSpinning]     = useState(false);
  const [spunTeams, setSpunTeams]   = useState<Team[]>([]);
  const [resultTeam, setResultTeam] = useState<Team | null>(null);
  const [isDone, setIsDone]         = useState(false);
  const [statusMsg, setStatusMsg]   = useState("Ready");
  const [, startTransition]         = useTransition();

  const tierTeams = allTeams.filter(t => t.tier === curTier);

  // Draw wheel on mount and whenever tierTeams / curTier changes
  useEffect(() => {
    drawWheel(angleRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curTier]);

  function isLightMode() {
    return typeof document !== "undefined" && document.body.classList.contains("light-mode");
  }

  function drawWheel(ang: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const teams = tierTeams;
    if (!teams.length) return;

    const light  = isLightMode();
    const colors = (light ? TC_LIGHT : TC_DARK)[(curTier - 1) % 4];
    const textCol = light ? "#333333" : "rgba(236,239,241,0.75)";
    const rimCol  = curTier === 1
      ? (light ? "rgba(27,94,32,0.45)" : "rgba(198,241,53,0.45)")
      : (light ? "rgba(46,125,50,0.35)" : "rgba(120,144,156,0.4)");
    const centerBg = light ? "#FFFFFF" : "#1E2936";

    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 6;
    const seg = (2 * Math.PI) / teams.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = rimCol; ctx.lineWidth = 2; ctx.stroke();

    teams.forEach((team, i) => {
      const sa = ang + i * seg - Math.PI / 2;
      const ea = sa + seg;
      const ma = sa + seg / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, ea); ctx.closePath();
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ctx.strokeStyle = light ? "rgba(0,0,0,0.05)" : "rgba(198,241,53,0.07)";
      ctx.lineWidth = 1; ctx.stroke();

      // Flag
      const fr = r * 0.72;
      ctx.save();
      ctx.translate(cx + fr * Math.cos(ma), cy + fr * Math.sin(ma));
      ctx.rotate(ma + Math.PI / 2);
      ctx.font = teams.length <= 8 ? "15px serif" : teams.length <= 16 ? "11px serif" : "8px serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(team.f, 0, 0);
      ctx.restore();

      // Name (if ≤12 teams)
      if (teams.length <= 12) {
        const nr = r * 0.40;
        ctx.save();
        ctx.translate(cx + nr * Math.cos(ma), cy + nr * Math.sin(ma));
        ctx.rotate(ma + Math.PI / 2);
        ctx.font = "bold 7px Arial"; ctx.fillStyle = textCol;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText((team.n.length > 8 ? team.n.substr(0, 7) + "." : team.n).toUpperCase(), 0, 0);
        ctx.restore();
      }
    });

    // Centre circle
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = centerBg; ctx.fill();
    ctx.strokeStyle = rimCol; ctx.lineWidth = 2; ctx.stroke();
  }

  function doSpin() {
    if (spinning) return;
    const teams = tierTeams;
    if (!teams.length) return;

    const assigned = myTeams[curTier - 1];
    let wi = teams.findIndex(t => t.r === assigned?.r);
    if (wi === -1) wi = Math.floor(Math.random() * teams.length);

    const seg = (2 * Math.PI) / teams.length;
    const rot = (5 + Math.random() * 3) * 2 * Math.PI;
    const tgt = rot - (wi * seg + seg / 2);
    const dur = 4000 + Math.random() * 1500;
    const t0  = performance.now();
    const a0  = angleRef.current;

    function ease(t: number) { return 1 - Math.pow(1 - t, 4); }

    setSpinning(true);
    setResultTeam(null);
    setStatusMsg("Spinning…");

    function anim(now: number) {
      const p = Math.min((now - t0) / dur, 1);
      angleRef.current = a0 + tgt * ease(p);
      drawWheel(angleRef.current);
      if (p < 1) {
        requestAnimationFrame(anim);
      } else {
        angleRef.current = a0 + tgt;
        drawWheel(angleRef.current);
        setSpinning(false);
        const landed = teams[wi];
        setResultTeam(landed);
        setSpunTeams(prev => [...prev, landed]);
        setStatusMsg(`Tier ${curTier} done — ${landed.n} assigned`);
      }
    }
    requestAnimationFrame(anim);
  }

  function onDismiss() {
    if (curTier < teamsPerPlayer) {
      // Move to next tier
      setCurTier(t => t + 1);
      setResultTeam(null);
      angleRef.current = 0;
    } else {
      // All tiers spun — call server action then redirect
      setIsDone(true);
      startTransition(async () => {
        await markSpun(poolId);
        router.push(`/pool/${poolId}`);
      });
    }
  }

  const allSpun = spunTeams.length === teamsPerPlayer;
  const tierLabel = `Tier ${curTier} of ${teamsPerPlayer}`;

  // Group allTeams by tier for sidebar
  const tierGroups: Record<number, Team[]> = {};
  for (const t of allTeams) {
    if (!tierGroups[t.tier]) tierGroups[t.tier] = [];
    tierGroups[t.tier].push(t);
  }

  return (
    <div className="spin-page">
      {/* Nav */}
      <nav className="spin-nav">
        <a href="/" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>
          ← My Pools
        </a>
        <div>
          <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "1rem", color: "var(--green)", letterSpacing: "0.05em", marginBottom: 0 }}>
            The Sweepstake Draw
          </h2>
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", margin: 0 }}>Spin to reveal your team — assigned when the pool filled</p>
        </div>
        <span className="spin-nav-logo">Sweeppot</span>
      </nav>

      <div className="spin-card-wrap">
        <div className="card">
          <div className="spin-layout">
            {/* Left — wheel */}
            <div className="spin-left">
              <div className="spin-pool-info">
                <div>
                  <div className="spin-pool-name">{poolName}</div>
                  <div className="spin-pool-meta">
                    {playerCount} players · {allTeams.length} teams · {teamsPerPlayer} team{teamsPerPlayer !== 1 ? "s" : ""} per player
                  </div>
                </div>
                <div className={`tier-badge tb-${curTier <= 2 ? curTier : "2"}`}>Tier {curTier}</div>
              </div>

              <div className="player-row">
                <span className="player-lbl">Spinning for:</span>
                <div className="player-name-disp">{displayName}</div>
              </div>

              <div className="wheel-wrap">
                <div className="wheel-ptr" />
                <canvas ref={canvasRef} id="wheelCanvas" width={300} height={300}
                  style={{ borderRadius: "50%", boxShadow: "0 0 0 3px rgba(198,241,53,0.15), 0 20px 40px rgba(0,0,0,0.3)" }}
                />
                <div className="wheel-center">⚽</div>
              </div>

              {/* Spin button */}
              {!resultTeam && !isDone && (
                <button
                  className={`spin-btn${spinning ? " spinning" : ""}`}
                  onClick={doSpin}
                  disabled={spinning}
                >
                  {spinning ? "SPINNING…" : curTier > 1 ? `SPIN TIER ${curTier}` : "SPIN"}
                </button>
              )}

              {/* Result panel */}
              {resultTeam && (
                <div className="result-panel show">
                  <div className="result-team-card">
                    <div className="result-lbl">Your Tier {curTier} team</div>
                    <span className="result-flag">{resultTeam.f}</span>
                    <div className="result-tname">{resultTeam.n.toUpperCase()}</div>
                    <div className="result-rank">Rank #{resultTeam.r} · Tier {resultTeam.tier}</div>
                  </div>
                  {curTier < teamsPerPlayer && (
                    <div className="result-warn">🎯 Tier {curTier} done. Spin for your next team.</div>
                  )}
                  {curTier >= teamsPerPlayer && (
                    <div className="result-warn">Your team has been locked in. See everyone&apos;s teams on the pool page.</div>
                  )}
                  <button className="dismiss-btn" onClick={onDismiss} disabled={isDone}>
                    {isDone ? "Saving…" : curTier < teamsPerPlayer ? `Got it — spin Tier ${curTier + 1} →` : "Got it — view pool results 🔒"}
                  </button>
                </div>
              )}

              {/* Placeholder before spin */}
              {!resultTeam && !isDone && (
                <div className="result-placeholder">Spin the wheel to receive your team</div>
              )}

              {isDone && !resultTeam && (
                <div className="result-placeholder">Saving your result…</div>
              )}
            </div>

            {/* Right — team pool sidebar */}
            <div className="spin-right">
              <div className="spin-ss" style={{ maxHeight: "420px", overflowY: "auto" }}>
                <div className="sidebar-lbl">All Teams</div>
                {Object.entries(tierGroups).map(([tierNum, teams]) => (
                  <div key={tierNum} className="tier-grp">
                    <div className="tier-grp-lbl">Tier {tierNum}</div>
                    {teams.map(t => {
                      const isAssigned = allSpun && spunTeams.some(s => s.r === t.r);
                      return (
                        <div key={t.r} className={`team-item${isAssigned ? " assigned" : ""}`}>
                          <span className="ti-flag">{t.f}</span>
                          <span className="ti-name">{t.n}</span>
                          <span className="ti-rank">#{t.r}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="spin-ss" style={{ flex: 1 }}>
                <div className="sidebar-lbl">Results hidden until all spin</div>
                <div style={{ fontSize: "0.73rem", color: "var(--muted)", padding: "0.2rem 0" }}>
                  {spunTeams.length > 0
                    ? `${spunTeams.length} team${spunTeams.length !== 1 ? "s" : ""} assigned so far`
                    : "No assignments yet"}
                </div>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="spin-status">
            <div><span className="sdot" />{statusMsg}</div>
            <span>{tierLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
