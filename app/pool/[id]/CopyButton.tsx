"use client";

import { useState } from "react";

export default function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="invite-strip">
      <span className="invite-url">{url}</span>
      <button
        className={`copy-btn${copied ? " copied" : ""}`}
        onClick={handleCopy}
        type="button"
      >
        {copied ? "Copied ✓" : "Copy Link"}
      </button>
    </div>
  );
}
