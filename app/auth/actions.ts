"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function login(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signup(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email       = formData.get("email")        as string;
  const password    = formData.get("password")     as string;
  const displayName = formData.get("display_name") as string;
  const dobStr      = formData.get("date_of_birth") as string;

  if (!email || !password || !displayName || !dobStr) {
    return { error: "All fields are required." };
  }

  // Under-18 check
  const dob     = new Date(dobStr);
  const today   = new Date();
  const age18   = new Date(dob);
  age18.setFullYear(age18.getFullYear() + 18);
  if (age18 > today) {
    return { error: "You must be 18 or older to create an account." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        date_of_birth: dobStr,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
