import { inngest } from "@/lib/inngest/client";
import { NonRetriableError } from "inngest";
import { Companies } from "@/features/(contact)/companies/lib/constants";
import { LeadInput } from "../actions/actions";

export default inngest.createFunction(
    {
        id: "import-leads",
        retries: 3,
    },
    { event: "leads/import.requested" },
    async ({ event, step }) => {
        const { leads, tag, advancedEnrichment, userId } = event.data as {
            leads: LeadInput[];
            tag?: string;
            advancedEnrichment?: boolean;
            userId: string;
        };

        if (!leads || leads.length === 0) {
            throw new NonRetriableError("No leads provided for import");
        }
        if (!userId) {
            throw new NonRetriableError("No user ID provided");
        }

        // Step 1: Extract unique companies format
        const uniqueCompaniesData = await step.run(
            "extract-unique-companies",
            async () => {
                const unique = new Map<string, { name: string; domain: string }>();

                leads.forEach((lead) => {
                    if (lead.company?.trim()) {
                        const companyName = lead.company.trim();
                        const emailDomain = lead.email.split("@")[1]?.toLowerCase();

                        if (!unique.has(companyName)) {
                            unique.set(companyName, {
                                name: companyName,
                                domain:
                                    emailDomain ||
                                    `${companyName.toLowerCase().replace(/\s+/g, "")}.com`,
                            });
                        }
                    }
                });

                return Array.from(unique.values());
            },
        );

        // Step 2: Bulk upsert companies using admin supabase
        const { companyNameToIdMapArray, newCompanyIds } = await step.run(
            "bulk-upsert-companies",
            async () => {
                if (uniqueCompaniesData.length === 0) {
                    return { companyNameToIdMapArray: [], newCompanyIds: [] };
                }

                const { createClient: createServiceClient } = require("@supabase/supabase-js");
                const adminSupabase = createServiceClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                );

                // UPSERT unique companies: 
                // We rely on 'domain' being the unique constraint for conflict resolution.
                // It's safer to attempt a bulk upsert directly and fetch IDs.
                const companiesToUpsert = uniqueCompaniesData.map((co) => ({
                    domain: co.domain,
                    name: co.name,
                    enrichment_status: Companies.EnrichmentStatus.PENDING,
                    ...(advancedEnrichment ? { metadata: { "advanced-enrichment": true } } : {}),
                }));

                // Note: this assumes `domain` has a UNIQUE constraint in the DB.
                const { data: upsertedCompanies, error: upsertError } =
                    await adminSupabase
                        .from("companies")
                        .upsert(companiesToUpsert, {
                            onConflict: "domain",
                            ignoreDuplicates: false,
                        })
                        .select("id, name, created_at");

                if (upsertError) {
                    throw new Error(`Failed to bulk upsert companies: ${upsertError.message}`);
                }

                // Map them back to the original company names we got from leads
                const nameToId = new Map<string, string>();
                const newIds: string[] = [];

                // Simple heuristic: if created_at is extremely recent, we consider it a NEW company 
                // However, we just grab all returned ones
                if (upsertedCompanies) {
                    // Since domain is unique but lead inputs gave us `co.name`, we need to map via `co.domain` 
                    const domainToId = new Map<string, string>(upsertedCompanies.map((c: any) => [c.domain, c.id]));

                    uniqueCompaniesData.forEach((co) => {
                        const id = domainToId.get(co.domain);
                        if (id) {
                            nameToId.set(co.name, id);
                        }
                    });

                    // A more robust checking of what is genuinely "new" would require comparing timestamps or tracking existing ones,
                    // but for simplicity, we trigger enrichment for all recently inserted ones or skip it altogether depending on the DB schema capabilities.
                    // Inngest `company/enrich` prevents duplicates internally if designed well.
                    upsertedCompanies.forEach((c: any) => {
                        // Just trigger enrichment for all upserted companies, since the DB upsert might have touched them.
                        // Or better, we only trigger for ones created in last minute
                        newIds.push(c.id);
                    });
                }

                return {
                    companyNameToIdMapArray: Array.from(nameToId.entries()),
                    newCompanyIds: newIds
                };
            },
        );

        // Reconstruct the map locally
        const companyNameToIdMap = new Map<string, string>(companyNameToIdMapArray);

        // Step 3: Insert Leads in Chunks
        await step.run("bulk-upsert-leads", async () => {
            const { createClient: createServiceClient } = require("@supabase/supabase-js");
            const adminSupabase = createServiceClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
            );

            const CHUNK_SIZE = 500;
            for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
                const chunk = leads.slice(i, i + CHUNK_SIZE);

                const leadsToInsert = chunk.map((lead) => {
                    const companyId = lead.company
                        ? companyNameToIdMap.get(lead.company.trim()) || null
                        : null;

                    return {
                        user_id: userId,
                        email: lead.email,
                        linkedin_url: lead.linkedin_url || null,
                        name: lead.name || null,
                        company_id: companyId,
                        role: lead.role || null,
                        custom_fields: lead.custom_fields || {},
                        tag: tag || null,
                    };
                });

                const { error: chunkError } = await adminSupabase
                    .from("leads")
                    .upsert(leadsToInsert, {
                        onConflict: "email,user_id",
                        ignoreDuplicates: true,
                    });

                if (chunkError) {
                    throw new Error(`Failed to insert lead chunk starting at index ${i}: ${chunkError.message}`);
                }
            }
        });

        // Step 4: Trigger Company Enrichment
        if (newCompanyIds.length > 0) {
            await step.run("trigger-company-enrichment", async () => {
                const events = newCompanyIds.map((companyId) => ({
                    name: "company/enrich",
                    data: { companyId },
                }));
                await inngest.send(events);
            });
        }

        return {
            success: true,
            count: leads.length,
            companiesUpserted: uniqueCompaniesData.length,
        };
    },
);
