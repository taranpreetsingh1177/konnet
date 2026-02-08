
import { NextRequest, NextResponse } from "next/server";
import { getGmailClient } from "@/lib/gmail";
import { syncGmailReplies } from "@/lib/sync-replies";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// This webhook is called by Google Cloud Pub/Sub
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Pub/Sub message format
        const message = body.message;

        if (!message || !message.data) {
            console.warn("Invalid Pub/Sub message format");
            return NextResponse.json({ error: "Invalid message" }, { status: 400 });
        }

        // Decode the data
        const dataString = Buffer.from(message.data, "base64").toString("utf-8");
        const data = JSON.parse(dataString);

        // Should contain emailAddress and historyId
        const { emailAddress, historyId } = data;

        console.log(`Received Gmail notification for ${emailAddress}, historyId: ${historyId}`);

        // Immediately acknowledge the message to avoid retries
        // Asynchronously trigger sync (fire and forget)
        triggerSync(emailAddress).catch(err => console.error("Sync trigger failed:", err));

        return NextResponse.json({ status: "received" }, { status: 200 });
    } catch (error) {
        console.error("Error processing Pub/Sub message:", error);
        // Return 200 even on error to stop Pub/Sub from retrying indefinitely on bad logic
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

async function triggerSync(emailAddress: string) {
    // Find user_id by email from 'accounts' table
    // We need to match 'emailAddress' from notification (the gmail address) to the account.

    // Note: The 'email' column in 'accounts' stores the connected google email.
    // If you store it differently, adjust this query.

    const { data: account } = await supabaseAdmin
        .from('accounts')
        .select('user_id')
        .eq('email', emailAddress)
        .eq('provider', 'google')
        .single();

    if (!account) {
        console.warn(`No account found for email ${emailAddress}`);
        return;
    }

    await syncGmailReplies(account.user_id);
}
