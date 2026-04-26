import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Free Sweepstake Generator — Draw Teams Online | Sweeppot" },
  description:
    "Free online sweepstake generator. Enter names, pick your teams, and instantly draw who gets what. Perfect for office sweeps, World Cup, Premier League and more.",
  robots: { index: true, follow: true },
};

export default function GeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
