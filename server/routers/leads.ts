import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client for server-side operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const leadsRouter = router({
    getAll: publicProcedure.query(async () => {
        const { data } = await supabase
            .from('leads')
            .select(`
                *,
                companies (
                    id,
                    name,
                    domain,
                    logo_url
                ),
                lead_tags (
                    tag_id,
                    tags (
                        id,
                        name,
                        color
                    )
                )
            `)
            .order('created_at', { ascending: false });

        return data || [];
    }),

    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const { data } = await supabase
                .from('leads')
                .select('*')
                .eq('id', input.id)
                .single();

            return data;
        }),

    update: publicProcedure
        .input(z.object({
            id: z.string(),
            email: z.string().optional(),
            name: z.string().nullable().optional(),
            company_id: z.string().nullable().optional(),
            role: z.string().nullable().optional(),
            linkedin_url: z.string().nullable().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...updates } = input;
            const { error } = await supabase
                .from('leads')
                .update(updates)
                .eq('id', id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', input.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    bulkDelete: publicProcedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('leads')
                .delete()
                .in('id', input.ids);

            if (error) throw new Error(error.message);
            return { success: true };
        }),
});
