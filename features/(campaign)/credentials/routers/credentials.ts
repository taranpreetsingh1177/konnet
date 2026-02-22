import { router, procedure } from '@/server/trpc';
import { z } from 'zod';

export const credentialsRouter = router({
    getAll: procedure.query(async ({ ctx }) => {
        const { data } = await ctx.db
            .from('accounts')
            .select('*')
            .order('created_at', { ascending: false });

        return data || [];
    }),

    delete: procedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('accounts')
                .delete()
                .eq('id', input.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    bulkDelete: procedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('accounts')
                .delete()
                .in('id', input.ids);

            if (error) throw new Error(error.message);
            return { success: true };
        }),
});
