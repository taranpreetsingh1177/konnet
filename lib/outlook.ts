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
    await supabaseAdmin
        .from("accounts")
        .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token, // Sometimes it rotates
            expires_at: Math.floor(Date.now() / 1000 + data.expires_in),
        })
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
                let accessToken = account.access_token;
                const now = Math.floor(Date.now() / 1000);

                // Check if token is expired or about to expire (within 5 mins)
                if (account.expires_at && now > account.expires_at - 300) {
                    console.log("Refreshing Outlook token for account", account.id);
                    const newTokens = await refreshOutlookToken(
                        account.refresh_token,
                        account.id,
                    );
                    accessToken = newTokens.access_token;
                    // Update local account memory to prevent multiple refreshes in short loop if instance is reused (though usually recreated)
                    account.access_token = newTokens.access_token;
                    account.refresh_token = newTokens.refresh_token || account.refresh_token;
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
