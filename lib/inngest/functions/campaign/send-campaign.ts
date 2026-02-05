import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { google as googleAPI } from "googleapis";
import { NonRetriableError } from "inngest";
import { replaceTemplateVars } from "@/lib/ai/generate-email";

// Create admin Supabase client for background jobs
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
                console.error(`[Send Campaign] Campaign not found: ${campaignId}`, error);
                throw new NonRetriableError(`Campaign not found: ${campaignId}`);
            }
            return data;
        });

        // Step 1.5: Schedule delay if needed
        if (campaign.scheduled_at) {
            const scheduledDate = new Date(campaign.scheduled_at);
            if (scheduledDate > new Date()) {
                console.log(`[Send Campaign] Scheduling campaign for: ${scheduledDate.toISOString()}`);
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
            console.log(`[Send Campaign] Fetching accounts for campaign: ${campaignId}`);
            const { data } = await supabase
                .from("campaign_accounts")
                .select("account_id, accounts(*)")
                .eq("campaign_id", campaignId);
            return data || [];
        });

        if (accounts.length === 0) {
            console.warn(`[Send Campaign] No accounts found for campaign: ${campaignId}`);
            throw new NonRetriableError("No Gmail accounts associated with this campaign");
        }

        // Step 4: Fetch pending leads for this campaign
        const leads = await step.run("fetch-leads", async () => {
            console.log(`[Send Campaign] Fetching pending leads for campaign: ${campaignId}`);
            const { data } = await supabase
                .from("leads")
                .select("*, companies(name, email_template, email_subject)")
                .eq("campaign_id", campaignId)
                .eq("campaign_status", "pending");
            return data || [];
        });

        console.log(`[Send Campaign] Found ${leads.length} pending leads`);

        // Step 5: Send emails - distribute across accounts (round-robin)
        let accountIndex = 0;

        for (const lead of leads) {
            const account = accounts[accountIndex % accounts.length].accounts as any;
            accountIndex++;

            await step.run(`send-email-${lead.id}`, async () => {
                try {
                    console.log(`[Send Campaign] Sending email to ${lead.email} via ${account.email}`);
                    // Generate email content
                    let subject: string;
                    let body: string;

                    // Strictly use Company-specific templates (Enrichment required)
                    // Future constraint: Only enriched companies will enter this flow.
                    const subjectTemplate = lead.companies?.email_subject || "";
                    const bodyTemplate = lead.companies?.email_template || "";

                    if (!subjectTemplate || !bodyTemplate) {
                        throw new Error(`Missing email template for company: ${lead.companies?.name || 'Unknown'}`);
                    }

                    subject = replaceTemplateVars(subjectTemplate, lead);
                    body = replaceTemplateVars(bodyTemplate, lead);

                    // Create Gmail client
                    const oauth2Client = new googleAPI.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET
                    );
                    oauth2Client.setCredentials({ refresh_token: account.refresh_token });

                    const gmail = googleAPI.gmail({ version: "v1", auth: oauth2Client });

                    // Create email message
                    const message = [
                        `From: ${account.email}`,
                        `To: ${lead.email}`,
                        `Subject: ${subject}`,
                        "Content-Type: text/html; charset=utf-8",
                        "",
                        body + `<br/><img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/track/open?id=${lead.id}" alt="" width="1" height="1" border="0" />`,
                    ].join("\n");

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

                    // Update lead status
                    await supabase
                        .from("leads")
                        .update({
                            campaign_status: "sent",
                            sent_at: new Date().toISOString(),
                            assigned_account_id: account.id,
                            thread_id: res.data.threadId,
                            message_id: res.data.id,
                        })
                        .eq("id", lead.id);

                    console.log(`[Send Campaign] Email sent successfully to ${lead.email}`);

                } catch (error: any) {
                    console.error(`[Send Campaign] Failed to send email to ${lead.email}:`, error);
                    await supabase
                        .from("leads")
                        .update({
                            campaign_status: "failed",
                            campaign_error: error.message || "Unknown error",
                        })
                        .eq("id", lead.id);
                }
            });

            // Add small delay between emails to avoid rate limiting
            await step.sleep("rate-limit-delay", "10s");
        }

        // Step 6: Update campaign status to completed
        await step.run("update-status-completed", async () => {
            console.log(`[Send Campaign] Marking campaign ${campaignId} as completed`);
            await supabase
                .from("campaigns")
                .update({ status: "completed" })
                .eq("id", campaignId);
        });

        console.log(`[Send Campaign] Campaign execution finished: ${campaignId}`);
        return { success: true, emailsSent: leads.length };
    }
);
