
import { router, procedure } from '@/server/trpc';
import { z } from 'zod';

export const repliesRouter = router({
    getAll: procedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.number().nullish(), // Offset based pagination for simplicity in MVP, or cursor based on ID
                // For Supabase, offset is easier with page number
                page: z.number().min(1).default(1),
            })
        )
        .query(async ({ ctx, input }) => {
            const pageSize = input.limit;
            const start = (input.page - 1) * pageSize;
            const end = start + pageSize - 1;

            const { data, count, error } = await ctx.db
                .from('replies')
                .select('*, leads(name, email, role, companies(name)), campaigns(name)', { count: 'exact' })

                .order('received_at', { ascending: false })
                .range(start, end);

            if (error) {
                console.error('Error fetching replies:', error);
                // throw new Error('Failed to fetch replies: ' + error.message);
                throw new Error(`Failed to fetch replies: ${error.message} (Hint: ${error.hint || 'none'})`);
            }


            return {
                data: data || [],
                count: count || 0,
                page: input.page,
                pageSize: pageSize,
                totalPages: count ? Math.ceil(count / pageSize) : 0,
            };
        }),

    getStats: procedure.query(async ({ ctx }) => {
        // Get counts for today, this week, total
        // MVP: Just total count for now
        const { count, error } = await ctx.db
            .from('replies')
            .select('*', { count: 'exact', head: true });

        if (error) {
            throw new Error('Failed to fetch stats');
        }

        return {
            totalReplies: count || 0,
        };
    }),
});
