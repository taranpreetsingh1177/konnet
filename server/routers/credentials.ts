import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const credentialsRouter = router({
    getAll: publicProcedure.query(async () => {
        const { data } = await supabase
            .from('accounts')
            .select('*')
            .order('created_at', { ascending: false });

        return data || [];
    }),

    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', input.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }),

    bulkDelete: publicProcedure
        .input(z.object({ ids: z.array(z.string()) }))
        .mutation(async ({ input }) => {
            const { error } = await supabase
                .from('accounts')
                .delete()
                .in('id', input.ids);

            if (error) throw new Error(error.message);
            return { success: true };
        }),
});
