import { generateObject } from "ai";
import { vertex } from "@/lib/vertex-ai/vertex-ai";
import { z } from "zod";

export const LinkedInOutputSchema = z.object({
    message: z.string().describe("A professional, conversational LinkedIn connection request message or direct message (strictly under 300 characters for connection requests)"),
});

export async function generateLinkedinMessage(
    companyName: string,
    domain: string,
    researchContext: string
): Promise<string> {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Starting LinkedIn Message Generation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        const { getDefaultTemplate } = await import("@/features/prompts/actions/content-actions");
        const template = await getDefaultTemplate();

        const systemPrompt = "You are an expert sales professional writing highly converting LinkedIn connection messages. Keep it brief, contextual, and do NOT use placeholders. Maximum 300 characters.";

        // Fallback message if no linkedin template exists yet, though it should be set
        const userPromptTemplate = "Write a short LinkedIn connection request focusing on how Alvion AI Strategy can help {{company}}'s specific initiatives.";

        const enhancedUserPrompt = `
${userPromptTemplate.replace("{{company}}", companyName).replace("{{domain}}", domain)}

--- FIRECRAWL RESEARCH CONTEXT ---
Use the following research to make the message highly relevant to them:
${researchContext}
--- END RESEARCH CONTEXT ---
    `.trim();

        console.log("🤖 Calling Gemini 3 Flash Preview via generateObject for LinkedIn...");

        const { object: result } = await generateObject({
            model: vertex("gemini-3-flash-preview"),
            schema: LinkedInOutputSchema,
            system: systemPrompt,
            prompt: enhancedUserPrompt,
        });

        console.log("✅ Generated LinkedIn message successfully");

        return result.message;
    } catch (error) {
        console.error("❌ AI LINKEDIN GENERATION FAILED", error);
        throw error;
    }
}
