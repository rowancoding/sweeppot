"use client";

import { useActionState, useState, useCallback } from "react";
import Link from "next/link";
import { createPool } from "@/app/pool/actions";

// ── Competition config ──────────────────────────────────────────
const COMPS = {
  wc2026: {
    label: "FIFA World Cup 2026",
    icon: "🌍",
    groupTeams: 48,
    ranking: "FIFA World Ranking",
    ko: { r32: { label: "Round of 32", teams: 32 }, r16: { label: "Round of 16", teams: 16 }, qf: { label: "Quarter Finals", teams: 8 }, sf: { label: "Semi Finals", teams: 4 } },
  },
  ucl2526: {
    label: "UEFA Champions League",
    icon: "⭐",
    groupTeams: 36,
    ranking: "UEFA Club Coefficient",
    ko: { r16: { label: "Round of 16", teams: 16 }, qf: { label: "Quarter Finals", teams: 8 }, sf: { label: "Semi Finals", teams: 4 } },
  },
  euros2028: {
    label: "UEFA Euros 2028",
    icon: "🏆",
    groupTeams: 24,
    ranking: "UEFA Nations League Ranking",
    ko: { r16: { label: "Round of 16", teams: 16 }, qf: { label: "Quarter Finals", teams: 8 }, sf: { label: "Semi Finals", teams: 4 } },
  },
} as const;

type CompKey = keyof typeof COMPS;
type Step = 1 | 2 | 3 | 4;

function validPlayerCounts(teamCount: number): number[] {
  const v: number[] = [];
  for (let i = 2; i <= teamCount; i++) {
    if (teamCount % i === 0) v.push(i);
  }
  return v;
}

const DRAW_MODE_DESCS: Record<string, string> = {
  automatic: "When the pool fills or deadline hits, every player opens the app and spins the wheel independently. Teams are hidden until everyone has spun.",
  host:      "You trigger the draw and spin for each player in sequence on your device. Perfect for office draws or group video calls.",
  live:      "Full-screen cinematic draw designed for big screens, livestreams, or projected displays. Each spin is slow and dramatic.",
};

const STEP_HEADINGS: Record<Step, [string, string]> = {
  1: ["Choose Competition", "Select tournament and pool stage"],
  2: ["Players & Contribution", "Set pool size and contribution amount"],
  3: ["Pool Settings", "Deadline, visibility and rules"],
  4: ["Review & Create", "Check everything before going live"],
};

// ── Component ───────────────────────────────────────────────────
export default function CreatePool() {
  const [state, action, pending] = useActionState(createPool, null);

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [comp, setComp] = useState<CompKey>("wc2026");
  const [poolName, setPoolName] = useState("");
  const [stage, setStage] = useState<"group" | "knockout">("group");
  const [koRound, setKoRound] = useState<string>("r16");

  // Step 2
  const [playerCount, setPlayerCount] = useState(8);
  const [entryMode, setEntryMode] = useState<"paid" | "free">("paid");
  const [betAmt, setBetAmt] = useState(20);
  const [playerErr, setPlayerErr] = useState(false);
  const [betErr, setBetErr] = useState(false);

  // Step 3
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [customExpiry, setCustomExpiry] = useState("7d");
  const [drawMode, setDrawMode] = useState("automatic");

  // Step 4
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ── Derived values ──────────────────────────────────────────
  const cfg = COMPS[comp];
  const teamCount =
    stage === "group"
      ? cfg.groupTeams
      : (cfg.ko as Record<string, { label: string; teams: number }>)[koRound]?.teams ?? 16;

  const validCounts = validPlayerCounts(teamCount);
  const isPlayerValid = teamCount % playerCount === 0;
  const teamsPerPlayer = isPlayerValid ? teamCount / playerCount : 0;
  const pot = entryMode === "paid" ? playerCount * betAmt : 0;
  const fee = pot * 0.10;
  const winnerGets = pot - fee;

  const koRounds = Object.entries(cfg.ko) as [string, { label: string; teams: number }][];

  // When comp changes, ensure koRound is valid
  const handleCompChange = useCallback((c: CompKey) => {
    setComp(c);
    const rounds = Object.keys(COMPS[c].ko);
    if (!rounds.includes(koRound)) setKoRound(rounds[0]);
    // Reset player count to a valid value for new team count
    const newTC = stage === "group" ? COMPS[c].groupTeams : (COMPS[c].ko as Record<string, { label: string; teams: number }>)[koRound]?.teams ?? 16;
    const newValids = validPlayerCounts(newTC);
    if (newTC % playerCount !== 0) setPlayerCount(newValids[Math.floor(newValids.length / 2)] ?? 8);
  }, [koRound, playerCount, stage]);

  // ── Validation per step ─────────────────────────────────────
  function validate(s: Step): boolean {
    if (s === 2) {
      const pErr = !isPlayerValid;
      const bErr = entryMode === "paid" && (isNaN(betAmt) || betAmt < 1);
      setPlayerErr(pErr);
      setBetErr(bErr);
      return !pErr && !bErr;
    }
    if (s === 4) {
      if (!termsAccepted) {
        alert("Please accept the terms to continue.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validate(step)) return;
    if (step < 4) setStep((step + 1) as Step);
  }
  function prevStep() {
    if (step > 1) setStep((step - 1) as Step);
  }

  const [title, sub] = STEP_HEADINGS[step];

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="create-wrap">
      {/* Nav */}
      <nav className="create-nav">
        <Link href="/" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>
          ← My Pools
        </Link>
        <span className="create-nav-logo">Sweeppot</span>
        {/* Light mode toggle hidden — dark theme only for now, re-enable if needed */}
        {/* <button
          className="mode-toggle"
          onClick={() => document.body.classList.toggle("light-mode")}
          title="Switch mode"
        >
          ☀️
        </button> */}
      </nav>

      <div className="create-body">
        {/* Step indicator */}
        <div className="steps-nav">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={`step-ind${step === s ? " active" : ""}${step > s ? " done" : ""}`}
            >
              <div className="step-num">{step > s ? "✓" : s}</div>
              {s === 1 ? "Competition" : s === 2 ? "Players" : s === 3 ? "Settings" : "Review"}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-hdr">
            <h2>{title}</h2>
            <p>{sub}</p>
          </div>

          <form action={action}>
            {/* Hidden fields — always submitted */}
            <input type="hidden" name="comp"          value={comp} />
            <input type="hidden" name="pool_name"     value={poolName} />
            <input type="hidden" name="stage"         value={stage} />
            <input type="hidden" name="ko_round"      value={koRound} />
            <input type="hidden" name="player_count"  value={playerCount} />
            <input type="hidden" name="entry_mode"    value={entryMode} />
            <input type="hidden" name="bet_amt"       value={betAmt} />
            <input type="hidden" name="visibility"    value={visibility} />
            <input type="hidden" name="custom_expiry" value={customExpiry} />
            <input type="hidden" name="draw_mode"     value={drawMode} />

            {/* ── Step 1: Competition ─────────────────────────── */}
            {step === 1 && (
              <div className="card-body">
                <div className="field">
                  <div className="fl">Tournament</div>
                  <div className="comp-grid">
                    {(Object.keys(COMPS) as CompKey[]).map((c) => (
                      <div className="comp-opt" key={c}>
                        <input
                          type="radio"
                          name="comp-ui"
                          id={`c-${c}`}
                          value={c}
                          checked={comp === c}
                          onChange={() => handleCompChange(c)}
                        />
                        <label className="comp-lbl" htmlFor={`c-${c}`}>
                          <span className="comp-icon">{COMPS[c].icon}</span>
                          <span className="comp-name">{COMPS[c].label.replace("UEFA ", "").replace("FIFA ", "")}</span>
                          <span className="comp-sub">{COMPS[c].groupTeams} teams</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <div className="fl">
                    Pool Name <span className="fh">Optional</span>
                  </div>
                  <input
                    className="fi"
                    type="text"
                    placeholder={`e.g. The Office ${cfg.label.split(" ").slice(-2).join(" ")}`}
                    maxLength={60}
                    value={poolName}
                    onChange={(e) => setPoolName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <div className="fl">Pool Stage</div>
                  <div className="stage-toggle">
                    <button
                      type="button"
                      className={`stage-btn${stage === "group" ? " active" : ""}`}
                      onClick={() => setStage("group")}
                    >
                      <span className="stage-btn-title">🏟️ Group Stage</span>
                      <span className="stage-btn-desc">Full tournament from the start</span>
                    </button>
                    <button
                      type="button"
                      className={`stage-btn${stage === "knockout" ? " active" : ""}`}
                      onClick={() => setStage("knockout")}
                    >
                      <span className="stage-btn-title">⚔️ Knockout Only</span>
                      <span className="stage-btn-desc">From a specific round</span>
                    </button>
                  </div>

                  {stage === "group" && (
                    <div className="info-box">
                      <strong>Full tournament sweepstake</strong> — draw happens before the first game.{" "}
                      Up to {cfg.groupTeams} players (one each) or{" "}
                      {validPlayerCounts(cfg.groupTeams)
                        .slice(0, -1)
                        .join(", ")}{" "}
                      players for multiple teams, split by {cfg.ranking}.
                    </div>
                  )}

                  {stage === "knockout" && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <select
                        className="fi"
                        value={koRound}
                        onChange={(e) => setKoRound(e.target.value)}
                      >
                        {koRounds.map(([k, r]) => (
                          <option key={k} value={k}>
                            {r.label} ({r.teams} teams)
                          </option>
                        ))}
                      </select>
                      <div className="fd">
                        {teamCount} teams.{" "}
                        {teamCount === 8
                          ? "Every match matters."
                          : teamCount === 4
                          ? "Winner-takes-all."
                          : ""}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Players & Fee ───────────────────────── */}
            {step === 2 && (
              <div className="card-body">
                <div className="field">
                  <div className="fl">Number of Players</div>
                  <div className="slider-wrap">
                    <div className="slider-top">
                      <div className="slider-val">{playerCount}</div>
                      <div className="slider-info">
                        {isPlayerValid ? (
                          <>
                            <div>
                              {teamsPerPlayer} team{teamsPerPlayer !== 1 ? "s" : ""} per player
                            </div>
                            {teamsPerPlayer > 1 && (
                              <div className="hi">Tier split ✓</div>
                            )}
                          </>
                        ) : (
                          <div style={{ color: "var(--red)" }}>Invalid</div>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={teamCount}
                      value={playerCount}
                      onChange={(e) => {
                        setPlayerCount(parseInt(e.target.value, 10));
                        setPlayerErr(false);
                      }}
                    />
                    <div className="fd">
                      {isPlayerValid
                        ? `${teamCount}÷${playerCount}=${teamsPerPlayer} each${teamsPerPlayer > 1 ? `, split by ${cfg.ranking}` : ""}. Deadline: 1hr before first game.`
                        : `${teamCount}÷${playerCount} invalid. Valid: ${validCounts.join(", ")}.`}
                    </div>
                  </div>
                  <div className={`ferr${playerErr ? " show" : ""}`}>
                    ⚠ Must divide evenly into team count
                  </div>
                </div>

                <div className="dvd" />

                <div className="field">
                  <div className="fl">
                    Contribution per Player <span className="fh">AUD</span>
                  </div>
                  <div className="entry-mode-toggle">
                    <label>
                      <input
                        type="radio"
                        name="entry-mode-ui"
                        value="paid"
                        checked={entryMode === "paid"}
                        onChange={() => setEntryMode("paid")}
                      />{" "}
                      Paid entry
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="entry-mode-ui"
                        value="free"
                        checked={entryMode === "free"}
                        onChange={() => setEntryMode("free")}
                      />{" "}
                      Free sweepstake
                    </label>
                  </div>

                  {entryMode === "paid" && (
                    <>
                      <div className="amt-wrap">
                        <span className="amt-sym">$</span>
                        <input
                          className="fi amt-input"
                          type="number"
                          min={1}
                          max={10000}
                          value={betAmt}
                          onChange={(e) => {
                            setBetAmt(parseFloat(e.target.value));
                            setBetErr(false);
                          }}
                        />
                      </div>
                      <div className={`ferr${betErr ? " show" : ""}`}>
                        ⚠ Minimum $1
                      </div>
                      <div className="pot-preview">
                        <div>
                          <div className="pot-lbl">Total Pot</div>
                          <div className="pot-amt">${pot.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="pot-lbl" style={{ textAlign: "right" }}>
                            Winner Gets
                          </div>
                          <div className="pot-amt">${winnerGets.toFixed(0)}</div>
                          <div className="pot-fee">After 10% service fee (${fee.toFixed(2)})</div>
                        </div>
                      </div>
                    </>
                  )}

                  {entryMode === "free" && (
                    <div className="free-entry-note show">
                      ✓ Free sweepstake — no contribution required, no pool total. Great for office fun, casual
                      groups, or testing the platform.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Settings ────────────────────────────── */}
            {step === 3 && (
              <div className="card-body">
                <div className="field">
                  <div className="fl">Visibility</div>
                  <div className="radio-group">
                    <div className="radio-opt">
                      <input
                        type="radio"
                        name="vis-ui"
                        id="v-priv"
                        value="private"
                        checked={visibility === "private"}
                        onChange={() => setVisibility("private")}
                      />
                      <label className="radio-lbl" htmlFor="v-priv">
                        <span className="radio-title">🛡️ Private</span>
                        <span className="radio-desc">Invite-only via link</span>
                      </label>
                    </div>
                    <div className="radio-opt">
                      <input
                        type="radio"
                        name="vis-ui"
                        id="v-pub"
                        value="public"
                        checked={visibility === "public"}
                        onChange={() => setVisibility("public")}
                      />
                      <label className="radio-lbl" htmlFor="v-pub">
                        <span className="radio-title">🌐 Public</span>
                        <span className="radio-desc">Listed in discovery</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="dvd" />

                <div className="field">
                  <div className="fl">Joining Deadline</div>
                  <div className="dl-box">
                    <div className="dl-title">⏱ How the deadline works</div>
                    <div className="dl-rule">
                      <span>🛡️</span>
                      <div>
                        Pool <strong>always closes 1 hour before the first game</strong>. Late
                        payments auto-refunded.
                      </div>
                    </div>
                    <div className="dl-rule">
                      <span>📅</span>
                      <div>
                        Set an earlier custom expiry below if you want. The{" "}
                        <strong>earlier date always wins</strong>.
                      </div>
                    </div>
                    <div className="dl-rule">
                      <span>👁</span>
                      <div>
                        All teams <strong>drawn and revealed simultaneously</strong> when the pool
                        fills or deadline hits — whichever comes first.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <div className="fl">
                    Custom Expiry <span className="fh">Optional</span>
                  </div>
                  <select
                    className="fi"
                    value={customExpiry}
                    onChange={(e) => setCustomExpiry(e.target.value)}
                  >
                    <option value="none">No custom expiry — use game deadline only</option>
                    <option value="24h">24 hours from now</option>
                    <option value="48h">48 hours from now</option>
                    <option value="7d">7 days from now</option>
                    <option value="30d">30 days from now</option>
                  </select>
                </div>

                <div className="dvd" />

                <div className="field">
                  <div className="fl">Partial Pool Rules</div>
                  <div className="rules-box">
                    <div className="rule-row">
                      <span className="rule-icon">✓</span>
                      <div>
                        <strong>Pool must fill to run</strong> — the draw triggers when all spots are
                        taken or the deadline hits with at least 4 players joined.
                      </div>
                    </div>
                    <div className="rule-row">
                      <span className="rule-icon">↩</span>
                      <div>
                        <strong>Auto-refund if not filled</strong> — if fewer than 4 players join
                        before the deadline, everyone is refunded automatically.
                      </div>
                    </div>
                    <div className="rule-row">
                      <span className="rule-icon">🏆</span>
                      <div>
                        <strong>One winner, full stop</strong> — every team is assigned to exactly
                        one player. The player whose team wins the tournament takes the full pot.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dvd" />

                <div className="field">
                  <div className="fl">
                    Draw mode <span className="fh">how teams are assigned</span>
                  </div>
                  <div className="radio-group radio-group-col">
                    {["automatic", "host", "live"].map((mode) => (
                      <div className="radio-opt" key={mode}>
                        <input
                          type="radio"
                          name="draw-mode-ui"
                          id={`dm-${mode}`}
                          value={mode}
                          checked={drawMode === mode}
                          onChange={() => setDrawMode(mode)}
                        />
                        <label className="radio-lbl" htmlFor={`dm-${mode}`}>
                          <span className="radio-title">
                            {mode === "automatic"
                              ? "Automatic"
                              : mode === "host"
                              ? "Host-led draw"
                              : "Live event"}
                            {mode === "automatic" && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  background: "rgba(198,241,53,0.15)",
                                  color: "var(--green)",
                                  padding: "0.1rem 0.4rem",
                                  marginLeft: "4px",
                                }}
                              >
                                Default
                              </span>
                            )}
                          </span>
                          <span className="radio-desc">{DRAW_MODE_DESCS[mode]}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {drawMode && (
                    <div className="draw-mode-info">{DRAW_MODE_DESCS[drawMode]}</div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 4: Review ──────────────────────────────── */}
            {step === 4 && (
              <div className="card-body">
                {state?.error && (
                  <div className="create-err">{state.error}</div>
                )}
                <div className="rev-grid">
                  <div className="rev-item">
                    <div className="rev-key">Pool Name</div>
                    <div className="rev-val">{poolName || cfg.label}</div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Competition</div>
                    <div className="rev-val">{cfg.icon} {cfg.label}</div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Stage</div>
                    <div className="rev-val">
                      {stage === "group"
                        ? `🏟️ Group Stage (${teamCount} teams)`
                        : `⚔️ ${(cfg.ko as Record<string, { label: string; teams: number }>)[koRound]?.label} (${teamCount} teams)`}
                    </div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Players</div>
                    <div className="rev-val rv-g">{playerCount} players</div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Teams per Player</div>
                    <div className="rev-val">{teamsPerPlayer}{teamsPerPlayer > 1 ? " (tier split)" : ""}</div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Contribution</div>
                    <div className="rev-val rv-g">
                      {entryMode === "free" ? "Free" : `$${betAmt.toFixed(0)} AUD each`}
                    </div>
                  </div>
                  {entryMode === "paid" && (
                    <>
                      <div className="rev-item">
                        <div className="rev-key">Pool Total</div>
                        <div className="rev-val rv-o">${pot.toFixed(0)} AUD</div>
                      </div>
                      <div className="rev-item">
                        <div className="rev-key">Service Fee (10%)</div>
                        <div className="rev-val" style={{ color: "var(--muted)" }}>−${fee.toFixed(0)} AUD</div>
                      </div>
                      <div className="rev-item">
                        <div className="rev-key">Winner Receives</div>
                        <div className="rev-val rv-o">${winnerGets.toFixed(0)} AUD</div>
                      </div>
                    </>
                  )}
                  <div className="rev-item">
                    <div className="rev-key">Visibility</div>
                    <div className="rev-val">{visibility === "private" ? "🛡️ Private" : "🌐 Public"}</div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Draw Mode</div>
                    <div className="rev-val" style={{ textTransform: "capitalize" }}>{drawMode}</div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Expiry</div>
                    <div className="rev-val">
                      {customExpiry === "none"
                        ? "Game deadline"
                        : customExpiry === "24h" ? "24 hours"
                        : customExpiry === "48h" ? "48 hours"
                        : customExpiry === "7d"  ? "7 days"
                        : "30 days"}
                    </div>
                  </div>
                  <div className="rev-item">
                    <div className="rev-key">Ranking Split</div>
                    <div className="rev-val">{cfg.ranking}</div>
                  </div>
                </div>

                <label className="terms-row">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span className="terms-txt">
                    I confirm this is a private pool between friends and agree to the{" "}
                    <a href="#">Sweeppot Terms</a>. The 10% service fee is non-refundable once teams are
                    assigned.
                  </span>
                </label>
              </div>
            )}

            {/* ── Footer nav ──────────────────────────────────── */}
            <div className="card-ftr">
              <button
                type="button"
                className="btn-back"
                onClick={prevStep}
                style={{ visibility: step > 1 ? "visible" : "hidden" }}
              >
                ← Back
              </button>

              {step < 4 ? (
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pending || !termsAccepted}
                >
                  {pending ? "Creating…" : "Create Pool →"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
