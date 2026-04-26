"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";

type PresetKey = "Premier League" | "Champions League" | "World Cup 2026";
type Phase = "form" | "spinning" | "done";

// Preset team lists for common competitions
const PRESETS: Record<PresetKey, string[]> = {
  "Premier League": [
    "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
    "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich",
    "Leicester", "Liverpool", "Man City", "Man United", "Newcastle",
    "Nottm Forest", "Southampton", "Spurs", "West Ham", "Wolves",
  ],
  "Champions League": [
    "Arsenal", "Atletico Madrid", "Barcelona", "Bayern Munich", "Benfica",
    "Borussia Dortmund", "Celtic", "Club Brugge", "Feyenoord", "Inter Milan",
    "Juventus", "Lille", "Liverpool", "Man City", "Monaco", "Real Madrid",
  ],
  "World Cup 2026": [
    "Argentina", "Australia", "Belgium", "Brazil", "Canada",
    "Colombia", "Croatia", "Denmark", "Ecuador", "England",
    "France", "Germany", "Ghana", "Iran", "Japan",
    "Mexico", "Morocco", "Netherlands", "Nigeria", "Poland",
    "Portugal", "Saudi Arabia", "Senegal", "Serbia", "South Korea",
    "Spain", "Switzerland", "USA", "Uruguay", "Wales",
    "Cameroon", "Egypt",
  ],
};

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

interface DrawResult {
  participant: string;
  team: string;
}

// Wheel segment colours — dark/light palettes matching the app's design system
const WHEEL_DARK  = ["#1E3A2A","#263545","#2A1F3D","#3D2A1A","#16301F","#1E2936","#201630","#301E10"];
const WHEEL_LIGHT = ["#E8F5E9","#E3F2FD","#F3E5F5","#FFF3E0","#C8E6C9","#BBDEFB","#E1BEE7","#FFE0B2"];

// Fisher-Yates shuffle — returns a new shuffled copy of the array
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GeneratorPage() {
  // ── Form state ────────────────────────────────────────────────
  const [participants, setParticipants] = useState<string[]>(["", ""]);
  const [teams, setTeams]               = useState<string[]>(["", ""]);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [newParticipant, setNewParticipant] = useState("");
  const [newTeam, setNewTeam]               = useState("");

  // ── Spin state ────────────────────────────────────────────────
  const [phase, setPhase]           = useState<Phase>("form");
  const [assignments, setAssignments] = useState<DrawResult[]>([]);
  const [spinIdx, setSpinIdx]       = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [landed, setLanded]         = useState<DrawResult | null>(null);
  const [doneResults, setDoneResults] = useState<DrawResult[]>([]);

  const pInputRef = useRef<HTMLInputElement>(null);
  const tInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef  = useRef(0);

  const validParticipants = participants.filter((p) => p.trim() !== "");
  const validTeams        = teams.filter((t) => t.trim() !== "");
  const teamsShort = validParticipants.length >= 2 && validTeams.length > 0 && validTeams.length < validParticipants.length;
  const canDraw    = validParticipants.length >= 2 && validTeams.length >= validParticipants.length;

  // ── Canvas wheel drawing ──────────────────────────────────────

  // Render the wheel at the given rotation angle with the supplied team list
  function drawWheel(ang: number, wheelTeams: string[]) {
    const canvas = canvasRef.current;
    if (!canvas || !wheelTeams.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const light   = typeof document !== "undefined" && document.body.classList.contains("light-mode");
    const colors  = light ? WHEEL_LIGHT : WHEEL_DARK;
    const textCol = light ? "#333" : "rgba(236,239,241,0.82)";
    const rimCol  = light ? "rgba(27,94,32,0.45)" : "rgba(198,241,53,0.45)";
    const centerBg = light ? "#fff" : "#1E2936";

    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 6;
    const seg = (2 * Math.PI) / wheelTeams.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = rimCol; ctx.lineWidth = 2; ctx.stroke();

    wheelTeams.forEach((team, i) => {
      const sa  = ang + i * seg - Math.PI / 2;
      const ea  = sa + seg;
      const mid = sa + seg / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sa, ea);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = light ? "rgba(0,0,0,0.05)" : "rgba(198,241,53,0.07)";
      ctx.lineWidth = 1; ctx.stroke();

      const n        = wheelTeams.length;
      const fontSize = n <= 6 ? 9 : n <= 12 ? 7.5 : n <= 20 ? 6.5 : 5.5;
      const tr       = r * (n <= 8 ? 0.62 : 0.72);

      ctx.save();
      ctx.translate(cx + tr * Math.cos(mid), cy + tr * Math.sin(mid));
      ctx.rotate(mid + Math.PI / 2);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = textCol;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const label = team.length > 10 ? team.slice(0, 9) + "." : team;
      ctx.fillText(label.toUpperCase(), 0, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = centerBg; ctx.fill();
    ctx.strokeStyle = rimCol; ctx.lineWidth = 2; ctx.stroke();
  }

  // Redraw with the remaining teams whenever we advance to a new participant
  useEffect(() => {
    if (phase !== "spinning" || !assignments.length) return;
    angleRef.current = 0;
    const remaining = assignments.slice(spinIdx).map((a) => a.team);
    drawWheel(0, remaining);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinIdx, phase, assignments]);

  // ── Form handlers ─────────────────────────────────────────────

  // Update a participant name in-place by index
  function updateParticipant(i: number, value: string) {
    setParticipants((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }

  // Add a new participant from the add-row input
  function addParticipant() {
    const name = newParticipant.trim();
    if (!name) return;
    setParticipants((prev) => [...prev, name]);
    setNewParticipant("");
    pInputRef.current?.focus();
  }

  // Remove a participant at the given index
  function removeParticipant(i: number) {
    setParticipants((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Load a preset and replace the current team list
  function loadPreset(key: PresetKey) {
    setTeams([...PRESETS[key]]);
    setActivePreset(key);
    setNewTeam("");
  }

  // Update a team name in-place by index (custom mode only)
  function updateTeam(i: number, value: string) {
    setTeams((prev) => prev.map((t, idx) => (idx === i ? value : t)));
    setActivePreset(null);
  }

  // Add a new team from the add-row input
  function addTeam() {
    const name = newTeam.trim();
    if (!name) return;
    setTeams((prev) => [...prev, name]);
    setNewTeam("");
    setActivePreset(null);
    tInputRef.current?.focus();
  }

  // Remove a team at the given index
  function removeTeam(i: number) {
    setTeams((prev) => prev.filter((_, idx) => idx !== i));
    setActivePreset(null);
  }

  // ── Draw flow ─────────────────────────────────────────────────

  // Pre-compute all assignments and enter the spin phase
  function runDraw() {
    if (!canDraw) return;
    const shuffledTeams = shuffle(validTeams);
    const draw: DrawResult[] = validParticipants.map((name, i) => ({
      participant: name,
      team: shuffledTeams[i],
    }));
    setAssignments(draw);
    setSpinIdx(0);
    setIsSpinning(false);
    setLanded(null);
    setDoneResults([]);
    setPhase("spinning");
  }

  // Animate the wheel landing on the current participant's pre-assigned team
  function doSpin() {
    if (isSpinning || !assignments[spinIdx]) return;
    const remaining  = assignments.slice(spinIdx).map((a) => a.team);
    const targetTeam = assignments[spinIdx].team;
    const wi         = remaining.indexOf(targetTeam);

    const seg = (2 * Math.PI) / remaining.length;
    const rot = (5 + Math.random() * 3) * 2 * Math.PI;
    const tgt = rot - (wi * seg + seg / 2);
    const dur = 2500 + Math.random() * 1000;
    const t0  = performance.now();
    const a0  = angleRef.current;
    const result = assignments[spinIdx];

    function ease(t: number) { return 1 - Math.pow(1 - t, 4); }

    setIsSpinning(true);
    setLanded(null);

    function anim(now: number) {
      const p = Math.min((now - t0) / dur, 1);
      angleRef.current = a0 + tgt * ease(p);
      drawWheel(angleRef.current, remaining);
      if (p < 1) {
        requestAnimationFrame(anim);
      } else {
        angleRef.current = a0 + tgt;
        drawWheel(angleRef.current, remaining);
        setIsSpinning(false);
        setLanded(result);
      }
    }
    requestAnimationFrame(anim);
  }

  // Advance to the next participant after their result is shown
  function advance() {
    if (!landed) return;
    const newDone = [...doneResults, landed];
    setDoneResults(newDone);
    if (spinIdx + 1 < assignments.length) {
      setSpinIdx(spinIdx + 1);
      setLanded(null);
    } else {
      setPhase("done");
      setTimeout(() => {
        document.getElementById("gen-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  // Reset all state back to the empty form
  function reset() {
    setPhase("form");
    setAssignments([]);
    setSpinIdx(0);
    setIsSpinning(false);
    setLanded(null);
    setDoneResults([]);
    setParticipants(["", ""]);
    setTeams(["", ""]);
    setActivePreset(null);
    setNewParticipant("");
    setNewTeam("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      <nav className="nav-bar">
        <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
          Sweeppot
        </Link>
        <div className="nav-right">
          <Link href="/" className="nav-btn" style={{ textDecoration: "none" }}>
            ← Home
          </Link>
          <Link href="/auth/signup" className="nav-btn hi" style={{ textDecoration: "none" }}>
            + Create Pool
          </Link>
        </div>
      </nav>

      <div className="gen-wrap">
        <header className="gen-hdr">
          <h1 className="gen-h1">Free Sweepstake Generator</h1>
          <p className="gen-sub">
            Enter participants and teams, click Generate, and spin the wheel to reveal each draw.
            No account needed — completely free.
          </p>
        </header>

        {/* ── Form phase ── */}
        {phase === "form" && (
          <>
            <div className="gen-grid">
              {/* Participants */}
              <section className="gen-section" aria-label="Participants">
                <div className="gen-section-hdr">
                  <div className="gen-section-title">Participants</div>
                  <div className="gen-section-count">{validParticipants.length} added</div>
                </div>

                <div className="gen-list">
                  {participants.map((name, i) => (
                    <div key={i} className="gen-item">
                      <input
                        className="fi"
                        type="text"
                        placeholder={`Participant ${i + 1}`}
                        value={name}
                        onChange={(e) => updateParticipant(i, e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter" && newParticipant === "") pInputRef.current?.focus();
                        }}
                      />
                      {participants.length > 2 && (
                        <button
                          className="gen-remove-btn"
                          onClick={() => removeParticipant(i)}
                          aria-label={`Remove ${name || "participant"}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="gen-add-row">
                  <input
                    ref={pInputRef}
                    className="fi"
                    type="text"
                    placeholder="Add participant…"
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") addParticipant();
                    }}
                  />
                  <button
                    className="gen-add-btn"
                    onClick={addParticipant}
                    disabled={!newParticipant.trim()}
                  >
                    + Add
                  </button>
                </div>
              </section>

              {/* Teams */}
              <section className="gen-section" aria-label="Teams">
                <div className="gen-section-hdr">
                  <div className="gen-section-title">Teams</div>
                  <div className="gen-section-count">{validTeams.length} added</div>
                </div>

                <div className="gen-presets" role="group" aria-label="Load preset teams">
                  {PRESET_KEYS.map((key) => (
                    <button
                      key={key}
                      className={`gen-preset-btn${activePreset === key ? " active" : ""}`}
                      onClick={() => loadPreset(key)}
                      aria-pressed={activePreset === key}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="gen-list gen-list-teams">
                  {teams.map((team, i) =>
                    activePreset !== null ? (
                      <div key={i} className="gen-team-pill">
                        <span>{team}</span>
                        <button
                          className="gen-pill-remove"
                          onClick={() => removeTeam(i)}
                          aria-label={`Remove ${team}`}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div key={i} className="gen-item">
                        <input
                          className="fi"
                          type="text"
                          placeholder={`Team ${i + 1}`}
                          value={team}
                          onChange={(e) => updateTeam(i, e.target.value)}
                        />
                        {teams.length > 2 && (
                          <button
                            className="gen-remove-btn"
                            onClick={() => removeTeam(i)}
                            aria-label={`Remove ${team || "team"}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>

                <div className="gen-add-row">
                  <input
                    ref={tInputRef}
                    className="fi"
                    type="text"
                    placeholder={activePreset ? "Add a custom team…" : "Add team…"}
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") addTeam();
                    }}
                  />
                  <button
                    className="gen-add-btn"
                    onClick={addTeam}
                    disabled={!newTeam.trim()}
                  >
                    + Add
                  </button>
                </div>
              </section>
            </div>

            {teamsShort && (
              <div className="gen-warning" role="alert">
                You need at least as many teams as participants — add more teams or remove participants.
              </div>
            )}

            <div className="gen-actions">
              <button className="gen-draw-btn" onClick={runDraw} disabled={!canDraw}>
                Generate Draw →
              </button>
              {!canDraw && !teamsShort && (
                <p className="gen-hint">Add at least 2 participants and 2 teams to continue.</p>
              )}
            </div>
          </>
        )}

        {/* ── Spin phase ── */}
        {phase === "spinning" && (
          <div className="gen-spin-stage">
            <div className="gen-spin-header">
              <div className="gen-spin-progress">
                Spin {spinIdx + 1} of {assignments.length}
              </div>
              <button
                className="gen-reset-btn"
                onClick={reset}
                style={{ fontSize: "0.72rem", padding: "0.3rem 0.9rem" }}
              >
                ← Start Over
              </button>
            </div>

            <div className="player-row" style={{ maxWidth: 340, width: "100%" }}>
              <span className="player-lbl">Spinning for:</span>
              <div className="player-name-disp">{assignments[spinIdx]?.participant}</div>
            </div>

            <div className="wheel-wrap" style={{ margin: "0 auto" }}>
              <div className="wheel-ptr" />
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                style={{
                  borderRadius: "50%",
                  boxShadow: "0 0 0 3px rgba(198,241,53,0.15), 0 20px 40px rgba(0,0,0,0.3)",
                }}
              />
              <div className="wheel-center" style={{ fontSize: "0.85rem", lineHeight: 1 }}>✦</div>
            </div>

            {!landed && (
              <button
                className={`spin-btn${isSpinning ? " spinning" : ""}`}
                onClick={doSpin}
                disabled={isSpinning}
              >
                {isSpinning ? "SPINNING…" : "SPIN"}
              </button>
            )}

            {!landed && !isSpinning && (
              <div className="result-placeholder">
                Spin to reveal {assignments[spinIdx]?.participant}&apos;s team
              </div>
            )}

            {landed && (
              <div className="result-panel show" style={{ maxWidth: 340, width: "100%" }}>
                <div className="result-team-card">
                  <div className="result-lbl">{landed.participant} gets</div>
                  <div className="result-tname">{landed.team.toUpperCase()}</div>
                </div>
                <button className="dismiss-btn" onClick={advance}>
                  {spinIdx + 1 < assignments.length
                    ? `Next → spin for ${assignments[spinIdx + 1]?.participant}`
                    : "See full results →"}
                </button>
              </div>
            )}

            {doneResults.length > 0 && (
              <div className="gen-spin-sofar">
                <div className="gen-spin-sofar-lbl">Assigned so far</div>
                {doneResults.map((r, i) => (
                  <div key={i} className="gen-spin-sofar-row">
                    <span className="gen-spin-sofar-name">{r.participant}</span>
                    <span className="gen-result-arrow" aria-hidden="true">→</span>
                    <span className="gen-spin-sofar-team">{r.team}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Done phase ── */}
        {phase === "done" && (
          <>
            <div className="gen-actions">
              <button className="gen-reset-btn" onClick={reset}>← Start Over</button>
            </div>

            <section id="gen-results" className="gen-results" aria-label="Draw results">
              <div className="gen-results-hdr">
                <div className="gen-results-title">Draw Results</div>
                <div className="gen-results-sub">
                  {doneResults.length} participant{doneResults.length !== 1 ? "s" : ""} — teams assigned by wheel
                </div>
              </div>
              <ol className="gen-results-list">
                {doneResults.map((r, i) => (
                  <li key={i} className="gen-result-row">
                    <span className="gen-result-num">{i + 1}</span>
                    <span className="gen-result-name">{r.participant}</span>
                    <span className="gen-result-arrow" aria-hidden="true">→</span>
                    <span className="gen-result-team">{r.team}</span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="gen-convert">
              <div className="gen-convert-title">Want to make this official?</div>
              <p className="gen-convert-body">
                Sweeppot handles payments, holds entry fees securely, and pays the winner automatically.
                No spreadsheets, no chasing people up.
              </p>
              <Link href="/auth/signup" className="lp-btn-primary" style={{ textDecoration: "none" }}>
                Create a Free Pool →
              </Link>
            </div>
          </>
        )}

        <footer className="lp-footer">
          <div className="lp-footer-logo">Sweeppot</div>
          <div className="lp-footer-tagline">Peer-to-peer football sweepstakes — escrowed, automated, fair.</div>
          <div className="lp-footer-links">
            <a href="/terms" className="lp-footer-link">Terms of Service</a>
          </div>
        </footer>
      </div>

      <button
        className="mode-toggle"
        onClick={() => document.body.classList.toggle("light-mode")}
        title="Switch mode"
      >
        ☀️
      </button>

      {/* Fixed bottom banner — visible only while filling in the form */}
      {phase === "form" && (
        <div className="gen-bottom-banner">
          <span className="gen-bottom-text">Running a paid sweep? Make it official with Sweeppot</span>
          <Link href="/auth/signup" className="gen-bottom-link">
            Get started →
          </Link>
        </div>
      )}
    </>
  );
}
