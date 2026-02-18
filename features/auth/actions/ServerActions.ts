"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  // Ensure we use localhost in development to avoid production redirects
  const appUrl = process.env.NODE_ENV === "production"
    ? (process.env.NEXT_PUBLIC_APP_URL || "https://konnet.alvion.in")
    : "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("Magic link error:", error);
    return { error: error.message };
  }

  return { success: `Magic link sent to ${email}. Please check your inbox.` };
}

export async function signInWithGoogle() {
  const supabase = await createClient();

  // Ensure we use localhost in development to avoid production redirects
  const appUrl = process.env.NODE_ENV === "production"
    ? (process.env.NEXT_PUBLIC_APP_URL || "https://konnet.alvion.in")
    : "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("Google sign in error:", error);
    return { error: error.message };
  }

  return { url: data.url, success: true };
}
