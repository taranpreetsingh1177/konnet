import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const companiesRouter = router({
    // Get all companies
    getAll: publicProcedure.query(async () => {
        const { data, error } = await supabase
            .from('companies')
            .select(`
                *,
                leads:leads(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }),

    // Get company by ID
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const { data, error } = await supabase
                .from('companies')
                .select(`
                    *,
                    leads:leads(*)
                `)
                .eq('id', input.id)
                .single();

            if (error) throw error;
            return data;
        }),

    // Get company by domain
    getByDomain: publicProcedure
        .input(z.object({ domain: z.string() }))
        .query(async ({ input }) => {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('domain', input.domain)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
            return data;
        }),

    // Update company
    update: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            logo_url: z.string().optional(),
            email_template: z.string().optional(),
            email_subject: z.string().optional(),
            enrichment_status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
            enrichment_error: z.string().nullable().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...updateData } = input;
            const { data, error } = await supabase
                .from('companies')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        }),

    // Delete company
    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', input.id);

            if (error) throw error;
            return { success: true };
        }),

    // Bulk delete companies
    bulkDelete: publicProcedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('companies')
                .delete()
                .in('id', input.ids);

            if (error) throw error;
            return { success: true };
        }),

    // Create or get company (used during CSV upload)
    createOrGet: publicProcedure
        .input(z.object({
            domain: z.string(),
            name: z.string(),
        }))
        .mutation(async ({ input }) => {
            // Try to get existing company
            const { data: existing } = await supabase
                .from('companies')
                .select('*')
                .eq('domain', input.domain)
                .single();

            if (existing) {
                return existing;
            }

            // Create new company
            const { data, error } = await supabase
                .from('companies')
                .insert({
                    domain: input.domain,
                    name: input.name,
                    enrichment_status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }),
});
