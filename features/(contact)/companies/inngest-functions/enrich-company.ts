import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { NonRetriableError } from "inngest";
import { generateCompanyEmailTemplate } from "../lib/generate-email";
import { validateEmailContent } from "../lib/validate-email";

// Create admin Supabase client for background jobs
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default inngest.createFunction(
    {
        id: "enrich-company",
        retries: 2,
        concurrency: { limit: 2 },
        onFailure: async ({ event, error }) => {
            // Save error to database when all retries are exhausted
            const companyId = event.data.event.data.companyId;
            await supabase
                .from("companies")
                .update({
                    enrichment_status: "failed",
                    enrichment_error: error.message || "Unknown error occurred",
                })
                .eq("id", companyId);
        }
    },
    { event: "company/enrich" },
    async ({ event, step }) => {
        const { companyId } = event.data;
        console.log(`[Enrich Company] Starting enrichment for company: ${companyId}`);

        // Step 1: Fetch company details
        const company = await step.run("fetch-company", async () => {
            console.log(`[Enrich Company] Fetching company details: ${companyId}`);
            const { data, error } = await supabase
                .from("companies")
                .select("*")
                .eq("id", companyId)
                .single();

            if (error || !data) {
                console.error(`[Enrich Company] Company not found: ${companyId}`, error);
                throw new NonRetriableError(`Company not found: ${companyId}`);
            }
            return data;
        });

        // Step 2: Update status to processing
        await step.run("update-status-processing", async () => {
            console.log(`[Enrich Company] Updating status to processing: ${companyId}`);
            await supabase
                .from("companies")
                .update({
                    enrichment_status: "processing",
                    enrichment_started_at: new Date().toISOString(),
                    enrichment_error: null,
                })
                .eq("id", companyId);
        });


        // Step 3: Generate email template with Google Search grounding (combines research + generation)
        const emailData = await step.run("generate-email-template", async () => {
            console.log(`[Enrich Company] Generating email template for: ${company.name}`);
            try {
                const result = await generateCompanyEmailTemplate({
                    name: company.name,
                    domain: company.domain,
                });

                // 🛡️ AI Quality Check
                console.log(`[Enrich Company] Validating generated email for: ${company.name}`);
                // const validation = await validateEmailContent(result.subject, result.body);

                // if (!validation.isValid) {
                //     console.warn(`[Enrich Company] Validation failed: ${validation.reason}`);
                //     throw new Error(`AI Validation Failed: ${validation.reason}`);
                // }

                return result;
            } catch (error) {
                console.error("[Enrich Company] Error generating email template:", error);
                throw error;
            }
        });

        // Step 4: Update company with enriched data
        await step.run("update-company-data", async () => {
            console.log(`[Enrich Company] Updating company with enriched data: ${companyId}`);
            await supabase
                .from("companies")
                .update({
                    email_subject: emailData.subject,
                    email_template: emailData.body,
                    enrichment_status: "completed",
                })
                .eq("id", companyId);
        });

        console.log(`[Enrich Company] Completed enrichment for company: ${companyId}`);
        return { success: true, companyId };
    }
);
