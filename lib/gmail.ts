import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Define the Gmail API scope
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];

// Initialize Supabase Admin client (needed to fetch sensitive tokens)
// Note: In a real app, ensure you are handling these secrets securely.
// We use the service role key if available for backend operations, or rely on RLS if calling from a user context.
// However, since this is a backend library function, we likely need the service role to read arbitrary user tokens if this is a background job,
// OR we just use standard client if we are only acting on behalf of the logged-in user.
// For the webhook processing (which is background), we definitely need admin access or a specific way to get the user's token.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Retrieves the OAuth2 client for a specific user.
 * @param userId The Supabase User ID
 */
export async function getGmailClient(userId: string) {
    // 1. Fetch the user's refresh token from the 'accounts' table
    // Assuming 'accounts' table stores providers. We need to find the google provider entry.
    const { data: account, error } = await supabaseAdmin
        .from('accounts')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single();

    if (error || !account) {
        throw new Error(`Could not find Google account for user ${userId}: ${error?.message}`);
    }

    // 2. Setup Google Auth
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXT_PUBLIC_APP_URL // Redirect URL (mostly irrelevant for backend-only calls but required for init)
    );

    // 3. Set credentials
    oauth2Client.setCredentials({
        refresh_token: account.refresh_token,
        access_token: account.access_token, // Optional, but good if valid
        expiry_date: account.expires_at ? Number(account.expires_at) * 1000 : undefined, // Check if your DB stores seconds or ms
    });

    // 4. Handle token refresh events (optional, googleapis does this automatically if refresh_token is present)
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
            // Update the access token in the database
            // This is a simplified example. In production, handle potential race conditions.
            await supabaseAdmin
                .from('accounts')
                .update({
                    access_token: tokens.access_token,
                    expires_at: Math.floor((tokens.expiry_date || Date.now()) / 1000), // Store as seconds
                    // If a new refresh token is provided, update it too
                    ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
                })
                .eq('user_id', userId)
                .eq('provider', 'google');
        }
    });

    // 5. Return the Gmail client
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Sets up the Gmail push notification 'watch' for a user.
 * @param userId The Supabase User ID
 */
export async function watchGmail(userId: string) {
    const gmail = await getGmailClient(userId);

    const topicName = process.env.GOOGLE_PUBSUB_TOPIC;
    if (!topicName) {
        throw new Error('GOOGLE_PUBSUB_TOPIC environment variable is not set');
    }

    const res = await gmail.users.watch({
        userId: 'me',
        requestBody: {
            topicName: topicName,
            labelIds: ['INBOX'], // Watch Inbox. Add 'SENT' etc. if needed.
        },
    });

    return res.data;
}

/**
 * Stops the Gmail push notification 'watch' for a user.
 * @param userId The Supabase User ID
 */
export async function stopWatch(userId: string) {
    const gmail = await getGmailClient(userId);

    await gmail.users.stop({
        userId: 'me',
    });
}

/**
 * Fetches the history of changes for a user.
 * @param userId The Supabase User ID
 * @param startHistoryId The history ID to start from
 */
export async function listHistory(userId: string, startHistoryId: string) {
    const gmail = await getGmailClient(userId);

    const res = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: startHistoryId,
        historyTypes: ['messageAdded'], // We only care about added messages
    });

    return res.data;
}

/**
 * Fetches a specific message by ID.
 * @param userId The Supabase User ID
 * @param messageId The Gmail Message ID
 */
export async function fetchMessage(userId: string, messageId: string) {
    const gmail = await getGmailClient(userId);

    const res = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full', // Get full message details
    });

    return res.data;
}

