import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type      = searchParams.get("type");
  const origin    = request.nextUrl.origin;

  if (tokenHash && type) {
    // Build a redirect response up-front so Supabase can write session cookies onto it
    const response = NextResponse.redirect(`${origin}/`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error && data.user) {
      // Clear the verification flag via admin (doesn't need the new session)
      try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...data.user.user_metadata,
            email_needs_verification: false,
          },
        });
      } catch {
        // Best effort — admin key may not be set in dev
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?message=link-expired`);
}
