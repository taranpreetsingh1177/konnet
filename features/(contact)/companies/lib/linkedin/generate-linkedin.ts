import { generateObject } from "ai";
import { aiModel } from "@/lib/ai/models";
import { z } from "zod";

export const LinkedInOutputSchema = z.object({
    message: z.string().describe("A professional, conversational LinkedIn connection request message or direct message (strictly under 300 characters for connection requests)"),
});

export async function generateLinkedinMessage(
    companyName: string,
    domain: string,
    researchContext: string,
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Starting LinkedIn Message Generation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        const finalSystemPrompt = systemPrompt || "You are an expert sales professional writing highly converting LinkedIn connection messages. Keep it brief, contextual, and do NOT use placeholders. Maximum 300 characters.";

        const enhancedUserPrompt = `
${userPrompt}

--- FIRECRAWL RESEARCH CONTEXT ---
Use the following research to make the message highly relevant to them:
${researchContext}
--- END RESEARCH CONTEXT ---
    `.trim();

        console.log("🤖 Calling Gemini 3 Flash Preview via generateObject for LinkedIn...");

        const { object: result } = await generateObject({
            model: aiModel("gemini-3-flash-preview"),
            schema: LinkedInOutputSchema,
            system: finalSystemPrompt,
            prompt: enhancedUserPrompt,
        });

        console.log("✅ Generated LinkedIn message successfully");

        return result.message;
    } catch (error) {
        console.error("❌ AI LINKEDIN GENERATION FAILED", error);
        throw error;
    }
}
