"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export async function login(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;
  const next     = (formData.get("next")    as string | null) || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Bypass the email confirmation gate — confirm via admin then retry
    if (error.message.toLowerCase().includes("email not confirmed")) {
      try {
        const admin = createAdminClient();
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          await admin.auth.admin.updateUserById(found.id, { email_confirm: true });
          const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!retryErr) redirect(next);
          return { error: retryErr!.message };
        }
      } catch {
        // Admin client unavailable (service role key not set) — fall through
      }
      return { error: "Please verify your email before signing in, or contact support." };
    }
    return { error: error.message };
  }

  redirect(next);
}

export async function signup(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email       = formData.get("email")        as string;
  const password    = formData.get("password")     as string;
  const displayName = formData.get("display_name") as string;
  const dobStr      = formData.get("date_of_birth") as string;
  const next        = (formData.get("next")         as string | null) || "/";

  if (!email || !password || !displayName || !dobStr) {
    return { error: "All fields are required." };
  }

  // Under-18 check
  const dob   = new Date(dobStr);
  const age18 = new Date(dob);
  age18.setFullYear(age18.getFullYear() + 18);
  if (age18 > new Date()) {
    return { error: "You must be 18 or older to create an account." };
  }

  const supabase  = await createClient();
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        date_of_birth: dobStr,
        email_needs_verification: true,
      },
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) return { error: error.message };

  // If Supabase requires email confirmation the session is null — bypass via admin
  if (data.user && !data.session) {
    try {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) return { error: signInErr.message };
    } catch {
      // Admin key not set — account created but can't sign in automatically
      return { error: "Account created — check your email to verify and then sign in." };
    }
  }

  redirect(next);
}

export async function resendVerification(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm` },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
