import FirecrawlApp from "@mendable/firecrawl-js";

// Ensure FIRECRAWL_API_KEY is available in the environment variables
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export type ResearchData = {
    companyName: string;
    domain: string;
};

/**
 * Perform deep research on a company using their domain/name via Firecrawl.
 * Returns a markdown string containing the synthesized research context.
 */
export async function performCompanyResearch(data: ResearchData): Promise<string> {
    console.log(`[Research] Starting Firecrawl research for ${data.companyName} (${data.domain})...`);

    try {
        // Optionally we can scrape the domain directly, but search gives broader context (news + info)
        const query = `${data.companyName} ${data.domain} business model, recent news, competitors, and core products`;

        // We use the search endpoint to get recent web context
        const searchResponse = (await firecrawl.search(query, {
            limit: 3, // Extract top 3 results
            scrapeOptions: {
                formats: ['markdown'],
            }
        })) as any;

        if (!searchResponse.success) {
            throw new Error(`Firecrawl search failed: ${searchResponse.error}`);
        }

        let compiledResearch = `# Research Context: ${data.companyName}\n\n`;

        searchResponse.data.forEach((result: any, idx: number) => {
            // Safely access the deeply nested markdown if it exists
            const markdown = result.markdown || result.description || "No content extracted.";
            compiledResearch += `## Source ${idx + 1}: ${result.url}\n${markdown}\n\n`;
        });

        console.log(`[Research] Successfully compiled research (${compiledResearch.length} chars)`);
        return compiledResearch;

    } catch (error) {
        console.error(`[Research] Error during Firecrawl research:`, error);
        throw error;
    }
}
