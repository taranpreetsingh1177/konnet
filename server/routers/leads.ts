import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const leadsRouter = router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
        const { data } = await ctx.db
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

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const { data } = await ctx.db
                .from('leads')
                .select('*')
                .eq('id', input.id)
                .single();

            return data;
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            email: z.string().optional(),
            name: z.string().nullable().optional(),
            company_id: z.string().nullable().optional(),
            role: z.string().nullable().optional(),
            linkedin_url: z.string().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...updates } = input;
            const { error } = await ctx.db
                .from('leads')
                .update(updates)
                .eq('id', id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('leads')
                .delete()
                .eq('id', input.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    bulkDelete: protectedProcedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('leads')
                .delete()
                .in('id', input.ids);

            if (error) throw new Error(error.message);
            return { success: true };
        }),
});
