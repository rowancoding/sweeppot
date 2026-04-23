import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import UpdatePaymentForm from "./UpdatePaymentForm";

export default async function UpdatePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: poolId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/auth/login?next=/pool/${poolId}/update-payment`);

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, comp, status, bet_aud")
    .eq("id", poolId)
    .single();

  if (!pool) notFound();

  if (pool.status !== "waiting") {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div style={{ padding: "0.75rem 0 0" }}>
            <Link href={`/pool/${poolId}`} className="nav-btn" style={{ fontSize: "0.72rem", padding: "0.32rem 0.8rem", textDecoration: "none" }}>← Back to Pool</Link>
          </div>
          <div className="auth-logo">Sweeppot</div>
          <div className="auth-body">
            <div className="auth-global-err">This pool is no longer accepting payment updates.</div>
          </div>
        </div>
      </div>
    );
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("id, payment_status")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant || participant.payment_status !== "payment_required") {
    redirect(`/pool/${poolId}`);
  }

  return (
    <UpdatePaymentForm
      poolId={poolId}
      poolName={pool.name}
      betAud={pool.bet_aud}
    />
  );
}
