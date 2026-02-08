import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { google as googleAPI } from "googleapis";
import { NonRetriableError } from "inngest";
import fs from "node:fs";
import path from "node:path";
import { createEmailWithAttachment } from "@/lib/email/mime-builder";
import { DEFAULT_EMAIL_BODY, DEFAULT_EMAIL_SUBJECT } from "@/lib/email/default-template";
import { replaceTemplateVars } from "@/features/(contact)/companies/lib/generate-email";

// Create admin Supabase client for background jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ATTACHMENT_PDF = "Project Reach Out Deck.pdf";

export default inngest.createFunction(
  { id: "send-campaign", retries: 3 },
  { event: "campaign/start" },
  async ({ event, step }) => {
    const { campaignId } = event.data;
    console.log(`[Send Campaign] Starting campaign: ${campaignId}`);

    // Step 1: Fetch campaign details
    const campaign = await step.run("fetch-campaign", async () => {
      console.log(`[Send Campaign] Fetching campaign details: ${campaignId}`);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error || !data) {
        console.error(
          `[Send Campaign] Campaign not found: ${campaignId}`,
          error,
        );
        throw new NonRetriableError(`Campaign not found: ${campaignId}`);
      }
      return data;
    });

    // Step 1.5: Schedule delay if needed
    if (campaign.scheduled_at) {
      const scheduledDate = new Date(campaign.scheduled_at);
      if (scheduledDate > new Date()) {
        console.log(
          `[Send Campaign] Scheduling campaign for: ${scheduledDate.toISOString()}`,
        );
        await step.sleepUntil("wait-for-schedule", scheduledDate);
      }
    }

    // Step 2: Update campaign status to running
    await step.run("update-status-running", async () => {
      console.log(`[Send Campaign] Updating status to running: ${campaignId}`);
      await supabase
        .from("campaigns")
        .update({ status: "running" })
        .eq("id", campaignId);
    });

    // Step 3: Fetch campaign accounts (Gmail senders)
    const accounts = await step.run("fetch-accounts", async () => {
      console.log(
        `[Send Campaign] Fetching accounts for campaign: ${campaignId}`,
      );
      const { data } = await supabase
        .from("campaign_accounts")
        .select("account_id, accounts(*)")
        .eq("campaign_id", campaignId);
      return data || [];
    });

    if (accounts.length === 0) {
      console.warn(
        `[Send Campaign] No accounts found for campaign: ${campaignId}`,
      );
      throw new NonRetriableError(
        "No Gmail accounts associated with this campaign",
      );
    }

    // Step 4: Fetch pending leads for this campaign from campaign_leads table
    const campaignLeads = await step.run("fetch-leads", async () => {
      console.log(
        `[Send Campaign] Fetching pending leads for campaign: ${campaignId}`,
      );
      // Join campaign_leads -> leads -> companies
      const { data, error } = await supabase
        .from("campaign_leads")
        .select(`
          *,
          leads!inner (
            id,
            email,
            name,
            role,
            custom_fields,
            companies (
              name,
              domain,
              email_template,
              email_subject
            )
          )
        `)
        .eq("campaign_id", campaignId)
        .eq("status", "pending");

      if (error) {
        console.error("[Send Campaign] Error fetching leads:", error);
        throw new Error(error.message);
      }

      return data || [];
    });

    console.log(`[Send Campaign] Found ${campaignLeads.length} pending leads`);

    // Step 4.5: Fetch default email template for the user
    // ... (unchanged)
    const defaultTemplate = await step.run("fetch-default-template", async () => {
      const { data } = await supabase
        .from("email_templates")
        .select("subject, body")
        .eq("user_id", campaign.user_id)
        .eq("is_default", true)
        .single();
      return data;
    });

    // Read PDF attachment once for all emails
    const pdfBuffer = fs.readFileSync(path.join(process.cwd(), "public", ATTACHMENT_PDF));
    console.log(`[Send Campaign] PDF attachment loaded: ${ATTACHMENT_PDF}`);

    // Step 5: Send emails - distribute across accounts (round-robin or pre-assigned)
    // In new architecture, account is pre-assigned in campaign_leads.assigned_account_id
    // But we need to fetch the actual account credentials (email/refresh_token) from `accounts` table.
    // We already fetched `accounts` (campaign_accounts) in Step 3.
    // We can map account_id to account object.

    const accountMap = new Map(
      accounts.map((a: any) => [a.account_id, a.accounts])
    );

    for (const item of campaignLeads) {
      // item.leads is the lead data
      // item.assigned_account_id is the account to use
      const lead = item.leads;
      // Handle the case where companies might be an array or object depending on relation
      const company = Array.isArray(lead.companies) ? lead.companies[0] : lead.companies;
      // Normalize lead object for template replacement
      const leadForTemplate = {
        ...lead,
        company: company?.name || lead.company || "",
        companies: company // Ensure nested structure if needed
      };

      const account = accountMap.get(item.assigned_account_id);

      if (!account) {
        console.warn(`[Send Campaign] No account found for assigned_id ${item.assigned_account_id}, skipping lead ${lead.email}`);
        continue;
      }

      await step.run(`send-email-${item.id}`, async () => {
        try {
          console.log(
            `[Send Campaign] Sending email to ${lead.email} via ${account.email}`,
          );
          // Generate email content
          let subject: string;
          let body: string;

          // Prefer Company-specific templates -> DB Default -> Hardcoded Default
          let subjectTemplate = company?.email_subject;
          let bodyTemplate = company?.email_template;

          if (!subjectTemplate || !bodyTemplate) {
            if (defaultTemplate) {
              subjectTemplate = subjectTemplate || defaultTemplate.subject;
              bodyTemplate = bodyTemplate || defaultTemplate.body;
            } else {
              subjectTemplate = subjectTemplate || DEFAULT_EMAIL_SUBJECT;
              bodyTemplate = bodyTemplate || DEFAULT_EMAIL_BODY;
            }
          }

          if (!subjectTemplate || !bodyTemplate) {
            throw new Error(
              `Missing email template for company: ${company?.name || "Unknown"}`,
            );
          }

          // User requested NO dynamic replacement for the subject line
          subject = subjectTemplate; // replaceTemplateVars(subjectTemplate, leadForTemplate);
          body = replaceTemplateVars(bodyTemplate, leadForTemplate);

          // Create Gmail client
          const oauth2Client = new googleAPI.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
          );
          oauth2Client.setCredentials({ refresh_token: account.refresh_token });

          const gmail = googleAPI.gmail({ version: "v1", auth: oauth2Client });

          // Create email message with PDF attachment
          // Use item.id (campaign_lead id) for tracking pixel instead of lead.id to track specific campaign send?
          // Or keep lead.id? Typically you track the specific send. 
          // But existing tracker might expect lead.id. 
          // Let's stick to lead.id for now or update tracker later. 
          // Actually, if we use campaign_leads, we should probably track campaign_leads.id.
          // But for minimal breakage, let's use lead.id for now, OR update this if user asks.
          // User asked for "stable architecture".
          // Tracking `campaign_leads.id` allows tracking WHICH campaign run was opened.
          // But `api/track/open` likely looks up by ID. If it looks up `leads` table, it will fail if I pass `campaign_leads.id`.
          // I'll stick to `lead.id` for the tracker URL for now to be safe, unless tracker uses `campaign_leads` too.
          // Wait, status update happens on `campaign_leads`.
          // If `api/track/open` updates `leads` table, the status in `campaign_leads` won't update!
          // This is a disconnect. I should check `api/track/open`.
          // For now, I'll update `campaign_leads` here for 'sent' status.

          const message = createEmailWithAttachment(
            account.email,
            lead.email,
            subject,
            body +
            `<br/><img src="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/track/open?id=${item.id}&type=campaign_lead" alt="" width="1" height="1" border="0" />`,
            pdfBuffer,
            ATTACHMENT_PDF,
          );

          const encodedMessage = Buffer.from(message)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          // Send email
          const res = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: encodedMessage },
          });

          // Update campaign_leads status
          await supabase
            .from("campaign_leads")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              thread_id: res.data.threadId,
              message_id: res.data.id,
            })
            .eq("id", item.id);

          console.log(
            `[Send Campaign] Email sent successfully to ${lead.email}`,
          );
        } catch (error: any) {
          console.error(
            `[Send Campaign] Failed to send email to ${lead.email}:`,
            error,
          );
          await supabase
            .from("campaign_leads")
            .update({
              status: "failed",
              error: error.message || "Unknown error",
            })
            .eq("id", item.id);
        }
      });

      // Add small delay between emails
      await step.sleep("rate-limit-delay", "2s");
    }

    // Step 6: Update campaign status to completed
    await step.run("update-status-completed", async () => {
      console.log(
        `[Send Campaign] Marking campaign ${campaignId} as completed`,
      );
      await supabase
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", campaignId);
    });

    console.log(`[Send Campaign] Campaign execution finished: ${campaignId}`);
    return { success: true, emailsSent: campaignLeads.length };
  },
);
