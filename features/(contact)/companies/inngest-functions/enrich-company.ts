import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { NonRetriableError } from "inngest";
import { Companies } from "../lib/constants";

// Create admin Supabase client for background jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
          enrichment_status: Companies.EnrichmentStatus.FAILED,
          enrichment_error: error.message || "Unknown error occurred",
        })
        .eq("id", companyId);
    },
  },
  { event: "company/enrich" },
  async ({ event, step }) => {
    const { companyId } = event.data;

    // Step 0: Fetch company details
    const company = await step.run("fetch-company", async () => {
      const { fetchCompanyData } = await import("../lib/database/fetch-company");
      return await fetchCompanyData(companyId);
    });

    // Step 0.3: Fetch Custom User Prompts explicitly bypassing RLS
    const userPrompts = await step.run("fetch-prompts", async () => {
      console.log(`[Enrich Company] Fetching custom prompts for user_id: ${company.user_id}`);

      const { data: prompts, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", company.user_id)
        .in("type", ["mail", "linkedin", "doc"]);

      if (error) {
        throw new Error(`Failed to fetch prompts from database: ${error.message}`);
      }

      const mailPrompt = prompts?.find(p => p.type === 'mail');
      const linkedinPrompt = prompts?.find(p => p.type === 'linkedin');
      const docPrompt = prompts?.find(p => p.type === 'doc');

      if (!mailPrompt || !linkedinPrompt || !docPrompt) {
        throw new Error(`CRITICAL: User ${company.user_id} is lacking 1 or more custom prompts. All 3 types (mail, linkedin, doc) MUST exist in the database to run enrichment.`);
      }

      return {
        mail: {
          system: mailPrompt.system_prompt,
          user: mailPrompt.user_prompt,
          validation: mailPrompt.validation_prompt
        },
        linkedin: {
          system: linkedinPrompt.system_prompt,
          user: linkedinPrompt.user_prompt,
          validation: linkedinPrompt.validation_prompt
        },
        doc: {
          system: docPrompt.system_prompt,
          user: docPrompt.user_prompt,
          validation: docPrompt.validation_prompt
        }
      };
    });

    // Step 0.5: Update status to processing
    await step.run("update-status-processing", async () => {
      console.log(`[Enrich Company] Updating status to processing: ${companyId}`);
      await supabase
        .from("companies")
        .update({
          enrichment_status: Companies.EnrichmentStatus.PROCESSING,
          enrichment_started_at: new Date().toISOString(),
          enrichment_error: null,
        })
        .eq("id", companyId);
    });

    // Step 1: Research via Firecrawl
    const researchContext = await step.run("research-company", async () => {
      const { performCompanyResearch } = await import("../lib/web-research/research");
      return await performCompanyResearch({
        companyName: company.name,
        domain: company.domain,
      });
    });

    // Step 2 & 3: Mail Generation and Validation
    const emailData = await step.run("generate-mail", async () => {
      const { generateCompanyEmailTemplate } = await import("../lib/mail/generate-mail");
      const { validateContent } = await import("../lib/validation/validate");
      const { injectVariables } = await import("@/lib/prompts/variable-injector");

      const promptContext = {
        companyName: company.name,
        domain: company.domain,
        researchContext: researchContext
      };

      const finalSystemPrompt = injectVariables(userPrompts.mail.system || "", promptContext);
      const finalUserPrompt = injectVariables(userPrompts.mail.user || "", promptContext);
      const finalValidationPrompt = injectVariables(userPrompts.mail.validation || "", promptContext);

      const mail = await generateCompanyEmailTemplate(
        { name: company.name, domain: company.domain },
        researchContext,
        finalSystemPrompt,
        finalUserPrompt
      );

      const validation = await validateContent({ type: "email", content: mail.body, subject: mail.subject, customPrompt: finalValidationPrompt });
      if (!validation.isValid) {
        throw new Error(`Email validation failed: ${validation.reason}`);
      }

      return mail;
    });

    // Step 4 & 5 & Upload: Doc AST Generation, Validation, and Storage Upload
    const docUrl = await step.run("generate-document", async () => {
      const { generateDocumentASTBuffer } = await import("../lib/docs/generate-doc");
      const { validateContent } = await import("../lib/validation/validate");
      const { uploadDocumentToSupabase } = await import("../lib/docs/upload-doc");
      const { injectVariables } = await import("@/lib/prompts/variable-injector");

      const promptContext = {
        companyName: company.name,
        domain: company.domain,
        researchContext: researchContext
      };

      const finalSystemPrompt = injectVariables(userPrompts.doc.system || "", promptContext);
      const finalUserPrompt = injectVariables(userPrompts.doc.user || "", promptContext);
      const finalValidationPrompt = injectVariables(userPrompts.doc.validation || "", promptContext);

      const { ast, buffer } = await generateDocumentASTBuffer(
        company.name,
        company.domain,
        researchContext,
        finalSystemPrompt,
        finalUserPrompt
      );

      const validation = await validateContent({ type: "document", content: JSON.stringify(ast, null, 2), customPrompt: finalValidationPrompt });
      if (!validation.isValid) {
        throw new Error(`Document validation failed: ${validation.reason}`);
      }

      // Convert the doc buffer and push it to Supabase Storage
      return await uploadDocumentToSupabase(companyId, buffer, company.name);
    });

    // Step 6 & 7: LinkedIn Message Generation and Validation
    const linkedinMessage = await step.run("generate-linkedin", async () => {
      const { generateLinkedinMessage } = await import("../lib/linkedin/generate-linkedin");
      const { validateContent } = await import("../lib/validation/validate");
      const { injectVariables } = await import("@/lib/prompts/variable-injector");

      const promptContext = {
        companyName: company.name,
        domain: company.domain,
        researchContext: researchContext
      };

      const finalSystemPrompt = injectVariables(userPrompts.linkedin.system || "", promptContext);
      const finalUserPrompt = injectVariables(userPrompts.linkedin.user || "", promptContext);
      const finalValidationPrompt = injectVariables(userPrompts.linkedin.validation || "", promptContext);

      const msg = await generateLinkedinMessage(
        company.name,
        company.domain,
        researchContext,
        finalSystemPrompt,
        finalUserPrompt
      );

      const validation = await validateContent({ type: "linkedin", content: msg, customPrompt: finalValidationPrompt });
      if (!validation.isValid) {
        throw new Error(`LinkedIn validation failed: ${validation.reason}`);
      }

      return msg;
    });

    // Step 8: Update Database with newly generated columns and increment metadata.version
    await step.run("update-company-data", async () => {
      const { updateCompanyRecord } = await import("../lib/database/update-company");

      await updateCompanyRecord({
        companyId,
        emailSubject: emailData.subject,
        emailBody: emailData.body,
        docUrl: docUrl,
        linkedinMessage: linkedinMessage,
        existingMetadata: company.metadata,
      });
    });

    console.log(`[Enrich Company] Completed 8-step enrichment for company: ${companyId}`);
    return { success: true, companyId };
  },
);

