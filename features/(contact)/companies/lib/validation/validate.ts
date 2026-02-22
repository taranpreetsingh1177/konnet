import { generateText, Output } from "ai";
import { aiModel } from "@/lib/ai/models";
import { z } from "zod";

export type ValidationProps =
    | { type: "email"; content: string; subject: string; customPrompt?: string }
    | { type: "document"; content: string; customPrompt?: string }
    | { type: "linkedin"; content: string; customPrompt?: string };

const ValidationSchema = z.object({
    isValid: z.boolean().describe("True if the content is safe and valid according to instructions, false otherwise"),
    reason: z.string().optional().describe("Short explanation if valid is false")
});

export async function validateContent(props: ValidationProps): Promise<{ isValid: boolean; reason?: string }> {
    try {

        let prompt = "";

        if (props.type === "email") {
            prompt = `You are a Quality Assurance AI for an email automation system.
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

${props.customPrompt ? `USER DEFINED CONSTRAINTS:\n${props.customPrompt}\n` : ""}
EMAIL SUBJECT: "${props.subject || ''}"
EMAIL BODY (HTML):
${props.content}`;

        } else if (props.type === "document") {
            prompt = `You are a Quality Assurance AI for a strategy proposal generation system.
Your task is to validate the generated Document AST.

Check for these CRITICAL FAILURES:
- Hallucinated competitor names presented as absolute fact without research context backing.
- Inappropriate, offensive, or highly unprofessional language.
- Broken logic, empty repetitive sections, or giant blocks of Lorem Ipsum.
- Placeholders like [Insert Here] that the generator failed to replace.

${props.customPrompt ? `USER DEFINED CONSTRAINTS:\n${props.customPrompt}\n` : ""}
DOCUMENT AST:
${props.content}`;

        } else if (props.type === "linkedin") {
            // Hard fallback check for length
            if (props.content.length > 300) {
                return { isValid: false, reason: "Message exceeded 300 characters." };
            }

            prompt = `You are a Quality Assurance AI for an outreach automation system.
Your task is to validate a LINKEDIN MESSAGE.

Check for these CRITICAL FAILURES:
- Message is longer than 300 characters (LinkedIn connection request limit).
- Message contains unreplaced placeholders like [Insert Context Here] or {{name}}.
- Message is offensive or completely nonsensical.

${props.customPrompt ? `USER DEFINED CONSTRAINTS:\n${props.customPrompt}\n` : ""}
LINKEDIN MESSAGE:
"${props.content}"`;

        } else {
            throw new Error(`Unsupported validation type: ${(props as any).type}`);
        }

        const { output: result } = await generateText({
            model: aiModel("gemini-2.5-flash-lite"),
            output: Output.object({
                schema: ValidationSchema,
            }),
            prompt: prompt,
        });

        return {
            isValid: result.isValid,
            reason: result.reason,
        };
    } catch (error) {
        console.error(`${props.type} validation failed:`, error);
        // If validation natively fails (e.g. rate limit), fail open so we don't block
        return { isValid: true };
    }
}
