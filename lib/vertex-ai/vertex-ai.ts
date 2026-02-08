import { createVertex } from "@ai-sdk/google-vertex";

// Create Vertex AI provider
if (!process.env.GOOGLE_VERTEX_PROJECT) {
    throw new Error("GOOGLE_VERTEX_PROJECT environment variable is required");
}

if (!process.env.GOOGLE_VERTEX_LOCATION) {
    throw new Error("GOOGLE_VERTEX_LOCATION environment variable is required");
}

// Parse Google Auth credentials if provided (for deployment)
let googleAuthOptions: any = undefined;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        console.log(
            "[Vertex AI] Using credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON",
        );
        console.log("[Vertex AI] Credential type:", creds.type);
        googleAuthOptions = { credentials: creds };
    } catch (error) {
        console.error(
            "[Vertex AI] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:",
            error,
        );
        throw new Error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
} else {
    console.log("[Vertex AI] Using Application Default Credentials (ADC)");
}

export const vertex = createVertex({
    project: process.env.GOOGLE_VERTEX_PROJECT,
    location: process.env.GOOGLE_VERTEX_LOCATION,
    googleAuthOptions,
});
