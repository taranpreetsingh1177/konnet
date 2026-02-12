import { getOutlookTokens } from "@/lib/outlook";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Client } from "@microsoft/microsoft-graph-client";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(
            new URL("/dashboard/credentials?error=No code provided", request.url),
        );
    }

    try {
        const tokens = await getOutlookTokens(code);

        // Get user info
        const client = Client.init({
            authProvider: (done) => {
                done(null, tokens.access_token);
            },
        });

        const userProfile = await client.api("/me").get();
        const email = userProfile.mail || userProfile.userPrincipalName;

        if (!email) {
            throw new Error("Could not retrieve email from Outlook");
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Upsert account
        const { error } = await supabase.from("accounts").upsert(
            {
                user_id: user.id,
                email: email,
                refresh_token: tokens.refresh_token,
                access_token: tokens.access_token,
                expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
                provider: "outlook",
            },
            {
                onConflict: "user_id,email",
            },
        );

        if (error) {
            console.error("Supabase error:", error);
            throw new Error("Failed to save account");
        }

        return NextResponse.redirect(
            new URL(
                "/dashboard/credentials?success=Outlook account connected",
                request.url,
            ),
        );
    } catch (error: any) {
        console.error("Outlook Auth Error:", error);
        return NextResponse.redirect(
            new URL(
                `/dashboard/credentials?error=${encodeURIComponent(
                    error.message || "Failed to connect account",
                )}`,
                request.url,
            ),
        );
    }
}
