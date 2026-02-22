import FirecrawlApp from "@mendable/firecrawl-js";

// Ensure FIRECRAWL_API_KEY is available in the environment variables
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export type ResearchData = {
    companyName: string;
    domain: string;
};

import { z } from "zod";
import { generateObject } from "ai";
import { aiModel } from "@/lib/ai/models";

const ResearchSynthesisSchema = z.object({
    size: z.string().describe("Company size or employee count range (e.g., '100-500 employees' or 'Unknown')"),
    revenue: z.string().describe("Estimated annual revenue (e.g., '$10M - $50M' or 'Unknown')"),
    news: z.object({
        expansion: z.array(z.string()).describe("Recent expansion plans, new offices, hiring sprees, or strategic growth initiatives."),
        products: z.array(z.string()).describe("New products, features, or significant service launches."),
        regions: z.array(z.string()).describe("New geographic regions or markets entered.")
    }),
    summary: z.string().describe("A concise 2-paragraph general overview of the company, its business model, and recent market positioning.")
});

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Perform deep research on a company using their domain/name via Firecrawl.
 * It searches the web and uses an AI model to synthesize structured output representing firmographics and news.
 * Returns a markdown string containing the formatted research context.
 */
export async function performCompanyResearch(data: ResearchData): Promise<string> {
    console.log(`[Research] Starting Firecrawl research for ${data.companyName} (${data.domain})...`);

    try {
        const query = `${data.companyName} ${data.domain} business model, recent news, competitors, and core products`;

        const searchResponse = (await firecrawl.search(query, {
            limit: 5,
            sources: ['news', 'web'],
            scrapeOptions: {
                formats: ['markdown'],
            }
        })) as any;

        if (!searchResponse.success) {
            throw new Error(`Firecrawl search failed: ${searchResponse.error}`);
        }

        let rawContext = "";

        searchResponse.data.forEach((result: any, idx: number) => {
            const markdown = result.markdown || result.description || "No content extracted.";
            rawContext += `## Source ${idx + 1}: ${result.url}\n${markdown}\n\n`;
        });

        console.log(`[Research] Synthesizing Firecrawl data via AI...`);

        const { object } = await generateObject({
            model: aiModel("gemini-3-flash-preview"),
            schema: ResearchSynthesisSchema,
            prompt: `You are an expert corporate researcher. Analyze the following raw web search results for the company ${data.companyName} (${data.domain}).\n\nExtract and synthesize the company's size, revenue, recent news (specifically expansion plans, new products, and new geographical regions), and provide a concise summary.\n\nRAW WEB DATA:\n\n${rawContext}`
        });

        let compiledResearch = `# Research Context: ${data.companyName}\n\n`;
        compiledResearch += `## Overview\n${object.summary}\n\n`;
        compiledResearch += `## Firmographics\n- **Size/Employees**: ${object.size}\n- **Estimated Revenue**: ${object.revenue}\n\n`;

        compiledResearch += `## Recent Developments\n`;

        compiledResearch += `### Expansion Plans\n`;
        if (object.news.expansion.length > 0) {
            object.news.expansion.forEach(item => compiledResearch += `- ${item}\n`);
        } else {
            compiledResearch += `- No recent expansion plans found.\n`;
        }

        compiledResearch += `\n### New Products/Features\n`;
        if (object.news.products.length > 0) {
            object.news.products.forEach(item => compiledResearch += `- ${item}\n`);
        } else {
            compiledResearch += `- No new products or features found.\n`;
        }

        compiledResearch += `\n### New Regions/Markets\n`;
        if (object.news.regions.length > 0) {
            object.news.regions.forEach(item => compiledResearch += `- ${item}\n`);
        } else {
            compiledResearch += `- No new geographic expansions found.\n`;
        }

        console.log(`[Research] Successfully synthesized research (${compiledResearch.length} chars)`);
        return compiledResearch;

    } catch (error) {
        console.error(`[Research] Error during Firecrawl research:`, error);
        throw error;
    }
}
