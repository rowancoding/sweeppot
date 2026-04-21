"use server";

import { createClient } from "@/lib/supabase-server";
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

  if (error) return { error: error.message };

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

  // Requires "Confirm email" to be OFF in Supabase dashboard →
  // Authentication → Providers → Email → toggle off "Confirm email".
  // With it off, signUp() returns a session immediately and the user is
  // signed in on the spot. The email_needs_verification flag is still set
  // so the dashboard banner prompts them to verify, and pool actions remain
  // gated until they click the confirmation link at /auth/confirm.
  const supabase = await createClient();
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";

  const { error } = await supabase.auth.signUp({
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
