import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const campaignsRouter = router({
    getAll: publicProcedure.query(async () => {
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
            .order('created_at', { ascending: false });

        return data || [];
    }),

    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', input.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    bulkDelete: publicProcedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .in('id', input.ids);

            if (error) throw new Error(error.message);
            return { success: true };
        }),
});
