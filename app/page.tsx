"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { createClient } from "@/lib/supabase";
import { logout, resendVerification } from "@/app/auth/actions";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Screen = "landing" | "home" | "invite" | "waiting";
type Tab    = "myPools" | "results" | "news" | "browse";

interface Team { n: string; f: string; r: number; tier?: number; }
interface Participant { name: string; paid: boolean; spun: boolean; assignedTeams: Team[]; }
interface DemoPool { id: string; name: string; comp: string; compLabel: string; icon: string; status: "waiting"|"active"|"complete"; spotsTotal: number; spotsFilled: number; daysLeft: number; pot: number; betAud: number; }
interface InvitedPool { id: string; name: string; comp: string; from: string; spots: number; total: number; buyin: number; pot: number; daysLeft: number; }

// ─────────────────────────────────────────────
// Static data (mirrors prototype)
// ─────────────────────────────────────────────
const WC_TEAMS: Team[] = [
  {n:"France",f:"🇫🇷",r:1},{n:"Brazil",f:"🇧🇷",r:2},{n:"England",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",r:3},{n:"Portugal",f:"🇵🇹",r:4},
  {n:"Spain",f:"🇪🇸",r:5},{n:"Argentina",f:"🇦🇷",r:6},{n:"Germany",f:"🇩🇪",r:7},{n:"Netherlands",f:"🇳🇱",r:8},
  {n:"USA",f:"🇺🇸",r:9},{n:"Croatia",f:"🇭🇷",r:10},{n:"Switzerland",f:"🇨🇭",r:11},{n:"Mexico",f:"🇲🇽",r:12},
  {n:"Japan",f:"🇯🇵",r:13},{n:"Morocco",f:"🇲🇦",r:14},{n:"Australia",f:"🇦🇺",r:15},{n:"South Korea",f:"🇰🇷",r:16},
];

const DEMO_POOLS: DemoPool[] = [
  {id:"pool_abc",name:"The Office WC 2026",comp:"wc2026",compLabel:"FIFA World Cup 2026",icon:"🌍",status:"waiting",spotsTotal:8,spotsFilled:3,daysLeft:6,pot:160,betAud:20},
  {id:"pool_def",name:"UCL Lads 25/26",comp:"ucl2526",compLabel:"Champions League",icon:"⭐",status:"active",spotsTotal:8,spotsFilled:8,daysLeft:0,pot:480,betAud:30},
  {id:"pool_ghi",name:"Family Euros 2028",comp:"euros2028",compLabel:"UEFA Euros 2028",icon:"🏆",status:"complete",spotsTotal:12,spotsFilled:12,daysLeft:0,pot:240,betAud:20},
];
const DEMO_RESULTS = [
  {comp:"Champions League",home:"Arsenal",away:"Real Madrid",score:"2-1",round:"Quarter Final",myTeamHome:true},
  {comp:"Champions League",home:"Liverpool",away:"Bayern Munich",score:"3-3",round:"Quarter Final",myTeamHome:false},
  {comp:"Champions League",home:"PSG",away:"Barcelona",score:"1-0",round:"Quarter Final",myTeamHome:false},
  {comp:"Champions League",home:"Atlético",away:"Inter Milan",score:"0-2",round:"Quarter Final",myTeamHome:false},
];
const DEMO_NEWS = [
  {tag:"wc" as const,comp:"World Cup 2026",hl:"FIFA confirms 48-team format with 12 groups of four for 2026",time:"2 hours ago"},
  {tag:"ucl" as const,comp:"Champions League",hl:"Arsenal advance to UCL semi-finals after comeback vs Real Madrid",time:"5 hours ago"},
  {tag:"ucl" as const,comp:"Champions League",hl:"Arteta: 'We believe we can win this tournament'",time:"6 hours ago"},
  {tag:"wc" as const,comp:"World Cup 2026",hl:"Australia qualify for World Cup 2026 via intercontinental playoff",time:"1 day ago"},
  {tag:"euro" as const,comp:"Euros 2028",hl:"UEFA announces Euros 2028 co-hosted by UK and Ireland",time:"2 days ago"},
  {tag:"ucl" as const,comp:"Champions League",hl:"Draw confirmed: Liverpool face Leverkusen in UCL semi-final",time:"2 days ago"},
];
const INVITED_POOLS: InvitedPool[] = [
  {id:"pool_inv1",name:"Marketing Team WC 2026",comp:"FIFA World Cup 2026 🌍",from:"Jamie Clarke",spots:5,total:8,buyin:20,pot:160,daysLeft:4},
  {id:"pool_inv2",name:"Five-a-side UCL Sweep",comp:"Champions League ⭐",from:"Sarah O'Brien",spots:2,total:6,buyin:30,pot:180,daysLeft:12},
];

const HOW_STEPS = [
  { n:1, title:"Create your sweepstake",    desc:"Choose the tournament, set the entry fee or make it free, pick your player limit, and send the invite link." },
  { n:2, title:"Everyone pays up front",    desc:"Each player makes their contribution by card. Funds are held securely until the winner is confirmed. A 10% service fee covers payment processing and platform costs — every penny of your contribution goes into the pool total." },
  { n:3, title:"The draw happens together", desc:"When everyone is in or the deadline arrives, teams are drawn for all players at the same moment." },
  { n:4, title:"Follow the tournament live",desc:"Your sweepstake page tracks every match. See who is still in, who has been knocked out, and who is leading." },
  { n:5, title:"Funds released automatically", desc:"When the final whistle blows, the pool total is released to the winner. No chasing. No awkward conversations." },
];

// ─────────────────────────────────────────────
// Demo overlay helpers  (plain DOM — no React state)
// These mirror the prototype's showDemoWheelDraw / runBracketAnimation / showDemoWinnerBanner
// ─────────────────────────────────────────────

function cleanupDemo() {
  ["demoOverlay","demoBanner","demoTournament","demoWheelOverlay"].forEach(id => {
    document.getElementById(id)?.remove();
  });
  removeNarrator();
}

function launchConfetti() {
  const el = document.getElementById("confettiEl");
  if (!el) return;
  const light = document.body.classList.contains("light-mode");
  const cols = light
    ? ["#1B5E20","#2E7D32","#388E3C","#66BB6A","#C5E1A5"]
    : ["#C6F135","#78909C","#40C4FF","#ECEFF1","#90A4AE"];
  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      const p = document.createElement("div");
      p.className = "cp";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = cols[Math.floor(Math.random() * cols.length)];
      p.style.width  = (6 + Math.random() * 8) + "px";
      p.style.height = (6 + Math.random() * 8) + "px";
      p.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
      p.style.animationDuration = (2 + Math.random() * 2) + "s";
      el.appendChild(p);
      setTimeout(() => p.remove(), 5000);
    }, i * 25);
  }
}

const NARRATOR = [
  {step:'Step 1 of 6', text:'8 friends join the pool and make their contribution upfront — funds are held securely until the tournament ends'},
  {step:'Step 2 of 6', text:"Everyone's in. Teams are assigned randomly and fairly by Sweeppot — no one can influence the draw"},
  {step:'Step 3 of 6', text:"Spin the wheel to reveal your team — it's pure chance, assigned the moment the pool fills"},
  {step:'Step 3 of 6', text:'Every player gets a different team. No two players share a team'},
  {step:'Step 4 of 6', text:'Your team enters the tournament — follow their progress through every knockout round'},
  {step:'Step 5 of 6', text:'Still in it — every win brings you closer to the pool total'},
  {step:'Step 5 of 6', text:'Into the semis. The full pool total is waiting'},
  {step:'Step 6 of 6', text:'One game from winning everything — this is what everyone paid in for'},
  {step:'Step 6 of 6', text:'Your team won the tournament. Funds are being released automatically to your account.'},
];

function showNarrator(i: number) {
  removeNarrator();
  const s = NARRATOR[i]; if (!s) return;
  const bar = document.createElement("div");
  bar.id = "demoNarrator";
  bar.className = "demo-narrator";
  bar.innerHTML = '<div class="demo-narrator-step">' + s.step + '</div>'
    + '<div class="demo-narrator-text">' + s.text + '</div>';
  document.body.appendChild(bar);
}

function removeNarrator() {
  document.getElementById("demoNarrator")?.remove();
}

function showDemoPaymentInterstitial(winAmt: number, team: Team) {
  cleanupDemo();
  showNarrator(8);
  const t = team || { n: "Brazil", f: "🇧🇷" };
  const overlay = document.createElement("div");
  overlay.id = "demoTournament";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(10,20,15,0.96);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem;";
  overlay.innerHTML =
    '<button onclick="window.__sweeppotGoHome()" style="position:fixed;top:1rem;right:1rem;background:transparent;border:1px solid var(--border);color:var(--muted);font-size:0.8rem;padding:0.3rem 0.7rem;cursor:pointer;z-index:301;font-family:var(--font-barlow-condensed),sans-serif;font-weight:600;letter-spacing:0.07em;">✕ EXIT</button>'
    + '<div style="max-width:560px;width:100%;display:flex;flex-direction:column;gap:1.2rem;">'
    + '<div style="font-size:0.62rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--green);border-bottom:1px solid var(--border);padding-bottom:0.6rem;">The Final · Jul 19 · New York</div>'
    + '<div style="background:var(--card);border:2px solid rgba(198,241,53,0.5);padding:1.2rem 1.4rem;">'
      + '<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.6rem;">'
        + '<span style="font-size:1.6rem;">' + (t.f || "🏆") + '</span>'
        + '<div>'
          + '<div style="font-family:var(--font-bebas-neue),sans-serif;font-size:1.5rem;color:var(--green);letter-spacing:0.05em;">' + (t.n || "Your Team") + ' Won the Tournament</div>'
          + '<div style="font-size:0.65rem;color:rgba(198,241,53,0.6);text-transform:uppercase;letter-spacing:0.1em;">Your team</div>'
        + '</div>'
        + '<div style="margin-left:auto;font-size:0.8rem;color:var(--green);font-weight:700;">Won on penalties!</div>'
      + '</div>'
      + '<div style="height:1px;background:var(--border);margin:0.5rem 0;"></div>'
      + '<div style="display:flex;align-items:baseline;gap:0.5rem;">'
        + '<span style="font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;">Pool total</span>'
        + '<span style="font-family:var(--font-bebas-neue),sans-serif;font-size:1.8rem;color:var(--green);letter-spacing:0.03em;">$' + (winAmt || 0) + ' AUD</span>'
      + '</div>'
    + '</div>'
    + '<div style="background:rgba(198,241,53,0.04);border:1px solid rgba(198,241,53,0.22);padding:1.1rem 1.4rem;">'
      + '<div style="font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--green);margin-bottom:0.5rem;">Payment Status</div>'
      + '<div style="font-size:0.95rem;color:#ECEFF1;line-height:1.7;font-weight:500;">Funds are being released automatically to you — paid securely and instantly.</div>'
    + '</div>'
    + '<div id="payInterActions" style="text-align:center;margin-top:0.5rem;"></div>'
    + '</div>';
  document.body.appendChild(overlay);
  const payNextBtn = document.createElement("button");
  payNextBtn.textContent = "Collect Winnings →";
  payNextBtn.style.cssText = "background:var(--green);color:var(--dark);border:none;padding:0.75rem 1.9rem;font-family:var(--font-barlow-condensed),sans-serif;font-weight:700;font-size:0.9rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);";
  payNextBtn.onclick = () => { overlay.remove(); showDemoWinnerBanner(winAmt, team); };
  document.getElementById("payInterActions")?.appendChild(payNextBtn);
}

function showDemoWinnerBanner(winAmt: number, team: Team) {
  cleanupDemo();
  const t = team || { n: "Brazil", f: "🇧🇷" };
  const banner = document.createElement("div");
  banner.id = "demoBanner";
  banner.style.cssText = "position:fixed;inset:0;background:rgba(10,20,15,0.9);z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem;";
  banner.innerHTML =
    '<div style="background:var(--dark2);border:2px solid var(--green);max-width:440px;width:100%;padding:2.2rem;text-align:center;position:relative;">'
    + '<button onclick="window.__sweeppotGoHome()" style="position:absolute;top:0.7rem;right:0.9rem;background:transparent;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>'
    + '<div style="font-family:var(--font-bebas-neue),sans-serif;font-size:2.5rem;color:var(--green);letter-spacing:0.05em;margin-bottom:0.2rem;">You Win!</div>'
    + '<div style="font-size:0.88rem;color:var(--muted);margin-bottom:0.8rem;">' + (t.f || "") + "&nbsp;" + t.n + " won the tournament</div>"
    + '<div style="font-family:var(--font-bebas-neue),sans-serif;font-size:3rem;color:var(--gold);letter-spacing:0.03em;margin-bottom:1rem;">' + (winAmt > 0 ? "$" + winAmt + " AUD" : "Winner!") + " </div>"
    + '<div style="font-size:0.95rem;color:#ECEFF1;line-height:1.75;margin-bottom:1.6rem;padding:0 0.5rem;">'
      + (winAmt > 0 ? "Funds released to you — paid automatically and securely." : "This was a free sweepstake — bragging rights this time. Set up a paid pool to play for real.")
    + '</div>'
    + '<button onclick="window.__sweeppotGoHome()" style="background:var(--green);color:var(--dark);border:none;padding:0.75rem 1.9rem;font-family:var(--font-barlow-condensed),sans-serif;font-weight:700;font-size:0.9rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);width:100%);">Start Your Own Sweepstake →</button>'
    + "</div>";
  document.body.appendChild(banner);
  launchConfetti(); launchConfetti();
}

interface AssignedResult { team: Team; player: string; isYou: boolean; }

function runBracketAnimation(assigned: AssignedResult[], pot: number) {
  cleanupDemo();
  const myTeam = assigned.find(r => r.isYou) || assigned[0];
  const prize  = pot - Math.round(pot * 0.10);

  // Build bracket rounds
  const r16Matches = [
    {home:assigned[0],away:{team:{n:"Japan",f:"🇯🇵"},player:"Bot",isYou:false},homeWin:true,score:"2–0"},
    {home:assigned[1],away:{team:{n:"Germany",f:"🇩🇪"},player:"Bot",isYou:false},homeWin:true,score:"2–1"},
    {home:assigned[2],away:{team:{n:"Colombia",f:"🇨🇴"},player:"Bot",isYou:false},homeWin:true,score:"1–0"},
    {home:assigned[3],away:{team:{n:"Morocco",f:"🇲🇦"},player:"Bot",isYou:false},homeWin:true,score:"2–1"},
    {home:assigned[4],away:{team:{n:"Mexico",f:"🇲🇽"},player:"Bot",isYou:false},homeWin:false,score:"1–2"},
    {home:assigned[5],away:{team:{n:"USA",f:"🇺🇸"},player:"Bot",isYou:false},homeWin:true,score:"1–0"},
    {home:assigned[6],away:{team:{n:"Australia",f:"🇦🇺"},player:"Bot",isYou:false},homeWin:true,score:"3–0"},
    {home:assigned[7],away:{team:{n:"Ecuador",f:"🇪🇨"},player:"Bot",isYou:false},homeWin:true,score:"2–1"},
  ];
  const r16W = r16Matches.map(m => m.homeWin ? m.home : m.away);
  const qfMatches = [
    {home:r16W[0],away:r16W[4],homeWin:true,score:"1–0"},
    {home:r16W[1],away:r16W[5],homeWin:true,score:"2–1"},
    {home:r16W[2],away:r16W[6],homeWin:false,score:"0–1"},
    {home:r16W[3],away:r16W[7],homeWin:true,score:"2–1"},
  ];
  let qfW = qfMatches.map(m => m.homeWin ? m.home : m.away);
  if (!qfW.some(r => r.isYou)) qfW[0] = myTeam;
  const sfMatches = [
    {home:qfW[0],away:qfW[2],homeWin:qfW[0].isYou||true,score:"2–1 AET"},
    {home:qfW[1],away:qfW[3],homeWin:false,score:"1–2"},
  ];
  let sfW = sfMatches.map(m => m.homeWin ? m.home : m.away);
  if (!sfW.some(r => r.isYou)) sfW[0] = myTeam;
  const finMatch = [{home:sfW[0],away:sfW[1],homeWin:sfW[0].isYou,score:"Won on penalties!"}];

  const bracket = [
    {round:"Round of 16",date:"Jul 4–7",matches:r16Matches},
    {round:"Quarter Finals",date:"Jul 11–12",matches:qfMatches},
    {round:"Semi Finals",date:"Jul 15–16",matches:sfMatches},
    {round:"The Final",date:"Jul 19 · New York",matches:finMatch},
  ];

  const overlay = document.createElement("div");
  overlay.id = "demoTournament";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(10,20,15,0.96);z-index:300;overflow-y:auto;padding:1.5rem 1rem;";
  overlay.innerHTML =
    '<button onclick="window.__sweeppotGoHome()" style="position:fixed;top:1rem;right:1rem;background:transparent;border:1px solid var(--border);color:var(--muted);font-size:0.8rem;padding:0.3rem 0.7rem;cursor:pointer;z-index:301;font-family:var(--font-barlow-condensed),sans-serif;font-weight:600;letter-spacing:0.07em;">✕ EXIT</button>'
    + '<div style="max-width:900px;margin:0 auto;"><div id="bracketAnimContent"></div>'
    + '<div id="bracketAnimStatus" style="text-align:center;padding:1.5rem 0;font-size:0.85rem;color:var(--muted);"></div></div>';
  document.body.appendChild(overlay);

  function teamLine(r: AssignedResult, won: boolean, score: string) {
    if (!r?.team) return "";
    const iy = r.isYou;
    return '<div style="display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0;'
      + (iy ? "background:rgba(198,241,53,0.06);" : "")
      + (!won ? "opacity:0.45;text-decoration:line-through;" : "") + '">'
      + '<span style="font-size:0.9rem;width:20px;text-align:center;">' + (r.team.f || "⚽") + "</span>"
      + '<div style="flex:1;">'
        + '<div style="font-weight:700;font-size:0.82rem;color:' + (iy ? "var(--green)" : "var(--text)") + ';">'
          + r.team.n + "</div>"
        + '<div style="font-size:0.6rem;color:' + (iy ? "var(--green)" : "var(--dim)") + ';">' + (iy ? "Your team" : r.player) + "</div>"
      + "</div>"
      + (won ? '<div style="font-size:0.7rem;color:var(--green);font-weight:700;">' + score + "</div>" : "")
      + "</div>";
  }

  function showRound(idx: number) {
    if (idx >= bracket.length) return;
    const statusEl = document.getElementById("bracketAnimStatus");
    const rd = bracket[idx];
    const isFinal = idx === 3;
    if (statusEl) {
      statusEl.innerHTML = isFinal
        ? '<span style="color:var(--green);font-weight:700;font-size:1rem;">THE FINAL — $' + prize + ' AUD on the line</span>'
        : '<span style="color:var(--green);">' + rd.round + " · " + rd.date + "</span>";
      if (idx === 0) {
        const introEl = document.createElement("div");
        introEl.style.cssText = "font-size:0.78rem;color:var(--muted);margin-top:0.5rem;line-height:1.6;";
        introEl.textContent = "Watch as your team progresses through the competition. Hopefully they go all the way.";
        statusEl.appendChild(introEl);
      }
    }
    showNarrator([4,5,6,7][idx] || 4);
    const content = document.getElementById("bracketAnimContent");
    if (!content) return;
    const roundEl = document.createElement("div");
    roundEl.style.cssText = "margin-bottom:1.5rem;";
    roundEl.innerHTML =
      '<div style="font-size:0.62rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--green);margin-bottom:0.7rem;border-bottom:1px solid var(--border);padding-bottom:0.4rem;">'
        + rd.round + '<span style="font-weight:400;font-size:0.58rem;opacity:0.7;margin-left:0.6rem;">' + rd.date + "</span></div>"
      + '<div id="matchGrid_' + idx + '" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0.5rem;"></div>';
    content.appendChild(roundEl);
    // Center the new round in the viewport so it isn't pushed to the edge
    setTimeout(() => roundEl.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    const matchGrid = document.getElementById("matchGrid_" + idx);
    if (!matchGrid) return;
    rd.matches.forEach((m, mi) => {
      setTimeout(() => {
        const w = m.homeWin ? m.home : m.away;
        const card = document.createElement("div");
        card.style.cssText = "background:var(--card);border:1px solid " + (w.isYou ? "rgba(198,241,53,0.4)" : "var(--border)") + ";padding:0.55rem 0.7rem;opacity:0;transition:opacity 0.5s;";
        card.innerHTML =
          teamLine(m.home as AssignedResult, m.homeWin, m.score)
          + '<div style="height:1px;background:var(--border);margin:0.15rem 0;"></div>'
          + teamLine(m.away as AssignedResult, !m.homeWin, m.score);
        matchGrid.appendChild(card);
        requestAnimationFrame(() => requestAnimationFrame(() => { card.style.opacity = "1"; }));
        if (mi === rd.matches.length - 1) {
          setTimeout(() => {
            if (isFinal) {
              // Show prize pot then pause for user — only "Next →" in the entire bracket flow
              const prizePotEl = document.createElement("div");
              prizePotEl.style.cssText = "text-align:center;margin-top:1rem;padding:0.75rem;background:rgba(198,241,53,0.06);border:1px solid rgba(198,241,53,0.25);";
              prizePotEl.innerHTML =
                '<div style="font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Pool Total</div>'
                + '<div style="font-family:var(--font-bebas-neue),sans-serif;font-size:2rem;color:var(--green);">$' + prize + " AUD</div>"
                + '<div style="font-size:0.65rem;color:var(--dim);">Funds released to whoever\'s team wins the competition — paid automatically and securely</div>';
              roundEl.appendChild(prizePotEl);
              // Scroll prize pot to center, clear of any bottom UI
              setTimeout(() => prizePotEl.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
              const nextDiv = document.createElement("div");
              nextDiv.style.cssText = "text-align:center;padding:1rem 0;";
              const nextBtn = document.createElement("button");
              nextBtn.textContent = "Next →";
              nextBtn.style.cssText = "background:var(--green);color:var(--dark);border:none;padding:0.6rem 1.5rem;font-weight:700;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;";
              nextBtn.onclick = () => { overlay.remove(); showDemoPaymentInterstitial(prize, myTeam.team); };
              nextDiv.appendChild(nextBtn);
              roundEl.appendChild(nextDiv);
            } else {
              // Auto-advance to the next round — no user input required between rounds
              setTimeout(() => showRound(idx + 1), 1500);
            }
          }, 500);
        }
      }, mi * 1500);
    });
  }
  showRound(0);
}

function showDemoPoolFullPopup(pot: number) {
  cleanupDemo();
  showNarrator(1);

  const popup = document.createElement("div");
  popup.id = "demoOverlay";
  popup.style.cssText = "position:fixed;inset:0;background:rgba(10,20,15,0.88);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem;";

  popup.innerHTML =
    '<div style="background:var(--dark2);border:2px solid var(--green);max-width:420px;width:100%;padding:2rem;text-align:center;position:relative;">'
    + '<button onclick="window.__sweeppotGoHome()" style="position:absolute;top:0.7rem;right:0.9rem;background:transparent;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>'
    + '<div style="font-size:1.8rem;font-weight:900;color:var(--green);letter-spacing:0.05em;margin-bottom:0.5rem;">Pool Is Full!</div>'
    + '<div style="font-size:0.95rem;color:var(--muted);margin-bottom:0.4rem;">All 8 players have paid in.</div>'
    + '<div style="font-size:0.95rem;color:#ECEFF1;margin-bottom:1.6rem;font-weight:500;">Time to spin the wheel and find out your team.</div>'
    + '<button id="demoPoolFullBtn" style="background:var(--green);color:var(--dark);border:none;padding:0.85rem 2rem;font-weight:700;font-size:1rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;width:100%;">'
    + 'Spin My Wheel →'
    + '</button>'
    + '</div>';

  document.body.appendChild(popup);
  document.getElementById("demoPoolFullBtn")!.onclick = () => { popup.remove(); showDemoWheelDraw(pot); };
}

function showDemoWheelDraw(pot: number) {
  cleanupDemo();
  const overlay = document.createElement("div");
  overlay.id = "demoWheelOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(10,20,15,0.95);z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;";
  overlay.innerHTML =
    '<button onclick="window.__sweeppotGoHome()" style="position:fixed;top:1rem;right:1rem;background:transparent;border:1px solid var(--border);color:var(--muted);font-size:0.8rem;padding:0.3rem 0.7rem;cursor:pointer;z-index:301;font-family:var(--font-barlow-condensed),sans-serif;font-weight:600;letter-spacing:0.07em;">✕ EXIT</button>'
    + '<div style="font-size:0.65rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--green);">The Draw Is Happening</div>'
    + '<canvas id="demoWheelCanvas" width="220" height="220" style="border-radius:50%;"></canvas>'
    + '<div id="demoWheelStatus" style="font-size:0.82rem;color:var(--muted);text-align:center;min-height:2.5rem;max-width:320px;line-height:1.6;"></div>'
    + '<div id="demoAssigned" style="display:flex;flex-wrap:wrap;justify-content:center;gap:0.4rem;max-width:360px;"></div>';
  document.body.appendChild(overlay);

  const cvs = document.getElementById("demoWheelCanvas") as HTMLCanvasElement;
  const ctx2 = cvs.getContext("2d")!;
  const statusEl = document.getElementById("demoWheelStatus")!;
  const assignedEl = document.getElementById("demoAssigned")!;

  const demoTeams: (Team & { player: string; isYou: boolean })[] = [
    {n:"Brazil",    f:"🇧🇷", r:2, player:"You",      isYou:true},
    {n:"England",   f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", r:3, player:"James T.",isYou:false},
    {n:"Argentina", f:"🇦🇷", r:6, player:"Sarah K.", isYou:false},
    {n:"Portugal",  f:"🇵🇹", r:4, player:"Mike R.",  isYou:false},
    {n:"France",    f:"🇫🇷", r:1, player:"Emma L.",  isYou:false},
    {n:"Germany",   f:"🇩🇪", r:7, player:"Tom B.",   isYou:false},
    {n:"Spain",     f:"🇪🇸", r:5, player:"Lisa M.",  isYou:false},
    {n:"Netherlands",f:"🇳🇱",r:8, player:"Chris W.", isYou:false},
  ];

  const segColors = ["#1E3A2A","#263545","#2A1F3D","#3D2A1A","#16301F","#1E2936","#201630","#301E10"];
  let remaining = [...demoTeams];
  let currentAngle = 0;
  let pqIdx = 0;

  function drawWheel2(teams: typeof demoTeams, angle: number, highlighted: number | null) {
    ctx2.clearRect(0, 0, 220, 220);
    if (!teams.length) return;
    const cx = 110, cy = 110, r = 104;
    const seg = (2 * Math.PI) / teams.length;
    teams.forEach((t, i) => {
      const sa = angle + i * seg - Math.PI / 2;
      ctx2.beginPath(); ctx2.moveTo(cx, cy); ctx2.arc(cx, cy, r, sa, sa + seg); ctx2.closePath();
      ctx2.fillStyle = highlighted === i ? "rgba(198,241,53,0.35)" : segColors[i % segColors.length];
      ctx2.fill();
      ctx2.strokeStyle = "rgba(198,241,53,0.12)"; ctx2.lineWidth = 1; ctx2.stroke();
      const ma = sa + seg / 2, fr = r * 0.68;
      ctx2.save(); ctx2.translate(cx + fr * Math.cos(ma), cy + fr * Math.sin(ma));
      ctx2.rotate(ma + Math.PI / 2); ctx2.font = "18px serif"; ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
      ctx2.fillText(t.f || "", 0, 0); ctx2.restore();
    });
    ctx2.beginPath(); ctx2.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx2.fillStyle = "#1E2936"; ctx2.fill();
    ctx2.strokeStyle = "rgba(198,241,53,0.5)"; ctx2.lineWidth = 2; ctx2.stroke();
    // Pointer triangle
    ctx2.beginPath(); ctx2.moveTo(cx, cy - r - 2); ctx2.lineTo(cx - 8, cy - r + 14); ctx2.lineTo(cx + 8, cy - r + 14); ctx2.closePath();
    ctx2.fillStyle = "#C6F135"; ctx2.fill();
  }

  function spinAndPick(onDone: () => void) {
    if (!remaining.length) { onDone(); return; }
    const entry = demoTeams[pqIdx] || { player: "Player " + (pqIdx + 1), isYou: false };
    const isYou = pqIdx === 0;
    pqIdx++;
    statusEl.innerHTML = '<span style="color:var(--green);font-weight:700;">' + (isYou ? "Your turn!" : entry.player + " is drawing...") + "</span>";
    const pickIdx = Math.floor(Math.random() * remaining.length);
    const pickedTeam = remaining[pickIdx];
    const extraSpins = 3 + Math.floor(Math.random() * 2);
    const targetAngle = extraSpins * 2 * Math.PI + (2 * Math.PI - (2 * Math.PI / remaining.length) * pickIdx);
    const duration = 1400 + Math.random() * 400;
    const startTime = performance.now(), startAngle = currentAngle;

    function animFrame(now: number) {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      currentAngle = startAngle + targetAngle * eased;
      const norm = (((-currentAngle % (2 * Math.PI)) + (2 * Math.PI))) % (2 * Math.PI);
      const segSz = 2 * Math.PI / remaining.length;
      const topSeg = Math.floor((norm + segSz / 2) / segSz) % remaining.length;
      drawWheel2(remaining, currentAngle, p > 0.85 ? topSeg : null);
      if (p < 1) { requestAnimationFrame(animFrame); return; }
      drawWheel2(remaining, currentAngle, pickIdx);
      const result: AssignedResult = { team: pickedTeam, player: entry.player, isYou };
      remaining.splice(pickIdx, 1);
      allAssigned.push(result);
      const badge = document.createElement("div");
      badge.style.cssText = "padding:0.3rem 0.6rem;border:1px solid " + (isYou ? "var(--green)" : "rgba(198,241,53,0.25)")
        + ";background:" + (isYou ? "rgba(198,241,53,0.12)" : "rgba(198,241,53,0.04)")
        + ";font-size:0.7rem;color:" + (isYou ? "var(--green)" : "var(--muted)") + ";";
      badge.innerHTML = (pickedTeam.f || "") + "&nbsp;" + (isYou ? "<strong>You</strong>" : entry.player);
      assignedEl.appendChild(badge);
      if (isYou) {
        statusEl.innerHTML =
          '<div style="font-size:1.15rem;font-weight:700;color:var(--gold);margin-bottom:0.25rem;">' + (pickedTeam.f || "") + "&nbsp;" + pickedTeam.n + "</div>"
          + '<div style="font-size:0.7rem;color:var(--muted);margin-bottom:0.75rem;">Your team — click to continue</div>';
        const spinNextBtn = document.createElement("button");
        spinNextBtn.textContent = "Next →";
        spinNextBtn.style.cssText = "background:var(--green);color:var(--dark);border:none;padding:0.6rem 1.5rem;font-weight:700;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;";
        spinNextBtn.onclick = () => { statusEl.innerHTML = ""; onDone(); };
        statusEl.appendChild(spinNextBtn);
      } else {
        statusEl.innerHTML = '<span style="color:var(--muted);font-weight:400;">' + pickedTeam.n + " → " + entry.player + "</span>";
        setTimeout(() => onDone(), 450);
      }
    }
    requestAnimationFrame(animFrame);
  }

  drawWheel2(remaining, 0, null);

  const allAssigned: AssignedResult[] = [];

  // Show a SPIN button — let the user spin their own wheel
  statusEl.innerHTML = '<span style="color:var(--green);font-weight:700;">Your turn — tap to spin!</span>';
  showNarrator(2);

  const existingBtn = document.getElementById("demoSpinBtn");
  if (existingBtn) existingBtn.remove();
  const spinBtn = document.createElement("button");
  spinBtn.id = "demoSpinBtn";
  spinBtn.textContent = "Spin My Wheel";
  spinBtn.style.cssText = "background:var(--green);color:var(--dark);border:none;padding:0.75rem 2rem;font-weight:700;font-size:1rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;margin-top:0.5rem;";
  spinBtn.onclick = function() {
    spinBtn.remove();
    spinAndPick(() => {
      // After your spin, flash-assign the rest
      statusEl.innerHTML = '<span style="color:var(--muted);">Assigning your friends\' teams...</span>';
      showNarrator(3);
      setTimeout(() => {
        while (remaining.length > 0) {
          const ri = Math.floor(Math.random() * remaining.length);
          const t = remaining[ri];
          const player = demoTeams[pqIdx]?.player || "Player " + (pqIdx + 1);
          pqIdx++;
          remaining.splice(ri, 1);
          allAssigned.push({ team: t, player, isYou: false });
          const badge = document.createElement("div");
          badge.style.cssText = "padding:0.3rem 0.6rem;border:1px solid rgba(198,241,53,0.2);background:rgba(198,241,53,0.03);font-size:0.7rem;color:var(--muted);";
          badge.innerHTML = (t.f || "") + "&nbsp;" + player;
          assignedEl.appendChild(badge);
        }
        drawWheel2([], 0, null);
        statusEl.innerHTML = "";
        const allDrawnMsg = document.createElement("div");
        allDrawnMsg.style.cssText = "text-align:center;";
        allDrawnMsg.innerHTML = '<div style="font-size:0.9rem;font-weight:700;color:var(--green);margin-bottom:0.5rem;">All participants have been assigned their teams.</div>';
        const toBracketBtn = document.createElement("button");
        toBracketBtn.textContent = "Next →";
        toBracketBtn.style.cssText = "background:var(--green);color:var(--dark);border:none;padding:0.6rem 1.5rem;font-weight:700;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;margin-top:0.3rem;";
        toBracketBtn.onclick = () => { overlay.remove(); runBracketAnimation(allAssigned, pot); };
        allDrawnMsg.appendChild(toBracketBtn);
        statusEl.appendChild(allDrawnMsg);
      }, 600);
    });
  };
  overlay.appendChild(spinBtn);
}

// ─────────────────────────────────────────────
// Pool card
// ─────────────────────────────────────────────
function PoolCard({ pool }: { pool: DemoPool }) {
  const statusLabel = pool.status === "waiting" ? "Waiting for players" : pool.status === "active" ? "In play" : "Complete";
  const deadlineVal = pool.status === "waiting" ? `${pool.daysLeft}d left` : pool.status === "active" ? "Live" : "Ended";
  return (
    <div className={`pool-card status-${pool.status}`}>
      <div className={`pc-status ${pool.status}`}>
        <span className={`pc-dot${pool.status === "complete" ? " s" : ""}`} />
        {statusLabel}
      </div>
      <div className="pc-name">{pool.name}</div>
      <div className="pc-comp">{pool.icon} {pool.compLabel}</div>
      <div className="pc-stats">
        <div><div className="pc-sv">{pool.spotsFilled}/{pool.spotsTotal}</div><div className="pc-sl">Players</div></div>
        <div><div className="pc-sv">{pool.pot > 0 ? `$${pool.pot}` : "Free"}</div><div className="pc-sl">{pool.pot > 0 ? "Pool Total" : "Entry"}</div></div>
        <div><div className="pc-sv">{deadlineVal}</div><div className="pc-sl">{pool.status === "waiting" ? "Deadline" : "Status"}</div></div>
      </div>
      <div className="pc-arrow">›</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function SweeppotApp() {
  const [screen, setScreen]           = useState<Screen>("landing");
  const [tab, setTab]                 = useState<Tab>("myPools");
  const [lightMode, setLightMode]     = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [poolBetAud, setPoolBetAud]   = useState(20);
  const [poolPlayerCount, setPoolPlayerCount] = useState(8);
  const [countdown, setCountdown]     = useState({ d:"07", h:"23", m:"59", s:"59" });
  const [displayName, setDisplayName]           = useState<string>("");
  const [livePools, setLivePools]               = useState<DemoPool[] | null>(null);
  const [isLoggedIn, setIsLoggedIn]             = useState<boolean | null>(null);
  const [emailNeedsVerification, setEmailNeedsVerification] = useState(false);
  const [resendPending, startResendTransition]  = useTransition();
  const [resendDone, setResendDone]             = useState(false);
  const [demoStep, setDemoStep]                 = useState(0);
  const cdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const howRef  = useRef<HTMLDivElement>(null);

  // ── Fetch user + pools from Supabase ─────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function loadUserAndPools() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoggedIn(false);
          setLivePools([]);
          return;
        }
        setIsLoggedIn(true);

        const meta = user.user_metadata;
        setDisplayName(meta?.display_name || user.email?.split("@")[0] || "");
        setEmailNeedsVerification(meta?.email_needs_verification === true);

        // Fetch pools where the user is a participant
        const { data: participantRows } = await supabase
          .from("participants")
          .select(`
            pool_id,
            paid,
            pools (
              id, name, comp, status,
              bet_aud, player_count,
              expires_at,
              participants (count)
            )
          `)
          .eq("user_id", user.id);

        if (participantRows && participantRows.length > 0) {
          const compLabels: Record<string, string> = {
            wc2026:    "FIFA World Cup 2026",
            ucl2526:   "Champions League",
            euros2028: "UEFA Euros 2028",
          };
          const compIcons: Record<string, string> = {
            wc2026: "🌍", ucl2526: "⭐", euros2028: "🏆",
          };
          const mapped: DemoPool[] = participantRows.map((p: any) => {
            const pool = p.pools;
            const filled = pool.participants?.[0]?.count ?? 0;
            const expiry = pool.expires_at ? new Date(pool.expires_at) : null;
            const daysLeft = expiry
              ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 864e5))
              : 0;
            return {
              id:           pool.id,
              name:         pool.name,
              comp:         pool.comp,
              compLabel:    compLabels[pool.comp] ?? pool.comp,
              icon:         compIcons[pool.comp]  ?? "🏆",
              status:       pool.status as "waiting" | "active" | "complete",
              spotsTotal:   pool.player_count,
              spotsFilled:  filled,
              daysLeft,
              pot:          pool.bet_aud * pool.player_count,
              betAud:       pool.bet_aud,
            };
          });
          setLivePools(mapped);
        } else {
          setLivePools([]);
        }
      } catch {
        // Network/auth error — show empty state rather than infinite loading
        setIsLoggedIn(prev => prev === null ? false : prev);
        setLivePools(prev => prev === null ? [] : prev);
      }
    }

    loadUserAndPools();
  }, []);

  // Expose goHome for overlay close buttons
  const goHome = useCallback(() => {
    cleanupDemo();
    setScreen("home");
  }, []);
  useEffect(() => {
    (window as any).__sweeppotGoHome = goHome;
  }, [goHome]);

  // Light mode → body class
  useEffect(() => {
    document.body.classList.toggle("light-mode", lightMode);
  }, [lightMode]);

  // Cleanup on unmount
  useEffect(() => () => { cleanupDemo(); if (cdTimer.current) clearInterval(cdTimer.current); }, []);

  // Countdown
  const startCountdown = useCallback((target: Date) => {
    if (cdTimer.current) clearInterval(cdTimer.current);
    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { clearInterval(cdTimer.current!); setCountdown({ d:"00", h:"00", m:"00", s:"00" }); return; }
      setCountdown({
        d: String(Math.floor(diff / 864e5)).padStart(2, "0"),
        h: String(Math.floor((diff % 864e5) / 36e5)).padStart(2, "0"),
        m: String(Math.floor((diff % 36e5) / 6e4)).padStart(2, "0"),
        s: String(Math.floor((diff % 6e4) / 1e3)).padStart(2, "0"),
      });
    }
    tick(); cdTimer.current = setInterval(tick, 1000);
  }, []);

  // Try Demo → invite screen
  const showInviteDemo = useCallback(() => {
    cleanupDemo();
    const tc = 16, n = 8, tpp = 2, bet = 20;
    const ts = tc / tpp;
    const teams = WC_TEAMS.slice(0, tc).map((t, i) => ({ ...t, tier: Math.floor(i / ts) + 1 }));
    const parts: Participant[] = Array.from({ length: n }, (_, i) => ({
      name: i === 0 ? "The Organiser" : `Player ${i + 1}`,
      paid: i === 0, spun: i === 0, assignedTeams: [],
    }));
    setParticipants(parts);
    setPoolBetAud(bet);
    setPoolPlayerCount(n);
    setScreen("invite");
  }, []);

  // Run Demo button in invite screen
  const runDemo = useCallback(() => {
    const parts = participants.map((p, i) => i === 0 ? { ...p, name: "You", paid: true } : p);
    setParticipants(parts);
    setScreen("waiting");
    showNarrator(0);
    const expiry = new Date(Date.now() + 6 * 864e5);
    startCountdown(expiry);

    const pot = poolPlayerCount * poolBetAud;
    let idx = 1;
    const iv = setInterval(() => {
      if (idx >= parts.length) {
        clearInterval(iv);
        // All players joined — show pool full popup
        setParticipants(prev => prev.map(p => ({ ...p, paid: true, spun: true })));
        setTimeout(() => showDemoPoolFullPopup(pot), 600);
        return;
      }
      setParticipants(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], paid: true, spun: true };
        return next;
      });
      idx++;
    }, 900);
  }, [participants, poolBetAud, poolPlayerCount, startCountdown]);

  // ── RENDER ────────────────────────────────────────────────────

  const paidCount = participants.filter(p => p.spun).length;

  return (
    <>
      {/* ── Email verification banner ── */}
      {isLoggedIn && emailNeedsVerification && (
        <div className="verify-banner">
          <span className="verify-banner-text">
            📧 Please check your inbox and verify your email address to create or join pools.
          </span>
          <button
            className="verify-banner-resend"
            disabled={resendPending || resendDone}
            onClick={() => {
              startResendTransition(async () => {
                await resendVerification();
                setResendDone(true);
              });
            }}
          >
            {resendDone ? "Email sent ✓" : resendPending ? "Sending…" : "Resend email"}
          </button>
        </div>
      )}

      {/* ── Nav bar ── */}
      <nav className="nav-bar">
        <div className="nav-logo" onClick={() => { setScreen("landing"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          Sweeppot
        </div>
        <div className="nav-right">
          {isLoggedIn ? (
            <>
              <button className="nav-btn" onClick={() => document.getElementById("my-pools")?.scrollIntoView({ behavior: "smooth" })}>My Pools</button>
              <button className="nav-btn" onClick={() => { setScreen("landing"); setTimeout(() => document.getElementById("invited-pools")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Invited Pools</button>
              <button className="nav-btn" onClick={showInviteDemo}>Try Demo</button>
              <button className="nav-btn hi" onClick={() => window.location.href = "/pool/create"}>+ Create Pool</button>
              <form action={logout}><button className="nav-btn" type="submit" style={{ fontSize: "0.72rem" }}>Sign Out</button></form>
            </>
          ) : (
            <>
              <button className="nav-btn" onClick={() => window.location.href = "/auth/login"}>My Pools</button>
              <button className="nav-btn" onClick={showInviteDemo}>Try Demo</button>
              <a className="nav-btn" href="/auth/login" style={{ textDecoration: "none" }}>Sign In</a>
            </>
          )}
        </div>
      </nav>

      {/* ── App tab bar (hidden on landing) ── */}
      {screen !== "landing" && (
        <div className="app-tab-bar">
          <button className="atb-tab" onClick={() => { setScreen("home"); setTab("myPools"); }}>Home</button>
          <button className={`atb-tab${screen === "home" && tab === "myPools" ? " active" : ""}`} onClick={() => { setScreen("home"); setTab("myPools"); }}>My Pools</button>
          <button className={`atb-tab${screen === "home" && tab === "browse" ? " active" : ""}`} onClick={() => { setScreen("home"); setTab("browse"); }}>
            Invited Pools <span className="inv-badge-dot">2</span>
          </button>
          <button className="atb-tab" onClick={showInviteDemo}>Try Demo</button>
        </div>
      )}

      {/* ══════════════════════════════════════
          LANDING PAGE
      ══════════════════════════════════════ */}
      {screen === "landing" && (
        <div className="lp-wrap">
          {/* Hero */}
          <div className="lp-hero">
            <div className="lp-hero-inner">
              <div className="lp-hero-left">
                <div className="lp-tag"><span className="lp-dot" />FIFA World Cup 2026 ready</div>
                <h1 className="lp-h1">The <span className="lp-accent">sweepstake</span><br />your group actually finishes.</h1>
                <p className="lp-sub">No spreadsheets. No chasing payments. No arguments about who owes what. Sweeppot runs your football sweepstake end-to-end — everyone pays up front, teams are drawn fairly, and funds are released to the winner automatically.</p>
                <div className="lp-actions">
                  <button className="lp-btn-primary" onClick={() => window.location.href = isLoggedIn ? "/pool/create" : "/auth/signup"}>
                    {isLoggedIn ? "Create a Sweepstake →" : "Get Started →"}
                  </button>
                  <button className="lp-btn-ghost" onClick={() => howRef.current?.scrollIntoView({ behavior: "smooth" })}>See how it works ↓</button>
                </div>
                <div className="lp-stats">
                  <div className="lp-stat"><div className="lp-stat-n" style={{ fontSize: "0.85rem" }}>No chasing</div><div className="lp-stat-l">Automated from entry to payment</div></div>
                  <div className="lp-stat-div" />
                  <div className="lp-stat"><div className="lp-stat-n" style={{ fontSize: "0.85rem" }}>Auto-paid</div><div className="lp-stat-l">AUTO-PAID — FUNDS RELEASED SECURELY &amp; INSTANTLY</div></div>
                  <div className="lp-stat-div" />
                  <div className="lp-stat"><div className="lp-stat-n">10%</div><div className="lp-stat-l">Service fee — every contribution goes to the pool total</div></div>
                </div>
                <div className="lp-stripe-badge">🛡️ Funds held securely until the competition concludes</div>
              </div>
              <div className="lp-hero-right">
                <div className="lp-mock-card">
                  <div className="lp-mock-hdr"><span className="lp-mock-logo">Sweeppot</span><span className="lp-mock-pill">🌍 WC 2026</span></div>
                  <div className="lp-mock-pool">The Office Sweep</div>
                  <div className="lp-mock-meta">8 players · $160 pool total</div>
                  <div className="lp-mock-reveal">
                    <div className="lp-mock-reveal-title">🎉 The Draw Has Happened!</div>
                    <div className="lp-mock-team">🇧🇷 Brazil <span className="lp-tier-pill">Tier 1</span></div>
                    <div className="lp-mock-team">🇦🇺 Australia <span className="lp-tier-pill">Tier 2</span></div>
                    <div className="lp-mock-yours">⭐ Your teams</div>
                  </div>
                  <div className="lp-mock-payout">Your share: <strong>$144.00</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── My Pools (logged-in only) ── */}
          {isLoggedIn && (
            <div className="lp-section lp-dashboard-section" id="my-pools">
              <div className="lp-section-hdr">
                <div>
                  <div className="lp-section-tag">Your sweepstakes</div>
                  <h2 className="lp-section-title" style={{ marginBottom: 0 }}>My Pools</h2>
                </div>
                <button className="nav-btn hi" onClick={() => window.location.href = "/pool/create"} style={{ alignSelf: "center" }}>+ Create Pool</button>
              </div>
              {livePools !== null && livePools.length > 0 ? (
                <div className="pools-grid">{livePools.map(p => <PoolCard key={p.id} pool={p} />)}</div>
              ) : (
                <div className="lp-empty-state">
                  <div className="lp-empty-icon">🏆</div>
                  <div className="lp-empty-msg">You&apos;re not in any pools yet</div>
                  <div className="lp-empty-sub">Create your first sweepstake or wait to be invited by a friend.</div>
                  <button className="lp-btn-primary" style={{ marginTop: "1rem" }} onClick={() => window.location.href = "/pool/create"}>+ Create New Pool</button>
                </div>
              )}
            </div>
          )}

          {/* ── Invited Pools (logged-in only) ── */}
          {isLoggedIn && (
            <div className="lp-section lp-dashboard-section lp-section-alt" id="invited-pools">
              <div className="lp-section-hdr">
                <div>
                  <div className="lp-section-tag">Open invitations</div>
                  <h2 className="lp-section-title" style={{ marginBottom: 0 }}>Invited Pools</h2>
                </div>
              </div>
              {INVITED_POOLS.length > 0 ? (
              <div className="inv-list">
                {INVITED_POOLS.map(p => (
                  <div key={p.id} className="inv-row">
                    <div style={{ width:38,height:38,borderRadius:"50%",background:"rgba(198,241,53,0.1)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0 }}>✉️</div>
                    <div className="inv-info">
                      <div className="inv-pool-name">{p.name}</div>
                      <div className="inv-meta">{p.comp} · {p.total} players · ${p.pot} pot</div>
                      <div className="inv-from">Invited by {p.from} · {p.daysLeft}d left to join</div>
                    </div>
                    <div className="inv-stats">
                      <div className="inv-pot">${p.pot}</div>
                      <div className="inv-spots">{p.spots} spot{p.spots !== 1 ? "s" : ""} left</div>
                      <div className="inv-badge">${p.buyin} AUD</div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="lp-empty-state">
                  <div className="lp-empty-icon">✉️</div>
                  <div className="lp-empty-msg">No pending invites</div>
                  <div className="lp-empty-sub">When someone invites you to a pool, it will appear here.</div>
                </div>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="lp-section" ref={howRef} id="lp-how">
            <div className="lp-section-tag">Simple by design</div>
            <h2 className="lp-section-title">How Sweeppot works</h2>
            <div style={{ maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
              <div className="lp-step" style={{ padding: "0 0.5rem" }}>
                <div className="lp-step-num">{HOW_STEPS[demoStep].n}</div>
                <div className="lp-step-title">{HOW_STEPS[demoStep].title}</div>
                <div className="lp-step-desc">{HOW_STEPS[demoStep].desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.8rem" }}>
                <button
                  className="nav-btn"
                  onClick={() => setDemoStep(i => i - 1)}
                  style={{ visibility: demoStep === 0 ? "hidden" : "visible" }}
                >
                  ← Back
                </button>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-barlow-condensed), sans-serif", fontWeight: 600, letterSpacing: "0.07em" }}>
                  {demoStep + 1} / {HOW_STEPS.length}
                </span>
                {demoStep < HOW_STEPS.length - 1 ? (
                  <button className="lp-btn-primary" onClick={() => setDemoStep(i => i + 1)}>
                    Next →
                  </button>
                ) : (
                  <a href="/pool/create" className="lp-btn-primary" style={{ textDecoration: "none" }}>
                    Create a Sweepstake →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Competitions */}
          <div className="lp-section lp-section-alt">
            <div className="lp-section-tag">Competitions</div>
            <h2 className="lp-section-title">Pick your tournament</h2>
            <div className="lp-comps">
              <div className="lp-comp lp-comp-featured"><div className="lp-comp-badge">⭐ Most Popular</div><div className="lp-comp-icon">🌍</div><div className="lp-comp-name">FIFA World Cup 2026</div><div className="lp-comp-desc">48 teams — the biggest World Cup ever. Up to 48 players. Multiple teams per player split fairly by FIFA ranking.</div><div className="lp-comp-meta">2–48 Players · $5+ or Free · June 2026</div></div>
              <div className="lp-comp"><div className="lp-comp-icon">⭐</div><div className="lp-comp-name">UEFA Champions League</div><div className="lp-comp-desc">16-team knockout from the Round of 16. Perfect for smaller groups of 4 or 8. Europe's biggest clubs.</div><div className="lp-comp-meta">2–16 Players · $5+ or Free · May Final</div></div>
              <div className="lp-comp"><div className="lp-comp-icon">🏆</div><div className="lp-comp-name">UEFA Euros 2028</div><div className="lp-comp-desc">24 teams, hosted across the UK and Ireland. Start planning your group now.</div><div className="lp-comp-meta">2–24 Players · $5+ or Free · Summer 2028</div></div>
            </div>
          </div>

          {/* Fairness */}
          <div className="lp-section">
            <div className="lp-section-tag">Built-in fairness</div>
            <h2 className="lp-section-title">No one gets all the good teams</h2>
            <div className="lp-fairness">
              <div>
                <p className="lp-fairness-body">When there are more teams than players, Sweeppot uses official rankings to split teams into equal tiers. Each player draws one team from each tier — so everyone gets a balanced mix of strong and weaker sides.</p>
                <p className="lp-fairness-body">In an 8-player World Cup sweepstake with 16 teams: Tier 1 is the top 8 nations, Tier 2 is teams ranked 9–16. Every player draws exactly one from each. <strong>It scales for any player and team combination.</strong></p>
                <p className="lp-fairness-body" style={{ color: "var(--green)", fontSize: "0.8rem" }}>The same logic as a real office sweepstake — just automated and guaranteed fair.</p>
              </div>
              <div className="lp-tier-eg">
                <div className="lp-tier-eg-lbl">Example — 8 players · 16 teams</div>
                <div className="lp-tier-row lp-t1"><span>🇫🇷 France</span><span className="lp-tbadge t1">Tier 1</span></div>
                <div className="lp-tier-row lp-t1"><span>🇧🇷 Brazil</span><span className="lp-tbadge t1">Tier 1</span></div>
                <div className="lp-tier-row lp-t1"><span>🏴󠁧󠁢󠁥󠁮󠁧󠁿 England</span><span className="lp-tbadge t1">Tier 1</span></div>
                <div className="lp-tier-sep">· · ·</div>
                <div className="lp-tier-row lp-t2"><span>🇺🇸 USA</span><span className="lp-tbadge t2">Tier 2</span></div>
                <div className="lp-tier-row lp-t2"><span>🇦🇺 Australia</span><span className="lp-tbadge t2">Tier 2</span></div>
                <div className="lp-tier-row lp-t2"><span>🇲🇽 Mexico</span><span className="lp-tbadge t2">Tier 2</span></div>
                <div className="lp-tier-note">Every player draws 1 from each tier</div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="lp-cta">
            <h2 className="lp-cta-title">Ready for World Cup 2026?</h2>
            <p className="lp-cta-sub">Set up your sweepstake now — the tournament kicks off June 2026.</p>
            <div className="lp-cta-btns">
              <button className="lp-btn-primary" onClick={() => window.location.href = isLoggedIn ? "/pool/create" : "/auth/signup"}>Create a Sweepstake →</button>
              <button className="lp-btn-demo" onClick={showInviteDemo}>Try a Demo</button>
            </div>
          </div>

          {/* Footer */}
          <div className="lp-footer">
            <div className="lp-footer-logo">Sweeppot</div>
            <div className="lp-footer-tagline">Peer-to-peer football sweepstakes — escrowed, automated, fair.</div>
            <div className="lp-footer-legal">Sweeppot facilitates private sweepstakes between invited participants. Contributions are held securely and released automatically to the winner. A free entry option is available on all sweepstakes. 18+ only. Please participate responsibly.</div>
            <div className="lp-footer-links">
              <a href="/terms" className="lp-footer-link">Terms of Service</a>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          HOME SCREEN
      ══════════════════════════════════════ */}
      {screen === "home" && (
        <div className="content">
          <div className="home-hero">
            <div className="home-greeting">
              <h1>Welcome back{displayName ? `, ${displayName}` : ""} 👋</h1>
              <p>
                {livePools === null
                  ? "Loading your pools…"
                  : livePools.length === 0
                  ? "You have no pools yet. Create one or try the demo."
                  : `You have ${livePools.filter(p => p.status === "active").length} active pool${livePools.filter(p => p.status === "active").length !== 1 ? "s" : ""}, ${livePools.filter(p => p.status === "waiting").length} waiting for players.`}
              </p>
            </div>
            <button className="btn-create" onClick={() => window.location.href = "/pool/create"}>+ Create New Pool</button>
          </div>
          <div className="home-tabs">
            {([ ["myPools","My Pools"], ["results","Match Results"], ["news","Football News"], ["browse","Invited Pools"] ] as const).map(([key, label]) => (
              <div key={key} className={`home-tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
                {label}{key === "browse" && <span className="inv-badge-dot">2</span>}
              </div>
            ))}
          </div>
          {/* My Pools */}
          <div className={`tab-pane${tab === "myPools" ? " active" : ""}`}>
            {livePools === null ? (
              <div style={{ padding: "2rem", color: "var(--muted)", fontSize: "0.82rem" }}>Loading…</div>
            ) : livePools.length > 0 ? (
              <div className="pools-grid">{livePools.map(p => <PoolCard key={p.id} pool={p} />)}</div>
            ) : (
              <div className="pools-grid">{DEMO_POOLS.map(p => <PoolCard key={p.id} pool={p} />)}</div>
            )}
          </div>
          {/* Match Results */}
          <div className={`tab-pane${tab === "results" ? " active" : ""}`}>
            <div className="results-list">
              {DEMO_RESULTS.map((r, i) => (
                <div key={i} className="match-row">
                  <div className="match-comp-tag">{r.comp}</div>
                  <div className="match-teams">
                    <div><div className="match-team">{r.home}</div>{r.myTeamHome && <div className="match-mine">⭐ Your team</div>}</div>
                    <div className="match-score">{r.score}</div>
                    <div><div className="match-team">{r.away}</div></div>
                  </div>
                  <div className="match-round">{r.round}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Football News */}
          <div className={`tab-pane${tab === "news" ? " active" : ""}`}>
            <div className="news-list">
              {DEMO_NEWS.map((n, i) => (
                <div key={i} className="news-item">
                  <span className={`news-tag ${n.tag}`}>{n.comp}</span>
                  <div className="news-body"><div className="news-hl">{n.hl}</div><div className="news-meta">{n.time}</div></div>
                </div>
              ))}
            </div>
          </div>
          {/* Invited Pools */}
          <div className={`tab-pane${tab === "browse" ? " active" : ""}`}>
            <div className="inv-list">
              {INVITED_POOLS.map(p => (
                <div key={p.id} className="inv-row">
                  <div style={{ width:38,height:38,borderRadius:"50%",background:"rgba(198,241,53,0.1)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0 }}>✉️</div>
                  <div className="inv-info">
                    <div className="inv-pool-name">{p.name}</div>
                    <div className="inv-meta">{p.comp} · {p.total} players · ${p.pot} pot</div>
                    <div className="inv-from">Invited by {p.from} · {p.daysLeft}d left to join</div>
                  </div>
                  <div className="inv-stats">
                    <div className="inv-pot">${p.pot}</div>
                    <div className="inv-spots">{p.spots} spot{p.spots !== 1 ? "s" : ""} left</div>
                    <div className="inv-badge">${p.buyin} AUD</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          INVITE / JOIN SCREEN
      ══════════════════════════════════════ */}
      {screen === "invite" && (
        <div className="content">
          <div className="card">
            <div style={{ padding: "0.6rem 1.8rem 0" }}>
              <button className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem" }} onClick={() => setScreen("landing")}>← Home</button>
            </div>
            <div className="ipc">
              <div className="ipc-comp">FIFA World Cup 2026 · Private Pool</div>
              <div className="ipc-name">The Office WC 2026</div>
              <div className="ipc-stats">
                <div className="ipc-stat"><div className="ipc-sv">8</div><div className="ipc-sl">Players</div></div>
                <div className="ipc-stat"><div className="ipc-sv">7</div><div className="ipc-sl">Spots Left</div></div>
                <div className="ipc-stat"><div className="ipc-sv">$20</div><div className="ipc-sl">Contribution AUD</div></div>
                <div className="ipc-stat"><div className="ipc-sv">$160</div><div className="ipc-sl">Total Pot</div></div>
              </div>
            </div>
            <div className="invite-action">
              <h3>You've been invited to join</h3>
              <p>Make your contribution to reserve your spot. Once everyone has joined — or the deadline arrives — the wheel spins for all players simultaneously. No one sees any teams until that shared reveal moment.</p>
              <div>
                <div style={{ fontSize: "0.69rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--green)", marginBottom: "0.45rem" }}>Your Name</div>
                <input className="fi" type="text" placeholder="Enter your name" defaultValue="You" style={{ width: 220 }} />
              </div>
              <button className="btn-gold" onClick={runDemo}>Run Demo →</button>
              <div style={{ fontSize: "0.71rem", color: "var(--muted)", lineHeight: 1.6 }}>This is a demo — no real payment needed. Watch the full automated draw from start to finish.</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          WAITING ROOM
      ══════════════════════════════════════ */}
      {screen === "waiting" && (
        <div className="content">
          <div className="card">
            <div className="waiting-hero">
              <div>
                <button className="nav-btn" style={{ marginBottom: "0.6rem", fontSize: "0.72rem", padding: "0.32rem 0.8rem" }} onClick={goHome}>← My Pools</button>
                <div className="wh-title">Waiting for the draw</div>
                <p className="wh-sub">Share the link below. When everyone has joined, each player spins to reveal their own team — other players' assignments stay hidden until they spin.</p>
              </div>
              <div className="mt-toggle-wrap">
                <button className="mt-toggle-btn"><span>👁</span>&nbsp;Show My Team</button>
              </div>
            </div>
            {/* Countdown */}
            <div className="cd-wrap">
              {([ ["d","Days"], ["h","Hours"], ["m","Mins"], ["s","Secs"] ] as const).map(([k, l]) => (
                <div key={k} className="cd-unit"><div className="cd-num">{countdown[k]}</div><div className="cd-lbl">{l}</div></div>
              ))}
            </div>
            {/* Pool progress */}
            <div className="pool-prog">
              <div className="pp-hdr">
                <div className="pp-title">Pool Progress</div>
                <div className="pp-count">{paidCount} of {participants.length} joined &amp; paid</div>
              </div>
              <div className="pp-grid">
                {participants.map((p, i) => {
                  const isYou = i === 0;
                  const cls = p.spun ? (isYou ? "you" : "paid") : "empty";
                  const init = p.name ? p.name.charAt(0).toUpperCase() : "?";
                  const st = p.spun ? (isYou ? "You — joined & paid · £20 entry ✓" : "Joined & paid · £20 entry ✓") : "Waiting to join";
                  return (
                    <div key={i} className={`pp-slot ${cls}`}>
                      <div className="pp-av">{p.spun || isYou ? init : "?"}</div>
                      <div className="pp-info">
                        <div className="pp-name">{p.spun || isYou ? p.name : "Open spot"}</div>
                        <div className="pp-st">{st}</div>
                      </div>
                      {p.spun && <div className="pp-lock" style={{ fontSize: "0.9rem", color: "var(--green)" }}>✓</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Footer */}
            <div className="waiting-footer">
              <div className="invite-strip">
                <div className="invite-url">https://sweeppot.app/pool/demo01</div>
                <button className="copy-btn">Copy Link</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confetti container */}
      <div className="confetti-el" id="confettiEl" />

      {/* Light mode toggle hidden — dark theme only for now, re-enable if needed */}
      {/* <button className="mode-toggle" onClick={() => setLightMode(v => !v)} title="Switch mode">
        {lightMode ? "🌙" : "☀️"}
      </button> */}
    </>
  );
}
