import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { NonRetriableError } from "inngest";
import { google } from "googleapis";
import { createOutlookClient } from "@/lib/outlook";
import { createEmailWithAttachment } from "@/lib/email/mime-builder";
import { replaceTemplateVars } from "@/features/(contact)/companies/lib/generate-email";
import { Campaigns } from "../lib/constants";

// Create admin Supabase client for background jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ATTACHMENT_PDF_NAME = "Project Reach Out Deck.pdf";
const ATTACHMENT_PDF_URL =
  "https://pub-d94398e714924e6fb66510c029cee3e8.r2.dev/pitch-deck/Project%20Reach%20Out%20Deck.pdf";

export default inngest.createFunction(
  {
    id: "send-campaign",
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Update campaign status to ERROR on failure
      const { campaignId } = event.data.event.data;
      await supabase
        .from("campaigns")
        .update({
          status: Campaigns.Status.ERROR,
          error: error.message || "Campaign execution failed",
        })
        .eq("id", campaignId);
      console.error(`[Send Campaign] Campaign ${campaignId} failed:`, error);
    },
  },
  { event: "campaign/start" },
  async ({ event, step }) => {
    // Extract campaignId from event data
    const { campaignId } = event.data;

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
        // Throwing NonRetriableError will prevent retries and mark the job as failed immediately
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

    // Step 2: Update campaign status to running (only if it was scheduled)
    // If campaign was "send now", it's already marked as running in startCampaign
    if (campaign.status === Campaigns.Status.SCHEDULED) {
      await step.run("update-status-running", async () => {
        await supabase
          .from("campaigns")
          .update({ status: Campaigns.Status.RUNNING })
          .eq("id", campaignId);
      });
    }

    // Step 3: Fetch campaign accounts (Gmail senders)
    const accounts = await step.run("fetch-accounts", async () => {
      const { data } = await supabase
        .from("campaign_accounts")
        .select("account_id, accounts(*)")
        .eq("campaign_id", campaignId);
      return data || [];
    });

    // check if accounts are available
    if (accounts.length === 0) {
      throw new NonRetriableError(
        "No Gmail accounts associated with this campaign",
      );
    }

    // Step 4: Fetch pending leads for this campaign from campaign_leads table
    const campaignLeads = await step.run("fetch-leads", async () => {
      // Join campaign_leads -> leads -> companies

      /*
        Basically, we are utilising the relationship between the campaign lead, lead and company to figure out whom to and what to send.
      */
      const { data, error } = await supabase
        .from("campaign_leads")
        .select(
          `
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
        `,
        )
        .eq("campaign_id", campaignId)
        .eq("status", Campaigns.LeadStatus.PENDING);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    });

    console.log(`[Send Campaign] Found ${campaignLeads.length} pending leads`);

    // Check if there are any leads to process
    if (campaignLeads.length === 0) {
      console.warn(
        `[Send Campaign] No pending leads found for campaign ${campaignId}`,
      );
      await supabase
        .from("campaigns")
        .update({ status: Campaigns.Status.COMPLETED })
        .eq("id", campaignId);
      return { success: true, emailsSent: 0 };
    }

    // Fetch PDF attachment directly from Cloudflare R2 (outside step to avoid
    // Inngest serializing the binary as step output, which would exceed size limits).
    const pdfRes = await fetch(ATTACHMENT_PDF_URL);
    if (!pdfRes.ok) {
      throw new Error(
        `Failed to fetch PDF from R2: ${pdfRes.status} ${pdfRes.statusText}`,
      );
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // Step 5: Send emails - distribute across accounts (round-robin or pre-assigned)
    // In new architecture, account is pre-assigned in campaign_leads.assigned_account_id
    // But we need to fetch the actual account credentials (email/refresh_token) from `accounts` table.
    // We already fetched `accounts` (campaign_accounts) in Step 3.
    // We can map account_id to account object.

    const accountMap = new Map(
      accounts.map((a: any) => [a.account_id, a.accounts]),
    );

    // Track successful sends
    let successfulSends = 0;

    for (const item of campaignLeads) {
      // item.leads is the lead data
      // item.assigned_account_id is the account to use
      const lead = item.leads;
      // Handle the case where companies might be an array or object depending on relation
      const company = Array.isArray(lead.companies)
        ? lead.companies[0]
        : lead.companies;
      // Normalize lead object for template replacement
      const leadForTemplate = {
        ...lead,
        company: company?.name || lead.company || "",
        companies: company, // Ensure nested structure if needed
      };

      const accountId = item.assigned_account_id;

      // Fetch fresh account data to ensure we have the latest refresh_token
      // This avoids "invalid_grant" if the user reconnected the account while the campaign was running/paused
      const { data: freshAccount, error: accountError } = await supabase
        .from("accounts")
        .select("id, email, provider, refresh_token, access_token")
        .eq("id", accountId)
        .single();

      if (accountError || !freshAccount) {
        console.error(
          `[Send Campaign] No account found or error fetching for assigned_id ${accountId}`,
          accountError,
        );
        throw new Error(
          `Account not found or inaccessible for assigned_account_id: ${accountId}`,
        );
      }

      // Use freshAccount for credentials
      const account = freshAccount;

      const sent = await step.run(`send-email-${item.id}`, async () => {
        try {
          console.log(
            `[Send Campaign] Sending email to ${lead.email} via ${account.email} (${account.provider || "gmail"})`,
          );
          // Generate email content
          // Company must have templates ready - no fallback
          const subjectTemplate = company?.email_subject;
          const bodyTemplate = company?.email_template;

          if (!subjectTemplate || !bodyTemplate) {
            throw new Error(
              `Company "${company?.name || "Unknown"}" does not have email templates ready. Please complete enrichment before starting campaign.`,
            );
          }

          let subject: string;
          let body: string;

          // User requested NO dynamic replacement for the subject line
          subject = subjectTemplate;
          body = replaceTemplateVars(bodyTemplate, leadForTemplate);

          const trackingPixel = `<br/><img src="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/track/open?id=${item.id}&type=campaign_lead" alt="" width="1" height="1" border="0" />`;
          const finalBody = body + trackingPixel;

          let threadId = null;
          let messageId = null;

          if (account.provider === "outlook") {
            // Outlook Sending Logic
            throw new Error("Outlook sending is temporarily disabled.");
            /*
            const client = await createOutlookClient(account);

            const sendMail = {
              message: {
                subject: subject,
                body: {
                  contentType: "HTML",
                  content: finalBody,
                },
                toRecipients: [
                  {
                    emailAddress: {
                      address: lead.email,
                    },
                  },
                ],
                attachments: [
                  {
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    name: ATTACHMENT_PDF_NAME,
                    contentBytes: pdfBuffer.toString("base64"),
                  },
                ],
              },
              saveToSentItems: "true",
            };

            await client.api("/me/sendMail").post(sendMail);
            // Graph API sendMail does not return the message ID directly usually. 
            // We might need to make a separate call if we need it, or ignore it.
            // For now, we leave message_id null or approximate it.
            // Actually, we can assume success if no error.
            */
          } else {
            // Gmail Sending Logic (Default)
            if (!account.refresh_token) {
              console.error(
                `[Send Campaign] Account ${account.id} (${account.email}) is missing refresh token!`,
              );
              throw new Error("Missing refresh token for Gmail account");
            }

            // Create Gmail client manually as per previous working version
            const oauth2Client = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET,
              `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/google/callback`,
            );
            oauth2Client.setCredentials({
              refresh_token: account.refresh_token,
            });

            const gmail = google.gmail({ version: "v1", auth: oauth2Client });

            const message = createEmailWithAttachment(
              account.email,
              lead.email,
              subject,
              finalBody,
              pdfBuffer,
              ATTACHMENT_PDF_NAME,
            );

            const encodedMessage = Buffer.from(message)
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");

            const res = await gmail.users.messages.send({
              userId: "me",
              requestBody: { raw: encodedMessage },
            });

            threadId = res.data.threadId;
            messageId = res.data.id;
          }

          // Update campaign_leads status
          await supabase
            .from("campaign_leads")
            .update({
              status: Campaigns.LeadStatus.SENT,
              sent_at: new Date().toISOString(),
              thread_id: threadId,
              message_id: messageId,
            })
            .eq("id", item.id);

          console.log(
            `[Send Campaign] Email sent successfully to ${lead.email}`,
          );
          return true;
        } catch (error: any) {
          let errorMessage = error.message || "Unknown error";

          // Handle Invalid Grant (Token Expired/Revoked)
          if (
            errorMessage.includes("invalid_grant") ||
            error.response?.data?.error === "invalid_grant" ||
            error.code === 400
          ) {
            // 400 can be other things, but if message is invalid_grant it's definite.
            if (
              errorMessage.includes("invalid_grant") ||
              (error.response?.data?.error_description &&
                error.response.data.error_description.includes("grant"))
            ) {
              errorMessage =
                "Google Auth Error: Token expired or revoked. Please reconnect account.";
              console.error(
                `[Send Campaign] CRITICAL AUTH ERROR for ${account.email}:`,
                errorMessage,
              );
            }
          }

          console.error(
            `[Send Campaign] Failed to send email to ${lead.email}:`,
            error,
          );
          await supabase
            .from("campaign_leads")
            .update({
              status: Campaigns.LeadStatus.FAILED,
              error: errorMessage,
            })
            .eq("id", item.id);
          return false;
        }
      });

      if (sent) {
        successfulSends++;
      }

      // Add small delay between emails
      await step.sleep(`rate-limit-delay-${item.id}`, "2s");
    }

    // Step 6: Update campaign status based on results
    await step.run("update-final-status", async () => {
      if (successfulSends === 0) {
        await supabase
          .from("campaigns")
          .update({
            status: Campaigns.Status.ERROR,
            error: "All email sends failed",
          })
          .eq("id", campaignId);

        return {
          marked: "Failed Campaign",
        };
      } else {
        await supabase
          .from("campaigns")
          .update({ status: Campaigns.Status.COMPLETED })
          .eq("id", campaignId);

        return {
          marked: "Successful Campaign",
        };
      }
    });

    console.log(`[Send Campaign] Campaign execution finished: ${campaignId}`);
    return {
      success: true,
      emailsSent: successfulSends,
      totalLeads: campaignLeads.length,
    };
  },
);
