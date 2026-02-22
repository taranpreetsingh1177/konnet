import { generateObject } from "ai";
import { aiModel } from "@/lib/ai/models";
import { z } from "zod";

export type CompanyData = {
    name: string;
    domain: string;
};

export const EmailOutputSchema = z.object({
    subject: z.string().describe("The engaging subject line of the cold outreach email"),
    body: z.string().describe("The HTML body of the email, formatted with standard <p> and <br> tags for readability. Omit the subject at the beginning."),
});

export type GenerateEmailResult = z.infer<typeof EmailOutputSchema>;

/**
 * Generate company email template using the strict EmailOutputSchema.
 * The `researchContext` string from Firecrawl is provided to personalize the email.
 */
export async function generateCompanyEmailTemplate(
    company: CompanyData,
    researchContext: string,
    systemPrompt: string,
    userPrompt: string
): Promise<GenerateEmailResult> {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Starting Company Email Generation (Structured)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Company: ${company.name}`);

    try {
        console.log("🤖 Calling Gemini 3 Flash Preview via generateObject...");

        // We enforce the JSON object structure 
        const strictSystemPrompt = systemPrompt + "\n\nCRITICAL: You must return strictly valid JSON matching the specified schema. Output pure HTML in the body property including <p> and <br> elements for spacing. Do not include markdown wraps.";

        // Add research context to the prompt
        const enhancedUserPrompt = `
${userPrompt}

--- FIRECRAWL RESEARCH CONTEXT ---
Use the following research to personalize the email effectively:
${researchContext}
--- END RESEARCH CONTEXT ---
    `.trim();

        const { object: result } = await generateObject({
            model: aiModel("gemini-3-flash-preview"),
            schema: EmailOutputSchema,
            system: strictSystemPrompt,
            prompt: enhancedUserPrompt,
        });

        console.log("✅ Generated HTML Body Subject:", result.subject);

        return result;
    } catch (error) {
        console.error("❌ AI COMPANY EMAIL GENERATION FAILED", error);
        throw error; // Let Inngest retry this specific step
    }
}
