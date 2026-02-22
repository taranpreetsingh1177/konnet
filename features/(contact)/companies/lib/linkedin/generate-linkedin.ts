import { generateText, Output } from "ai";
import { aiModel } from "@/lib/ai/models";
import { z } from "zod";

export const LinkedInOutputSchema = z.object({
    message: z.string().describe("A professional, conversational LinkedIn connection request message or direct message (strictly under 300 characters for connection requests)"),
});

export async function generateLinkedinMessage(
    systemPrompt: string,
    userPrompt: string
): Promise<string> {

    try {

        const { output: result } = await generateText({
            model: aiModel("gemini-3-flash-preview"),
            system: systemPrompt,
            prompt: userPrompt,
            output: Output.object({
                schema: LinkedInOutputSchema,
            }),
        });


        return result.message;
    } catch (error) {
        throw error;
    }
}
