import { generateText } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";

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
      "[Vertex AI Validate] Using credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON",
    );
    console.log("[Vertex AI Validate] Credential type:", creds.type);
    googleAuthOptions = { credentials: creds };
  } catch (error) {
    console.error(
      "[Vertex AI Validate] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:",
      error,
    );
    throw error;
  }
} else {
  console.log(
    "[Vertex AI Validate] Using Application Default Credentials (ADC)",
  );
}

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION,
  googleAuthOptions,
});

export async function validateEmailContent(
  subject: string,
  body: string,
): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const prompt = `You are a Quality Assurance AI for an email automation system.
Your task is to validate an EMAIL TEMPLATE.

CRITICAL INSTRUCTIONS:
1. This is a TEMPLATE, so {{name}} placeholders MUST be present. DO NOT flag them as errors.
2. Malformed placeholders like <insert here> or [Name] ARE errors. {{name}} is CORRECT.
3. The email signature might only contain a name/title and not a full closing block. This is acceptable.
4. {{company}} placeholder is not a valid placeholder. The email generator should have already replaced it with the company name.

Check for these CRITICAL FAILURES:
- Broken logic or implementation (e.g., raw JSON code visible).
- Offensive or completely nonsensical text.
- Large blocks of Lorem Ipsum.
- Unreplaced "prompt-like" placeholders (e.g., "[Insert Company Name Here]").

EMAIL SUBJECT: "${subject}"
EMAIL BODY (HTML):
${body}

Return a pure JSON object. No markdown formatting.
Structure:
{
  "isValid": boolean,
  "reason": "short explanation if valid is false, otherwise null"
}`;

    const response = await generateText({
      model: vertex("gemini-2.5-flash-lite"),
      prompt: prompt,
    });

    const text = response.text.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(text);
    return {
      isValid: !!result.isValid,
      reason: result.reason || undefined,
    };
  } catch (error) {
    console.error("Email validation failed:", error);

    return { isValid: true };
  }
}
