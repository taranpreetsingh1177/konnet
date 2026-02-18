import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || "common";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    }/api/outlook/callback`;

const SCOPES = [
    "openid",
    "profile",
    "offline_access",
    "User.Read",
    "Mail.Read",
    "Mail.Send",
];

export const getOutlookAuthUrl = () => {
    const params = new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        response_mode: "query",
        scope: SCOPES.join(" "),
        state: "12345", // In production, use a random string
    });

    return `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
};

export const getOutlookTokens = async (code: string) => {
    const params = new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        scope: SCOPES.join(" "),
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        client_secret: AZURE_CLIENT_SECRET,
    });

    const response = await fetch(
        `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        },
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error_description || "Failed to fetch outlook tokens");
    }

    return data;
};

export const refreshOutlookToken = async (
    refreshToken: string,
    accountId: string,
) => {
    const params = new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: SCOPES.join(" "),
    });

    const response = await fetch(
        `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        },
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error_description || "Failed to refresh outlook tokens",
        );
    }

    // Save new tokens to DB by Account ID
    const updateData: any = {
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000 + data.expires_in),
    };

    if (data.refresh_token) {
        updateData.refresh_token = data.refresh_token;
    }

    await supabaseAdmin
        .from("accounts")
        .update(updateData)
        .eq("id", accountId)
        .eq("provider", "outlook");

    return data;
};

/**
 * Creates an Outlook client from a specific account record.
 * Handles token refresh events and updates the database by Account ID.
 */
export const createOutlookClient = async (account: any) => {
    // Initialize Graph Client with custom auth provider
    const client = Client.init({
        authProvider: async (done) => {
            try {
                // Always fetch fresh account data from DB to avoid stale token issues (especially with Inngest retries)
                const { data: freshAccount, error } = await supabaseAdmin
                    .from("accounts")
                    .select("access_token, refresh_token, expires_at")
                    .eq("id", account.id)
                    .single();

                if (error || !freshAccount) {
                    console.error("Failed to fetch fresh account data", error);
                    // Fallback to provided account if DB fetch fails -> though this might still cause invalid_grant
                    // But better to fail here than use stale data blindly loops
                    // actually if we can't fetch, we probably can't save either.
                    throw new Error("Failed to fetch fresh account for authentication");
                }

                let accessToken = freshAccount.access_token;
                const now = Math.floor(Date.now() / 1000);

                // Check if token is expired or about to expire (within 5 mins)
                if (freshAccount.expires_at && now > freshAccount.expires_at - 300) {
                    console.log("Refreshing Outlook token for account", account.id);
                    const newTokens = await refreshOutlookToken(
                        freshAccount.refresh_token,
                        account.id,
                    );
                    accessToken = newTokens.access_token;

                    // We don't strictly need to update 'account' param here as we fetch fresh next time,
                    // but we can do it to keep local state fairly sync for current execution loop if any.
                    account.access_token = newTokens.access_token;
                    account.refresh_token = newTokens.refresh_token;
                    account.expires_at = Math.floor(Date.now() / 1000 + newTokens.expires_in);
                }

                done(null, accessToken);
            } catch (err: any) {
                console.error("Error in Outlook auth provider:", err);
                done(err, null);
            }
        },
    });

    return client;
};

export const getOutlookClient = async (userId: string) => {
    // 1. Fetch account from DB
    const { data: account, error } = await supabaseAdmin
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "outlook")
        .single();

    if (error || !account) {
        throw new Error(
            `Could not find Outlook account for user ${userId}: ${error?.message}`,
        );
    }

    return createOutlookClient(account);
};
