import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get("id");

    if (leadId) {
        // Asynchronously update the database without waiting (fire and forget pattern for speed)
        // or await it if we want to be sure. Since this is an image load, promptness matters less than reliability.
        try {
            await supabase
                .from("campaign_leads")
                .update({
                    status: "opened",
                    opened_at: new Date().toISOString()
                })
                .eq("id", leadId)
                .is("opened_at", null); // Only update if not already opened (optional, or update last_opened_at)
        } catch (error) {
            console.error("Error tracking open:", error);
        }
    }

    // Return a 1x1 transparent PNG
    // Base64 for 1x1 transparent PNG
    const transparentPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64"
    );

    return new NextResponse(transparentPng, {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    });
}
