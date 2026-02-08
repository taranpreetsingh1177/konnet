
import { google } from 'googleapis';
import { getGmailClient, fetchMessage } from '@/lib/gmail';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Syncs recent messages for a user to check for replies.
 * Uses a time-based window (messages after X timestamp) to find new emails.
 */
export async function syncGmailReplies(userId: string) {
    console.log(`Syncing replies for user: ${userId}`);
    const gmail = await getGmailClient(userId);

    // 1. Fetch latest 20 messages from Inbox.
    // We avoid using 'after:X' query because of potential Gmail search index latency.
    // Getting the latest raw list is more reliable for immediate webhook reactions.
    const res = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 20,
    });

    const messages = res.data.messages;

    if (!messages || messages.length === 0) {
        console.log("No new messages found in the last 5 minutes.");
        return;
    }

    console.log(`Found ${messages.length} recent messages. processing...`);

    // 2. Process each message
    for (const msg of messages) {
        if (!msg.id) continue;

        try {
            // Check if we already processed this message (idempotency)
            const { data: existing } = await supabaseAdmin
                .from('replies')
                .select('id')
                .eq('gmail_message_id', msg.id)
                .single();

            if (existing) {
                console.log(`Message ${msg.id} already processed.`);
                continue;
            }

            // Fetch full details
            const messageDetails = await fetchMessage(userId, msg.id);
            if (!messageDetails) continue;

            const headers = messageDetails.payload?.headers;
            if (!headers) continue;

            // 3. Check for specific headers to identify if it's a reply to our campaign
            // We look for 'In-Reply-To' or 'References'
            const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value;
            // references is unused but part of standard reply checking
            // const references = headers.find((h: any) => h.name === 'References')?.value;
            const threadId = messageDetails.threadId;

            // Strategy: Check if the thread_id exists in our 'campaign_leads' table
            // Only if it matches a known thread do we consider it a relevant reply.
            // This is safer than parsing Message-IDs which might be lost.

            if (!threadId) continue;

            const { data: campaignLead } = await supabaseAdmin
                .from('campaign_leads')
                .select('id, lead_id, campaign_id')
                .eq('thread_id', threadId)
                .single();

            if (!campaignLead) {
                // Not a thread we are tracking
                // console.log(`Thread ${threadId} not found in campaign_leads.`);
                continue;
            }

            console.log(`Found reply for Lead ${campaignLead.lead_id} in Campaign ${campaignLead.campaign_id}`);

            // 4. Extract content
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const snippet = messageDetails.snippet || '';
            const body = getBody(messageDetails.payload);

            // 5. Save to 'replies' table
            // const splitName = (headers.find((h: any) => h.name === 'From')?.value || '').split('<');
            // const fromEmail = splitName.length > 1 ? splitName[1].replace('>', '') : splitName[0];

            const { error: insertError } = await supabaseAdmin
                .from('replies')
                .insert({
                    lead_id: campaignLead.lead_id,
                    campaign_id: campaignLead.campaign_id,
                    user_id: userId,
                    thread_id: threadId,
                    gmail_message_id: msg.id,
                    subject: subject,
                    snippet: snippet,
                    body: body,
                    received_at: new Date().toISOString(),
                });

            if (insertError) {
                console.error("Failed to insert reply:", insertError);
            } else {
                console.log("Reply saved successfully.");

                // 6. Update campaign_lead status
                await supabaseAdmin
                    .from('campaign_leads')
                    .update({
                        replied_at: new Date().toISOString(),
                        status: 'replied',
                    })
                    .eq('id', campaignLead.id);
            }

        } catch (err) {
            console.error(`Error processing message ${msg.id}:`, err);
        }
    }
}

// Helper to extract body from Gmail payload
function getBody(payload: any): string {
    if (!payload) return '';

    let body = '';
    if (payload.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain') {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                break; // Prefer plain text
            } else if (part.mimeType === 'text/html') {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        }
    }
    return body;
}
