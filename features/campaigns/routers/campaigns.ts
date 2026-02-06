import { router, procedure } from '@/server/trpc';
import { z } from 'zod';
import { cancelCampaign } from '@/app/dashboard/campaigns/actions';

export const campaignsRouter = router({
    getAll: procedure.query(async ({ ctx }) => {
        const { data } = await ctx.db
            .from('campaigns')
            .select(`
                *,
                campaign_accounts (
                    account_id,
                    accounts (email)
                ),
                leads (
                    id,
                    email,
                    name,
                    campaign_status,
                    sent_at,
                    opened_at
                )
            `)
            .order('created_at', { ascending: false });

        return data || [];
    }),

    delete: procedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('campaigns')
                .delete()
                .eq('id', input.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    bulkDelete: procedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.db
                .from('campaigns')
                .delete()
                .in('id', input.ids);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    cancel: procedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Use server action for campaign cancellation
            const result = await cancelCampaign(input.id);
            if (!result.success) {
                throw new Error(result.error || 'Failed to cancel campaign');
            }
            return result;
        }),
});
