"use client";

import { useEffect, useState } from "react";

interface TimeLeft { d: string; h: string; m: string; s: string; expired: boolean }

function calcTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { d: "00", h: "00", m: "00", s: "00", expired: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s), expired: false };
}

export default function Countdown({ expiresAt }: { expiresAt: string }) {
  const target = new Date(expiresAt);
  const [tl, setTl] = useState<TimeLeft>(calcTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTl(calcTimeLeft(target)), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  if (tl.expired) {
    return (
      <div className="cd-wrap">
        {["Deadline", "passed"].map((lbl) => (
          <div className="cd-unit" key={lbl}>
            <div className="cd-num" style={{ fontSize: "1rem" }}>--</div>
            <div className="cd-lbl">{lbl}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cd-wrap">
      {([["d", "Days"], ["h", "Hours"], ["m", "Mins"], ["s", "Secs"]] as const).map(
        ([key, lbl]) => (
          <div className="cd-unit" key={key}>
            <div className="cd-num">{tl[key]}</div>
            <div className="cd-lbl">{lbl}</div>
          </div>
        )
      )}
    </div>
  );
}
