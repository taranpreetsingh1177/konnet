import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { inngest } from '@/lib/inngest/client';

export const companiesRouter = router({
    // Get all companies
    getAll: protectedProcedure.query(async ({ ctx }) => {
        const { data, error } = await ctx.db
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
    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.db
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
    getByDomain: protectedProcedure
        .input(z.object({ domain: z.string() }))
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.db
                .from('companies')
                .select('*')
                .eq('domain', input.domain)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
            return data;
        }),

    // Update company
    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            logo_url: z.string().optional(),
            email_template: z.string().optional(),
            email_subject: z.string().optional(),
            enrichment_status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
            enrichment_error: z.string().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input;
            const { data, error } = await ctx.db
                .from('companies')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        }),

    // Delete company
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('companies')
                .delete()
                .eq('id', input.id);

            if (error) throw error;
            return { success: true };
        }),

    // Bulk delete companies
    bulkDelete: protectedProcedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('companies')
                .delete()
                .in('id', input.ids);

            if (error) throw error;
            return { success: true };
        }),

    // Create or get company (used during CSV upload)
    createOrGet: protectedProcedure
        .input(z.object({
            domain: z.string(),
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Try to get existing company
            const { data: existing } = await ctx.db
                .from('companies')
                .select('*')
                .eq('domain', input.domain)
                .single();

            if (existing) {
                return existing;
            }

            // Create new company
            const { data, error } = await ctx.db
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

    // Retry enrichment for all failed companies
    retryFailedEnrichment: protectedProcedure
        .mutation(async ({ ctx }) => {
            // 1. Get all failed companies
            const { data: failedCompanies, error: fetchError } = await ctx.db
                .from('companies')
                .select('id')
                .eq('enrichment_status', 'failed');

            if (fetchError) throw fetchError;
            if (!failedCompanies || failedCompanies.length === 0) {
                return { count: 0 };
            }

            const ids = failedCompanies.map(c => c.id);

            // 2. Reset status to pending
            const { error: updateError } = await ctx.db
                .from('companies')
                .update({
                    enrichment_status: 'pending',
                    enrichment_error: null
                })
                .in('id', ids);

            if (updateError) throw updateError;

            // 3. Trigger Inngest events
            const events = ids.map(id => ({
                name: 'company/enrich',
                data: { companyId: id }
            }));

            await inngest.send(events);

            return { count: ids.length };
        }),
});
