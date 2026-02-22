export type PromptContext = {
    companyName: string;
    domain: string;
    researchContext: string;
};

/**
 * Replaces our standardized "Live Token" variables with their actual values.
 * This is used identically by the Frontend Visualizer Tab and the Backend Inngest generation.
 */
export function injectVariables(prompt: string, context: PromptContext): string {
    if (!prompt) return "";

    return prompt
        .replace(/\{\{\s*company_name\s*\}\}/gi, context.companyName)
        .replace(/\{\{\s*company_domain\s*\}\}/gi, context.domain)
        .replace(/\{\{\s*research_context\s*\}\}/gi, context.researchContext);
}
