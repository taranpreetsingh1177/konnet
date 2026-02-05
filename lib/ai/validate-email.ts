import { generateText } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";

if (!process.env.GOOGLE_VERTEX_PROJECT) {
  throw new Error("GOOGLE_VERTEX_PROJECT environment variable is required");
}

if (!process.env.GOOGLE_VERTEX_LOCATION) {
  throw new Error("GOOGLE_VERTEX_LOCATION environment variable is required");
}

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION,
});

export async function validateEmailContent(
  subject: string,
  body: string,
): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const prompt = `You are a Quality Assurance AI for an email automation system.
Your task is to validate the following cold email content.

Check for these CRITICAL FAILURES:
1. Malformed placeholders (e.g., {{name}}, {company_name} left unreplaced).
2. Empty or missing sections.
3. Text that looks like a prompt or raw JSON (e.g., "Here is the email:", "{"subject":...").
4. Offensive or completely nonsensical text.
5. Large blocks of Lorem Ipsum or placeholder text.

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
