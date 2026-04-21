import { redirect } from "next/navigation";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;

  if (!token_hash || type !== "recovery") {
    redirect("/auth/forgot-password");
  }

  return <ResetPasswordForm tokenHash={token_hash} />;
}
