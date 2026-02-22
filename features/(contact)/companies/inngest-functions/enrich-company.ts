import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";

import { Companies } from "../lib/constants";

// Import functions
import { fetchCompanyData } from "../lib/database/fetch-company";
import { performCompanyResearch } from "../lib/web-research/research";
import { generateCompanyEmailTemplate } from "../lib/mail/generate-mail";
import { injectVariables } from "@/lib/prompts/variable-injector";
import { validateContent } from "../lib/validation/validate";
import { generateDocumentASTBuffer } from "../lib/docs/generate-doc";
import { uploadDocumentToSupabase } from "../lib/docs/upload-doc";
import { generateLinkedinMessage } from "../lib/linkedin/generate-linkedin";
import { updateCompanyRecord } from "../lib/database/update-company";

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

    const company = await step.run("fetch-company", async () => {
      return await fetchCompanyData(companyId);
    });

    const userPrompts = await step.run("fetch-prompts", async () => {
      const { data: prompts, error } = await supabase
        .from("prompts")
        .select("*")
        .in("type", ["mail", "linkedin", "doc"]);

      if (error) {
        throw new Error(`Failed to fetch prompts from database: ${error.message}`);
      }

      const mailPrompt = prompts?.find(p => p.type === 'mail');
      const linkedinPrompt = prompts?.find(p => p.type === 'linkedin');
      const docPrompt = prompts?.find(p => p.type === 'doc');

      if (!mailPrompt || !linkedinPrompt || !docPrompt) {
        throw new Error(`Prompt directory is lacking 1 or more custom prompts. All 3 types (mail, linkedin, doc) must exist in the database to run enrichment.`);
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
      return await performCompanyResearch({
        companyName: company.name,
        domain: company.domain,
      });
    });

    // Step 2 & 3: Mail Generation and Validation
    const emailData = await step.run("generate-mail", async () => {

      const promptContext = {
        companyName: company.name,
        domain: company.domain,
        researchContext: researchContext
      };

      const finalSystemPrompt = injectVariables(userPrompts.mail.system || "", promptContext);
      const finalUserPrompt = injectVariables(userPrompts.mail.user || "", promptContext);
      const finalValidationPrompt = injectVariables(userPrompts.mail.validation || "", promptContext);

      const mail = await generateCompanyEmailTemplate(
        finalSystemPrompt,
        finalUserPrompt
      );

      const validation = await validateContent({ type: "email", content: mail.body, subject: mail.subject, customPrompt: finalValidationPrompt });

      if (!validation.isValid) {
        throw new Error(`Email validation failed: ${validation.reason}`);
      }

      return mail;
    });

    const docUrl = company.metadata?.['advanced-enrichment'] === true ? await step.run("generate-document", async () => {

      const promptContext = {
        companyName: company.name,
        domain: company.domain,
        researchContext: researchContext
      };

      const finalSystemPrompt = injectVariables(userPrompts.doc.system || "", promptContext);
      const finalUserPrompt = injectVariables(userPrompts.doc.user || "", promptContext);
      const finalValidationPrompt = injectVariables(userPrompts.doc.validation || "", promptContext);

      const { ast, buffer } = await generateDocumentASTBuffer(
        finalSystemPrompt,
        finalUserPrompt
      );

      const validation = await validateContent({ type: "document", content: JSON.stringify(ast, null, 2), customPrompt: finalValidationPrompt });
      if (!validation.isValid) {
        throw new Error(`Document validation failed: ${validation.reason}`);
      }

      // Convert the doc buffer and push it to Supabase Storage
      return await uploadDocumentToSupabase(companyId, buffer, company.name);
    }) : undefined;

    // Step 6 & 7: LinkedIn Message Generation and Validation
    const linkedinMessage = company.metadata?.['advanced-enrichment'] === true ? await step.run("generate-linkedin", async () => {

      const promptContext = {
        companyName: company.name,
        domain: company.domain,
        researchContext: researchContext
      };

      const finalSystemPrompt = injectVariables(userPrompts.linkedin.system || "", promptContext);
      const finalUserPrompt = injectVariables(userPrompts.linkedin.user || "", promptContext);
      const finalValidationPrompt = injectVariables(userPrompts.linkedin.validation || "", promptContext);

      const msg = await generateLinkedinMessage(
        finalSystemPrompt,
        finalUserPrompt
      );

      const validation = await validateContent({ type: "linkedin", content: msg, customPrompt: finalValidationPrompt });

      if (!validation.isValid) {
        throw new Error(`LinkedIn validation failed: ${validation.reason}`);
      }

      return msg;
    }) : undefined;

    // Step 8: Update Database with newly generated columns and increment metadata.version
    await step.run("update-company-data", async () => {

      await updateCompanyRecord({
        companyId,
        emailSubject: emailData.subject,
        emailBody: emailData.body,
        docUrl: docUrl,
        linkedinMessage: linkedinMessage,
        metadata: {
          ...company.metadata,
          version: 2
        },
      });
    });

    return { success: true, companyId };
  },
);

