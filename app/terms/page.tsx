import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Sweeppot Terms of Service — contributions, draws, payouts, eligibility, and platform rules.",
  robots: { index: true, follow: false },
};

const SECTIONS = [
  {
    n: 1,
    title: "About Sweeppot",
    body: "Sweeppot is a peer-to-peer football sweepstake platform that allows users to create and join private sweepstake pools tied to football tournaments. Contributions are held securely by our payment processor and released automatically to the winner.",
  },
  {
    n: 2,
    title: "Eligibility",
    body: "You must be at least 18 years old to use Sweeppot. By creating an account you confirm you are 18 or older. We verify your date of birth at signup and reserve the right to close accounts where this cannot be confirmed. Sweeppot is not available to residents of Ireland, Northern Ireland, or the United States of America.",
  },
  {
    n: 3,
    title: "Accounts",
    body: "You must provide accurate information when creating an account. You are responsible for maintaining the security of your account. One account per person.",
  },
  {
    n: 4,
    title: "Pools",
    body: "Each sweepstake is called a pool. Pools are private and invite-only — there is no public discovery. A minimum of 4 players must join a pool before a draw can take place. Pools are created by an organiser who invites participants via a unique invite link.",
  },
  {
    n: 5,
    title: "The Draw",
    body: "Teams are assigned randomly and fairly. Each participant receives one team per draw. Once a team is assigned it is final — the server rejects any repeat spin attempts. All participants can see the full draw results. The organiser initiates the draw once the minimum player count is met and all participants have paid.",
  },
  {
    n: 6,
    title: "Contributions and Payments",
    body: "Contributions are denominated in AUD or GBP. Payments are processed securely via Stripe. Contributions are held securely until the tournament concludes. Free pools (£0 / $0 entry) are supported — no money changes hands in free pools. Contributions are authorised at the time of joining and held until the pool fills or the entry deadline is met. Cards are not charged until that point.",
  },
  {
    n: 7,
    title: "Platform Fee",
    body: "Sweeppot charges a 10% service fee on all paid pools. The 10% service fee is deducted from the pot before payment release. Stripe payment processing fees (2.9% + A$0.30 or £0.30) are added to each participant's contribution at the time of payment and are non-refundable. Free pools are not subject to any fee.",
  },
  {
    n: 8,
    title: "Payouts",
    body: "The winner is the participant holding the team that wins the tournament. Payment release is automatic once the result is confirmed. In the event that the winning team is disqualified or withdrawn from the tournament after the draw, the funds are released to the holder of the runner-up team. There must be exactly one runner-up for this rule to apply.",
  },
  {
    n: 9,
    title: "Responsible Participation",
    body: "Sweeppot is intended for entertainment purposes. Please participate responsibly. If you are concerned about your relationship with gambling, visit BeGambleAware.org.",
  },
  {
    n: 10,
    title: "Prohibited Use",
    body: "You may not use Sweeppot if you are located in a restricted territory (Ireland, Northern Ireland, USA). You may not create multiple accounts, manipulate draws, or use the platform for any unlawful purpose.",
  },
  {
    n: 11,
    title: "Limitation of Liability",
    body: "Sweeppot is not responsible for delays or failures caused by third-party services including Stripe or football-data.org. We are not liable for losses arising from tournament cancellations, postponements, or rule changes by governing football bodies.",
  },
  {
    n: 12,
    title: "Changes to These Terms",
    body: "We may update these terms from time to time. Continued use of Sweeppot after changes are posted constitutes acceptance of the new terms.",
  },
  {
    n: 13,
    title: "Contact",
    body: "For questions about these terms, contact us at legal@sweeppot.com.",
  },
  {
    n: 14,
    title: "Fairness & Randomness",
    body: "Sweeppot does not set odds. Every participant has an equal and fair chance of receiving any team. Team assignment is performed using cryptographically secure randomness on our servers — the outcome cannot be predicted, influenced, or repeated. Draw results are final and visible to all participants.",
  },
  {
    n: 15,
    title: "Platform Role",
    body: "Sweeppot is a platform provider, not a gambling operator. Sweeppot does not participate in pools, does not take a position on outcomes, and does not benefit from any particular result. The platform facilitates peer-to-peer sweepstakes between private groups of known individuals.",
  },
];

export default function TermsPage() {
  return (
    <div className="terms-wrap">
      <nav className="terms-nav">
        <Link href="/" className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>
          ← Home
        </Link>
        <span className="pool-nav-logo">Sweeppot</span>
      </nav>

      <div className="terms-body">
        <div className="terms-hdr">
          <div className="terms-tag">Legal</div>
          <h1 className="terms-title">Terms of Service</h1>
          <p className="terms-sub">Last updated April 2026</p>
        </div>

        <div className="terms-sections">
          {SECTIONS.map((s) => (
            <div key={s.n} className="terms-section">
              <div className="terms-section-title">
                <span className="terms-n">{s.n}.</span> {s.title}
              </div>
              <p className="terms-section-body">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="terms-footer">
          <div className="lp-footer-logo">Sweeppot</div>
          <div className="lp-footer-tagline">Peer-to-peer football sweepstakes — escrowed, automated, fair.</div>
          <div className="lp-footer-legal">18+ only. Please participate responsibly.</div>
        </div>
      </div>
    </div>
  );
}
