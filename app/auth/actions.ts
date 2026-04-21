"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

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
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
      return { error: "Incorrect password. Please try again." };
    }
    return { error: "Unable to sign in. Please check your details and try again." };
  }

  redirect(next);
}

export async function signup(
  _prev: { error?: string; emailExists?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; emailExists?: boolean }> {
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

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
      return { emailExists: true };
    }
    return { error: "Unable to create account. Please try again." };
  }

  redirect(next);
}

export async function forgotPassword(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email address is required." };

  const supabase = await createClient();
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || "https://sweeppot.com";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  });

  if (error) return { error: "Unable to send reset email. Please try again." };
  return { success: true };
}

export async function resetPassword(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const password        = formData.get("password")         as string;
  const confirmPassword = formData.get("confirm_password") as string;
  const tokenHash       = formData.get("token_hash")       as string;
  const type            = (formData.get("type") as string) || "recovery";

  if (!password || !confirmPassword) return { error: "Both password fields are required." };
  if (password !== confirmPassword)   return { error: "Passwords do not match." };
  if (password.length < 8)            return { error: "Password must be at least 8 characters." };
  if (!tokenHash)                     return { error: "Invalid or expired reset link. Please request a new one." };

  const supabase = await createClient();

  // Exchange the recovery token for a session
  const { error: otpErr } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });
  if (otpErr) return { error: "This reset link has expired or already been used. Please request a new one." };

  // Update the password using the newly established session
  const { error: updateErr } = await supabase.auth.updateUser({ password });
  if (updateErr) return { error: "Unable to update password. Please try again." };

  redirect("/auth/login?message=password-updated");
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
