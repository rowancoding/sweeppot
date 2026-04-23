import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM   = "Sweeppot <noreply@sweeppot.com>";

export async function sendPoolExpiredEmail(opts: {
  to: string;
  displayName: string;
  poolName: string;
}) {
  await resend.emails.send({
    from: FROM,
    to:   opts.to,
    subject: `${opts.poolName} didn't fill in time`,
    html: `
      <p>Hi ${opts.displayName},</p>
      <p>Unfortunately <strong>${opts.poolName}</strong> didn't fill before the deadline.</p>
      <p>Your payment hold has been released automatically — no charge was made to your card.</p>
      <p>Feel free to create or join another pool on <a href="https://sweeppot.com">Sweeppot</a>.</p>
    `,
  });
}

export async function sendPaymentRequiredEmail(opts: {
  to: string;
  displayName: string;
  poolName: string;
  poolId: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";
  await resend.emails.send({
    from: FROM,
    to:   opts.to,
    subject: `Action required: re-authorise payment for ${opts.poolName}`,
    html: `
      <p>Hi ${opts.displayName},</p>
      <p>Your payment authorisation for <strong>${opts.poolName}</strong> has expired and could not be automatically renewed.</p>
      <p>To keep your spot, please update your payment details within 48 hours:</p>
      <p><a href="${siteUrl}/pool/${opts.poolId}/update-payment">Update payment →</a></p>
      <p>If you don't update within 48 hours your spot will be released to the next person on the waitlist.</p>
    `,
  });
}

export async function sendSpotReleasedEmail(opts: {
  to: string;
  displayName: string;
  poolName: string;
}) {
  await resend.emails.send({
    from: FROM,
    to:   opts.to,
    subject: `Your spot in ${opts.poolName} has been released`,
    html: `
      <p>Hi ${opts.displayName},</p>
      <p>Your spot in <strong>${opts.poolName}</strong> has been released because payment could not be re-authorised within the 48-hour window.</p>
      <p>No charge was made to your card. You can join another pool on <a href="https://sweeppot.com">Sweeppot</a>.</p>
    `,
  });
}

export async function sendWaitlistNotificationEmail(opts: {
  to: string;
  displayName: string;
  poolName: string;
  inviteCode: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";
  await resend.emails.send({
    from: FROM,
    to:   opts.to,
    subject: `A spot opened up in ${opts.poolName}`,
    html: `
      <p>Hi ${opts.displayName},</p>
      <p>A spot has opened up in <strong>${opts.poolName}</strong>.</p>
      <p><a href="${siteUrl}/join/${opts.inviteCode}">Claim your spot →</a></p>
      <p>First come, first served — spots fill quickly.</p>
    `,
  });
}
