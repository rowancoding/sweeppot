import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute:
      "Free Football Sweepstake Generator — Champions League, World Cup & More | Sweeppot",
  },
  description:
    "Generate your football sweepstake draw instantly. Champions League, Premier League, World Cup and more. Spin the wheel and assign teams fairly. Free, no account needed.",
  alternates: {
    canonical: "https://sweeppot.com/football-sweepstake-generator",
  },
  robots: { index: true, follow: true },
};

export default function FootballGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
