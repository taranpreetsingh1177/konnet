import { router, procedure } from '@/server/trpc';
import { z } from 'zod';

export const leadsRouter = router({
    getAll: procedure.query(async ({ ctx }) => {
        const { data } = await ctx.db
            .from('leads')
            .select(`
                *,
                companies ( 
                    id,
                    name,
                    domain,
                    logo_url
                )
            `)
            .order('created_at', { ascending: false });

        return data || [];
    }),

    getById: procedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const { data } = await ctx.db
                .from('leads')
                .select('*')
                .eq('id', input.id)
                .single();

            return data;
        }),

    update: procedure
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

    delete: procedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('leads')
                .delete()
                .eq('id', input.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    bulkDelete: procedure
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
