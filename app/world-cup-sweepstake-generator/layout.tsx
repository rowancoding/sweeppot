import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Free World Cup 2026 Sweepstake Generator | Sweeppot" },
  description:
    "Generate your World Cup 2026 sweepstake draw instantly. Enter names, spin the wheel and assign all 48 FIFA World Cup teams fairly. Free, no account needed. Perfect for office sweeps.",
  alternates: {
    canonical: "https://sweeppot.com/world-cup-sweepstake-generator",
  },
  robots: { index: true, follow: true },
};

export default function WorldCupGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
