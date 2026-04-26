"use client";

import { useState, useRef, KeyboardEvent } from "react";
import Link from "next/link";

type PresetKey = "Premier League" | "Champions League" | "World Cup 2026" | "Melbourne Cup";

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
  "Melbourne Cup": [
    "Without a Fight", "Vauban", "Gold Trip", "Incentivise", "Twilight Payment",
    "Vow And Declare", "Cross Counter", "Rekindling", "Almandin", "Protectionist",
    "Makybe Diva", "Efficient", "Shocking", "Delta Blues", "Saintly",
    "Media Puzzle", "Ethereal", "Kingston Rule", "Galilee", "Rain Lover",
    "Think Big", "Light Fingers", "Prince of Penzance", "Green Moon",
  ],
};

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

interface DrawResult {
  participant: string;
  team: string;
}

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
  const [participants, setParticipants] = useState<string[]>(["", ""]);
  const [teams, setTeams] = useState<string[]>(["", ""]);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [results, setResults] = useState<DrawResult[] | null>(null);
  const [newParticipant, setNewParticipant] = useState("");
  const [newTeam, setNewTeam] = useState("");

  const pInputRef = useRef<HTMLInputElement>(null);
  const tInputRef = useRef<HTMLInputElement>(null);

  const validParticipants = participants.filter((p) => p.trim() !== "");
  const validTeams = teams.filter((t) => t.trim() !== "");
  const teamsShort = validParticipants.length >= 2 && validTeams.length > 0 && validTeams.length < validParticipants.length;
  const canDraw = validParticipants.length >= 2 && validTeams.length >= validParticipants.length;

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

  // Remove a participant at the given index, keeping minimum 2 slots
  function removeParticipant(i: number) {
    setParticipants((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Load a preset and replace the current team list
  function loadPreset(key: PresetKey) {
    setTeams([...PRESETS[key]]);
    setActivePreset(key);
    setNewTeam("");
    setResults(null);
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

  // Shuffle teams and pair one unique team per participant
  function runDraw() {
    if (!canDraw) return;
    const shuffledTeams = shuffle(validTeams);
    const draw: DrawResult[] = validParticipants.map((name, i) => ({
      participant: name,
      team: shuffledTeams[i],
    }));
    setResults(draw);
    setTimeout(() => {
      document.getElementById("gen-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  // Reset the entire form back to its initial empty state
  function reset() {
    setParticipants(["", ""]);
    setTeams(["", ""]);
    setActivePreset(null);
    setResults(null);
    setNewParticipant("");
    setNewTeam("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
          <Link href="/pool/create" className="nav-btn hi" style={{ textDecoration: "none" }}>
            + Create Pool
          </Link>
        </div>
      </nav>

      <div className="gen-wrap">
        <header className="gen-hdr">
          <h1 className="gen-h1">Free Sweepstake Generator</h1>
          <p className="gen-sub">
            Enter participants and teams, click Generate, and the draw happens instantly.
            No account needed — completely free.
          </p>
        </header>

        {!results && (
          <div className="gen-grid">
            {/* ── Participants ── */}
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

            {/* ── Teams ── */}
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
        )}

        {/* Validation warning */}
        {!results && teamsShort && (
          <div className="gen-warning" role="alert">
            You need at least as many teams as participants — add more teams or remove participants.
          </div>
        )}

        {/* Primary action */}
        <div className="gen-actions">
          {!results ? (
            <>
              <button className="gen-draw-btn" onClick={runDraw} disabled={!canDraw}>
                Generate Draw →
              </button>
              {!canDraw && !teamsShort && (
                <p className="gen-hint">Add at least 2 participants and 2 teams to continue.</p>
              )}
            </>
          ) : (
            <button className="gen-reset-btn" onClick={reset}>
              ← Start Over
            </button>
          )}
        </div>

        {/* Results */}
        {results && (
          <section id="gen-results" className="gen-results" aria-label="Draw results">
            <div className="gen-results-hdr">
              <div className="gen-results-title">Draw Results</div>
              <div className="gen-results-sub">
                {results.length} participant{results.length !== 1 ? "s" : ""} — teams assigned randomly
              </div>
            </div>
            <ol className="gen-results-list">
              {results.map((r, i) => (
                <li key={i} className="gen-result-row">
                  <span className="gen-result-num">{i + 1}</span>
                  <span className="gen-result-name">{r.participant}</span>
                  <span className="gen-result-arrow" aria-hidden="true">→</span>
                  <span className="gen-result-team">{r.team}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* CTA */}
        <div className="gen-cta">
          <div className="gen-cta-title">Want to make it official?</div>
          <p className="gen-cta-sub">
            Sweeppot handles payments, draws, and payouts automatically.
          </p>
          <Link href="/pool/create" className="lp-btn-primary" style={{ textDecoration: "none" }}>
            Create a Pool →
          </Link>
        </div>

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
    </>
  );
}
