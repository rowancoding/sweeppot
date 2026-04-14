import Link from "next/link";

const SECTIONS = [
  {
    n: 1,
    title: "About Sweeppot",
    body: "Sweeppot is a peer-to-peer football sweepstake platform that allows users to create and join private sweepstake pools tied to football tournaments. Entry fees are held in escrow via Stripe and paid out automatically to the winner.",
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
    title: "Entry Fees and Payments",
    body: "Entry fees are denominated in AUD or GBP. Payments are processed securely via Stripe. Entry fees are held in escrow until the tournament concludes. Free pools (£0 / $0 entry) are supported — no money changes hands in free pools.",
  },
  {
    n: 7,
    title: "Platform Fee",
    body: "Sweeppot charges a 5% platform fee on all paid pools. This fee is deducted from the prize pot before payout. Free pools are not subject to any fee.",
  },
  {
    n: 8,
    title: "Payouts",
    body: "The winner is the participant holding the team that wins the tournament. Payout is automatic once the result is confirmed. In the event that the winning team is disqualified or withdrawn from the tournament after the draw, the prize is awarded to the holder of the runner-up team. There must be exactly one runner-up for this rule to apply.",
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
