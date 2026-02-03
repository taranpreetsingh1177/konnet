'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type LeadInput = {
    email: string
    linkedin_url?: string
    name?: string
    company?: string
    role?: string
    custom_fields?: Record<string, string>
    tag_ids?: string[]
}

export async function createLeads(leads: LeadInput[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    try {
        // Step 1: Extract unique companies from leads
        const uniqueCompanies = new Map<string, { name: string; domain: string }>()

        leads.forEach(lead => {
            if (lead.company?.trim()) {
                const companyName = lead.company.trim()
                // Extract domain from email as fallback
                const emailDomain = lead.email.split('@')[1]?.toLowerCase()

                if (!uniqueCompanies.has(companyName)) {
                    uniqueCompanies.set(companyName, {
                        name: companyName,
                        domain: emailDomain || `${companyName.toLowerCase().replace(/\s+/g, '')}.com`
                    })
                }
            }
        })

        // Step 2: Create companies using Supabase directly with service role key
        const companyNameToIdMap = new Map<string, string>()

        if (uniqueCompanies.size > 0) {
            // Use service role key for backend operations
            const { createClient: createServiceClient } = require('@supabase/supabase-js')
            const adminSupabase = createServiceClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            for (const [companyName, companyData] of uniqueCompanies) {
                // Check if company exists
                const { data: existing } = await adminSupabase
                    .from('companies')
                    .select('id')
                    .eq('domain', companyData.domain)
                    .single()

                if (existing) {
                    companyNameToIdMap.set(companyName, existing.id)
                } else {
                    // Create new company
                    const { data: newCompany, error: companyError } = await adminSupabase
                        .from('companies')
                        .insert({
                            domain: companyData.domain,
                            name: companyData.name,
                            enrichment_status: 'pending'
                        })
                        .select('id')
                        .single()

                    if (companyError) {
                        console.error('Error creating company:', companyError)
                        continue
                    }

                    if (newCompany) {
                        companyNameToIdMap.set(companyName, newCompany.id)

                        // Trigger Inngest enrichment
                        try {
                            const { inngest } = await import('@/lib/inngest/client')
                            await inngest.send({
                                name: 'company/enrich',
                                data: { companyId: newCompany.id }
                            })
                        } catch (err) {
                            console.error('Error triggering enrichment:', err)
                        }
                    }
                }
            }
        }

        // Step 3: Insert leads with company_id
        const leadsToInsert = leads.map(lead => ({
            user_id: user.id,
            email: lead.email,
            linkedin_url: lead.linkedin_url || null,
            name: lead.name || null,
            company_id: lead.company ? companyNameToIdMap.get(lead.company.trim()) || null : null,
            role: lead.role || null,
            custom_fields: lead.custom_fields || {},
        }))

        const { data: insertedLeads, error: leadsError } = await supabase
            .from('leads')
            .insert(leadsToInsert)
            .select('id')

        if (leadsError) {
            console.error('Error inserting leads:', leadsError)
            return { success: false, error: leadsError.message }
        }

        // If there are tag_ids for the first lead (batch tagging), apply to all
        if (leads[0]?.tag_ids?.length && insertedLeads) {
            const leadTagsToInsert = insertedLeads.flatMap(lead =>
                leads[0].tag_ids!.map(tagId => ({
                    lead_id: lead.id,
                    tag_id: tagId
                }))
            )

            const { error: tagError } = await supabase
                .from('lead_tags')
                .insert(leadTagsToInsert)

            if (tagError) {
                console.error('Error inserting lead_tags:', tagError)
                // Don't fail the whole operation, leads are already inserted
            }
        }

        revalidatePath('/dashboard/leads')
        return {
            success: true,
            count: insertedLeads?.length || 0,
            companiesCreated: companyNameToIdMap.size
        }
    } catch (error: any) {
        console.error('Error creating leads:', error)
        return { success: false, error: error.message }
    }
}

export async function createTag(name: string, color: string = '#6B7280') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    const { data, error } = await supabase
        .from('tags')
        .insert({ user_id: user.id, name, color })
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/leads')
    return { success: true, tag: data }
}

export async function getTags() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return data || []
}

export async function getLeads() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const { data } = await supabase
        .from('leads')
        .select(`
      *,
      lead_tags (
        tag_id,
        tags (
          id,
          name,
          color
        )
      )
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return data || []
}

export async function deleteLead(leadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)
        .eq('user_id', user.id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/leads')
    return { success: true }
}

export async function updateLead(leadId: string, updates: Partial<LeadInput>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .eq('user_id', user.id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/leads')
    return { success: true }
}
