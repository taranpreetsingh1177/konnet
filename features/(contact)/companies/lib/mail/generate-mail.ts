import { generateText, Output } from "ai";
import { aiModel } from "@/lib/ai/models";
import { z } from "zod";


export const EmailOutputSchema = z.object({
    subject: z.string().describe("The engaging subject line of the cold outreach email"),
    body: z.string().describe("The HTML body of the email, formatted with standard <p> and <br> tags for readability. Omit the subject at the beginning."),
});

export type GenerateEmailResult = z.infer<typeof EmailOutputSchema>;

export async function generateCompanyEmailTemplate(
    systemPrompt: string,
    userPrompt: string
): Promise<GenerateEmailResult> {

    try {

        const { output: result } = await generateText({
            model: aiModel("gemini-3-flash-preview"),
            output: Output.object({
                schema: EmailOutputSchema,
            }),
            system: systemPrompt,
            prompt: userPrompt,
        });


        return result;
    } catch (error) {
        throw new Error(`Failed to generate company email template: ${error}`);
    }
}
