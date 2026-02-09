"use server";

import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { revalidatePath } from "next/cache";
import { Campaigns } from "@/features/campaigns/lib/constants";

export type CreateCampaignInput = {
  name: string;
  account_ids: string[];
  company_ids: string[];
  scheduled_at?: string;
};

export async function createCampaign(input: CreateCampaignInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (input.account_ids.length === 0) {
    return {
      success: false,
      error: "Please select at least one Gmail account",
    };
  }

  if (input.company_ids.length === 0) {
    return { success: false, error: "Please select at least one company" };
  }

  try {
    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        name: input.name,
        status: Campaigns.Status.DRAFT,
        scheduled_at: input.scheduled_at || null,
      })
      .select()
      .single();

    if (campaignError) {
      console.error("Error creating campaign:", campaignError);
      return { success: false, error: campaignError.message };
    }

    // Add campaign accounts
    const campaignAccounts = input.account_ids.map((accountId) => ({
      campaign_id: campaign.id,
      account_id: accountId,
    }));

    const { error: accountsError } = await supabase
      .from("campaign_accounts")
      .insert(campaignAccounts);

    if (accountsError) {
      console.error("Error adding campaign accounts:", accountsError);
    }

    // Fetch leads from selected companies
    // We fetch ALL leads for the company, as we maintain history in campaign_leads
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .in("company_id", input.company_ids)
      .eq("user_id", user.id);

    if (!leads || leads.length === 0) {
      // Delete the campaign if no leads found (rollback-ish)
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      return {
        success: false,
        error: "No leads found for the selected companies",
      };
    }

    // Insert into campaign_leads with Round Robin account assignment
    const campaignLeads = leads.map((lead, i) => ({
      campaign_id: campaign.id,
      lead_id: lead.id,
      status: "pending",
      assigned_account_id: input.account_ids[i % input.account_ids.length],
    }));

    // Batch insert (supabase limits batch size, but for now assuming < 1000 leads or acceptable)
    // If > 1000, we'd need to chunk.
    const { error: leadsError } = await supabase
      .from("campaign_leads")
      .insert(campaignLeads);

    if (leadsError) {
      console.error("Error creating campaign leads:", leadsError);
      // Attempt cleanup
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      return { success: false, error: "Failed to assign leads to campaign" };
    }

    revalidatePath("/dashboard/campaigns");

    return { success: true, campaignId: campaign.id };
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return { success: false, error: error.message };
  }
}

export async function startCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!campaign) {
    return { success: false, error: "Campaign not found" };
  }

  if (campaign.status !== "draft") {
    return { success: false, error: "Campaign has already been started" };
  }

  await supabase
    .from("campaigns")
    .update({
      status: campaign.scheduled_at
        ? Campaigns.Status.SCHEDULED
        : Campaigns.Status.RUNNING,
    })
    .eq("id", campaignId);

  // Trigger Inngest event and capture run IDs
  const result = await inngest.send({
    name: "campaign/start",
    data: { campaignId },
  });

  // Store run IDs in database for cancellation
  if (result.ids && result.ids.length > 0) {
    await supabase
      .from("campaigns")
      .update({ inngest_run_ids: result.ids })
      .eq("id", campaignId);
  }

  revalidatePath("/dashboard/campaigns");
  return { success: true };
}

export async function cancelCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!campaign) {
    return { success: false, error: "Campaign not found" };
  }

  // Cancel all Inngest runs
  if (campaign.inngest_run_ids && campaign.inngest_run_ids.length > 0) {
    try {
      // Cancel via Inngest API
      const inngestApiKey =
        process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY;

      if (!inngestApiKey) {
        console.warn(
          "No Inngest API key found, cannot cancel runs programmatically",
        );
      } else {
        for (const runId of campaign.inngest_run_ids) {
          try {
            await fetch(`https://api.inngest.com/v1/runs/${runId}/cancel`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${inngestApiKey}`,
                "Content-Type": "application/json",
              },
            });
          } catch (err) {
            console.error(`Failed to cancel run ${runId}:`, err);
          }
        }
      }
    } catch (error) {
      console.error("Error cancelling Inngest runs:", error);
      // Continue even if cancellation fails
    }
  }

  // Update campaign status to cancelled
  const { error: campaignError } = await supabase
    .from("campaigns")
    .update({ status: Campaigns.Status.CANCELLED })
    .eq("id", campaignId);

  if (campaignError) {
    return { success: false, error: campaignError.message };
  }

  // Update pending campaign_leads to cancelled
  await supabase
    .from("campaign_leads")
    .update({ status: Campaigns.LeadStatus.CANCELLED })
    .eq("campaign_id", campaignId)
    .eq("status", Campaigns.LeadStatus.PENDING);

  revalidatePath("/dashboard/campaigns");
  return { success: true };
}

// ... (imports)

// ... (createCampaign/startCampaign/cancelCampaign unchanged)

export async function getCampaigns() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      campaign_accounts (
        account_id,
        accounts (email)
      ),
      campaign_leads (
        id,
        status,
        sent_at,
        opened_at
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getAccounts() {
  // ... (unchanged)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase.from("accounts").select("*");

  return data || [];
}

export async function getCompaniesForCampaign() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: companies } = await supabase
    .from("companies")
    .select(
      `
            id,
            name,
            logo_url,
            domain,
            email_template,
            email_subject
        `,
    )
    .order("name");

  if (!companies) return [];

  // Get lead counts for these companies
  const companiesWithCount = await Promise.all(
    companies.map(async (c) => {
      // Total leads
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("company_id", c.id)
        .eq("user_id", user.id);

      // Available leads is now essentially Total Leads since we support multiple campaigns
      // and history is tracked in campaign_leads.
      // Technically we could filter out leads currently in 'running' campaigns but for simplicity
      // and to match the "fresh start" requirement on campaign deletion, we treat all as available.

      return {
        ...c,
        leadCount: totalLeads || 0,
        availableLeadCount: totalLeads || 0,
      };
    }),
  );

  return companiesWithCount.filter((c) => c.leadCount > 0);
}
