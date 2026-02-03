import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Ensure formatting 
export const maxDuration = 60; // Allow 60s execution

export async function GET() {
    console.log("Starting reply check job...");

    // 1. Init Admin Supabase
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 2. Fetch 'sent' leads that haven't replied yet (last 14 days)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const { data: leads, error } = await supabase
            .from("campaign_leads")
            .select(`
                id, 
                thread_id, 
                account_id,
                leads(email),
                campaign_accounts!inner(
                    accounts!inner(
                        id, 
                        email, 
                        refresh_token
                    )
                )
            `)
            .eq("status", "sent")
            .is("replied_at", null)
            .neq("thread_id", null) // Must have a thread_id
            .gt("sent_at", twoWeeksAgo.toISOString());

        if (error) {
            console.error("Error fetching leads:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!leads || leads.length === 0) {
            return NextResponse.json({ message: "No leads to check" });
        }

        console.log(`Checking replies for ${leads.length} leads...`);

        // 3. Group by Account to minimize auth calls
        // leads[i].campaign_accounts.accounts is where the creds are
        // Note: The query structure depends on how exactly the relation is set up.
        // Assuming the join returns the account info correctly.

        type AccountLeads = {
            account: { id: string; email: string; refresh_token: string };
            items: typeof leads;
        };

        const leadsByAccount = new Map<string, AccountLeads>();

        for (const item of leads) {
            // Traverse the nested relation to find the account credentials
            // Adjust based on actual returned shape. 
            // In the query above: campaign_leads -> campaign_accounts -> accounts
            const account = (item.campaign_accounts as any)?.accounts;

            if (!account) continue;

            if (!leadsByAccount.has(account.id)) {
                leadsByAccount.set(account.id, { account, items: [] });
            }
            leadsByAccount.get(account.id)!.items.push(item);
        }

        let repliesFound = 0;

        // 4. Process each account
        for (const { account, items } of leadsByAccount.values()) {
            try {
                // Auth Gmail
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );
                oauth2Client.setCredentials({ refresh_token: account.refresh_token });
                const gmail = google.gmail({ version: "v1", auth: oauth2Client });

                // Check threads for this account
                // To avoid rate limits, process in small chunks or sequentially
                for (const item of items) {
                    if (!item.thread_id) continue;

                    try {
                        const thread = await gmail.users.threads.get({
                            userId: "me",
                            id: item.thread_id,
                            format: "minimal" // We mostly need labelIds and snippet/history
                        });

                        const messages = thread.data.messages;
                        if (!messages || messages.length === 0) continue;

                        // Check the LAST message in the thread
                        const lastMsg = messages[messages.length - 1];

                        // Is it in INBOX? (Not archived/sent by us)
                        // This is a heuristic. A better one is to check if the sender is NOT 'me'.
                        // However, 'minimal' format might not give headers.
                        // Let's use 'metadata' format for better efficiency than 'full'.

                        // Re-fetch if needed or assume logic based on labels.
                        // If the last message has 'SENT' label, it means WE sent it (checking follow-ups).
                        // If it has 'INBOX' and NOT 'SENT', it's likely a reply.

                        const labels = lastMsg.labelIds || [];
                        const isSentByMe = labels.includes("SENT");

                        // If the last message is NOT sent by me, it's a reply from them.
                        if (!isSentByMe) {
                            console.log(`Reply detected for lead ${item.id} (Thread: ${item.thread_id})`);

                            // Mark as replied
                            await supabase
                                .from("campaign_leads")
                                .update({
                                    status: "replied",
                                    replied_at: new Date().toISOString()
                                })
                                .eq("id", item.id);

                            repliesFound++;
                        }

                    } catch (err) {
                        console.error(`Error checking thread ${item.thread_id}:`, err);
                    }
                }

            } catch (err) {
                console.error(`Error processing account ${account.email}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            checked: leads.length,
            repliesFound
        });

    } catch (error: any) {
        console.error("Critical error in reply cron:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
