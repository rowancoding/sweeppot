"use client";

import { useTransition, useState } from "react";
import { startDraw } from "@/app/pool/actions";

export default function StartDrawButton({
  poolId,
  paidCount,
}: {
  poolId: string;
  paidCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const enabled = paidCount >= 4;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startDraw(poolId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="organiser-bar">
      <div className="organiser-bar-label">
        <strong>Organiser Controls</strong>
        {enabled
          ? `${paidCount} players joined — pool is ready to draw.`
          : `${paidCount}/4 players joined — need at least 4 paid players to start.`}
        {error && (
          <span style={{ color: "var(--red)", display: "block", marginTop: "0.3rem" }}>
            {error}
          </span>
        )}
      </div>
      <button
        className="start-draw-btn"
        disabled={!enabled || pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Drawing…" : "🎡 Start Draw →"}
      </button>
    </div>
  );
}
