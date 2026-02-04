import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { google as googleAPI } from "googleapis";
import { NonRetriableError } from "inngest";
import { generatePersonalizedEmail, replaceTemplateVars } from "@/lib/ai/generate-email";

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

        // Step 1: Fetch campaign details
        const campaign = await step.run("fetch-campaign", async () => {
            const { data, error } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", campaignId)
                .single();

            if (error || !data) {
                throw new NonRetriableError(`Campaign not found: ${campaignId}`);
            }
            return data;
        });

        // Step 1.5: Schedule delay if needed
        if (campaign.scheduled_at) {
            const scheduledDate = new Date(campaign.scheduled_at);
            if (scheduledDate > new Date()) {
                await step.sleepUntil("wait-for-schedule", scheduledDate);
            }
        }

        // Step 2: Update campaign status to running
        await step.run("update-status-running", async () => {
            await supabase
                .from("campaigns")
                .update({ status: "running" })
                .eq("id", campaignId);
        });

        // Step 3: Fetch campaign accounts (Gmail senders)
        const accounts = await step.run("fetch-accounts", async () => {
            const { data } = await supabase
                .from("campaign_accounts")
                .select("account_id, accounts(*)")
                .eq("campaign_id", campaignId);
            return data || [];
        });

        if (accounts.length === 0) {
            throw new NonRetriableError("No Gmail accounts associated with this campaign");
        }

        // Step 4: Fetch pending leads for this campaign
        const campaignLeads = await step.run("fetch-leads", async () => {
            const { data } = await supabase
                .from("campaign_leads")
                .select("*, leads(*, companies(name, email_template, email_subject))")
                .eq("campaign_id", campaignId)
                .eq("status", "pending");
            return data || [];
        });

        // Step 5: Send emails - distribute across accounts (round-robin)
        let accountIndex = 0;

        for (const campaignLead of campaignLeads) {
            const lead = campaignLead.leads;
            const account = accounts[accountIndex % accounts.length].accounts as any;
            accountIndex++;

            await step.run(`send-email-${campaignLead.lead_id}`, async () => {
                try {
                    // Generate email content
                    let subject: string;
                    let body: string;

                    if (campaign.use_ai && campaign.ai_prompt) {
                        const generated = await generatePersonalizedEmail(
                            lead,
                            campaign.ai_prompt,
                            campaign.subject_template,
                            campaign.body_template
                        );
                        subject = generated.subject;
                        body = generated.body;
                    } else {
                        // Priority: Company Template -> Campaign Template
                        const companySubject = lead.companies?.email_subject;
                        const companyTemplate = lead.companies?.email_template;

                        // Determine Subject
                        if (companySubject) {
                            subject = replaceTemplateVars(companySubject, lead);
                        } else {
                            subject = replaceTemplateVars(campaign.subject_template, lead);
                        }

                        // Determine Body
                        if (companyTemplate) {
                            body = replaceTemplateVars(companyTemplate, lead);
                        } else {
                            body = replaceTemplateVars(campaign.body_template, lead);
                        }
                    }

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
                        body + `<br/><img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/track/open?id=${campaignLead.id}" alt="" width="1" height="1" border="0" />`,
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

                    // Update campaign_lead status
                    await supabase
                        .from("campaign_leads")
                        .update({
                            status: "sent",
                            sent_at: new Date().toISOString(),
                            account_id: account.id,
                            thread_id: res.data.threadId,
                            message_id: res.data.id,
                        })
                        .eq("id", campaignLead.id);

                } catch (error: any) {
                    console.error(`Failed to send email to ${lead.email}:`, error);
                    await supabase
                        .from("campaign_leads")
                        .update({
                            status: "failed",
                            error: error.message || "Unknown error",
                        })
                        .eq("id", campaignLead.id);
                }
            });

            // Add small delay between emails to avoid rate limiting
            await step.sleep("rate-limit-delay", "2s");
        }

        // Step 6: Update campaign status to completed
        await step.run("update-status-completed", async () => {
            await supabase
                .from("campaigns")
                .update({ status: "completed" })
                .eq("id", campaignId);
        });

        return { success: true, emailsSent: campaignLeads.length };
    }
);
