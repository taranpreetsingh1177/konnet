"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    console.error("Google sign in error:", error);
    return { error: error.message };
  }

  return { url: data.url };
}
