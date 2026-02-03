'use server'

import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"
import { revalidatePath } from "next/cache"

export type CreateCampaignInput = {
    name: string
    subject_template: string
    body_template: string
    use_ai: boolean
    ai_prompt?: string
    account_ids: string[]
    company_ids: string[]
    scheduled_at?: string
}

export async function createCampaign(input: CreateCampaignInput) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    if (input.account_ids.length === 0) {
        return { success: false, error: "Please select at least one Gmail account" }
    }

    if (input.company_ids.length === 0) {
        return { success: false, error: "Please select at least one company" }
    }

    try {
        // Create campaign
        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .insert({
                user_id: user.id,
                name: input.name,
                subject_template: input.subject_template || 'See company specific template',
                body_template: input.body_template || 'See company specific template',
                use_ai: input.use_ai,
                ai_prompt: input.ai_prompt || null,
                status: 'draft',
                scheduled_at: input.scheduled_at || null,
            })
            .select()
            .single()

        if (campaignError) {
            console.error('Error creating campaign:', campaignError)
            return { success: false, error: campaignError.message }
        }

        // Add campaign accounts
        const campaignAccounts = input.account_ids.map(accountId => ({
            campaign_id: campaign.id,
            account_id: accountId,
        }))

        const { error: accountsError } = await supabase
            .from('campaign_accounts')
            .insert(campaignAccounts)

        if (accountsError) {
            console.error('Error adding campaign accounts:', accountsError)
        }

        // Fetch leads from selected companies
        const { data: leads } = await supabase
            .from('leads')
            .select('id')
            .in('company_id', input.company_ids)
            .eq('user_id', user.id)

        if (!leads || leads.length === 0) {
            // Delete the campaign if no leads found (rollback-ish)
            await supabase.from('campaigns').delete().eq('id', campaign.id)
            return { success: false, error: "No leads found for the selected companies" }
        }

        // Add campaign leads with Round Robin account assignment
        const campaignLeads = leads.map((lead, index) => ({
            campaign_id: campaign.id,
            lead_id: lead.id,
            account_id: input.account_ids[index % input.account_ids.length], // Round Robin
            status: 'pending',
        }))

        const { error: leadsError } = await supabase
            .from('campaign_leads')
            .insert(campaignLeads)

        if (leadsError) {
            console.error('Error adding campaign leads:', leadsError)
        }

        revalidatePath('/dashboard/campaigns')
        return { success: true, campaignId: campaign.id }
    } catch (error: any) {
        console.error('Error creating campaign:', error)
        return { success: false, error: error.message }
    }
}

export async function startCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    // Verify ownership
    const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single()

    if (!campaign) {
        return { success: false, error: "Campaign not found" }
    }

    if (campaign.status !== 'draft') {
        return { success: false, error: "Campaign has already been started" }
    }

    // Update status to scheduled
    await supabase
        .from('campaigns')
        .update({ status: 'scheduled' })
        .eq('id', campaignId)

    // Trigger Inngest event
    await inngest.send({
        name: "campaign/start",
        data: { campaignId },
    })

    revalidatePath('/dashboard/campaigns')
    return { success: true }
}

export async function getCampaigns() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data } = await supabase
        .from('campaigns')
        .select(`
      *,
      campaign_accounts (
        account_id,
        accounts (email)
      ),
      campaign_leads (
        id,
        status,
        lead_id,
        leads (email, name)
      )
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return data || []
}

export async function getAccounts() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)

    return data || []
}

export async function getCompaniesForCampaign() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Fetch companies that have at least one lead
    // We'll select all companies and then filter or join?
    // Supabase join is easier. Or just return all companies and let UI show usage?
    // We should probably only show companies that have leads, or show lead count.

    // For now, let's fetch all companies and their lead count
    const { data } = await supabase
        .from('companies')
        .select(`
            id, 
            name, 
            logo_url,
            domain,
            leads!inner(count)
        `)
        // The !inner join forces only companies with leads to be returned? 
        // No, leads(count) is implicit group by. 
        // Wait, supabase-js count is weird.
        // Let's just fetch companies with leads using join
        // Actually, fetching all companies is fine, UI can handle "0 leads"
        .order('name', { ascending: true })

    // Since aggregating count in standard supabase-js is tricky without rpc,
    // let's just fetch all companies and maybe we can query leads separately if performance hits.
    // Simplifying: fetch all companies

    const { data: companies } = await supabase
        .from('companies')
        .select(`
            id,
            name,
            logo_url,
            domain,
            email_template,
            email_subject
        `)
        .order('name')

    if (!companies) return []

    // Get lead counts for these companies
    // This is N+1 but efficient enough for <100 companies. 
    // Optimization: create a view or RPC later.
    const companiesWithCount = await Promise.all(companies.map(async (c) => {
        const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', c.id)
            .eq('user_id', user.id)

        return {
            ...c,
            leadCount: count || 0
        }
    }))

    return companiesWithCount.filter(c => c.leadCount > 0)
}
