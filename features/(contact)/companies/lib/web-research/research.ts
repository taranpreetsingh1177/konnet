import FirecrawlApp, { Document } from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "fc-8c5f1659b3a04394830d9951cffe1223" });

import { z } from "zod";
import { generateText, Output } from "ai";
import { aiModel } from "@/lib/ai/models";

export type CompanyData = {
    companyName: string;
    domain: string;
};

const ResearchSynthesisSchema = z.object({
    employees: z.string().describe("Company size or employee count range (e.g., '100-500 employees' or 'Unknown')"),
    revenue: z.string().describe("Estimated annual revenue (e.g., '$10M - $50M' or 'Unknown')"),
    news: z.array(z.string()).describe("Recent expansion plans, new offices, hiring sprees, or strategic growth initiatives."),
    overview: z.string().describe("A concise 2-paragraph general overview of the company, its business model, and recent market positioning.")
});

export async function performCompanyResearch(companyData: CompanyData): Promise<string> {
    try {
        // Apply google search for company size and revenue
        const { text: CompanySizeAndRevenue } = await generateText({
            model: aiModel('gemini-3-flash-preview'),
            prompt: `You are an expert corporate researcher. You have to research for company size and revenue of ${companyData.companyName} (${companyData.domain}).`
        })

        const fireCrawlQuery = `${companyData.companyName} ${companyData.domain} business model, recent news, competitors, and core products`;

        const CompanyResearch = await firecrawl.search(fireCrawlQuery, {
            limit: 3,
            sources: ['news', 'web'],
            scrapeOptions: {
                formats: ['markdown'],
            }
        })

        if ((!CompanyResearch.web && !CompanyResearch.news)) {
            throw new Error(`Firecrawl search failed for company ${companyData.companyName} (${companyData.domain})`);
        }

        // TODO: check it
        let rawContext = "";

        CompanyResearch.web?.forEach((result, idx) => {
            const doc = result as Document;
            const markdown = doc.markdown || "No content extracted.";
            rawContext += `## Source ${idx + 1}: ${doc.metadata?.title}\n${markdown}\n\n`;
        });

        CompanyResearch.news?.forEach((result, idx) => {
            const doc = result as Document;
            const markdown = doc.markdown || "No content extracted.";
            rawContext += `## Source ${idx + 1}: ${doc.metadata?.title}\n${markdown}\n\n`;
        });

        const { output: research } = await generateText({
            model: aiModel("gemini-3-flash-preview"),
            output: Output.object({
                schema: ResearchSynthesisSchema,
            }),
            prompt: `You are an expert corporate researcher. Analyze the following raw web search results for the company ${companyData.companyName} (${companyData.domain}).
            \n\nCompany size and revenue is given: ${CompanySizeAndRevenue}
            \n\nExtract and synthesize the company's recent news (specifically expansion plans, new products, and new geographical regions), and provide a concise summary.\n\nRAW WEB DATA:\n\n${rawContext}`
        });

        let compiledResearch = `# Research Context: ${companyData.companyName}\n\n`;
        compiledResearch += `## Overview\n${research.overview}\n\n`;
        compiledResearch += `## Firmographics\n- **Size/Employees**: ${research.employees}\n- **Estimated Revenue**: ${research.revenue}\n\n`;

        compiledResearch += `### Recent News\n`;
        if (research.news.length > 0) {
            research.news.forEach(item => compiledResearch += `- ${item}\n`);
        } else {
            compiledResearch += `- No recent expansion plans found.\n`;
        }

        return compiledResearch;

    } catch (error) {
        throw new Error(`Failed to perform company research: ${error}`);
    }
}
