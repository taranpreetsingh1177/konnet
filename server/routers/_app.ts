// Base router
import { router } from '../trpc';

// Feature routers
import { campaignsRouter } from '@/features/campaigns/routers/campaigns';
import { credentialsRouter } from '@/features/credentials/routers/credentials';
import { companiesRouter } from '@/features/(contact)/companies/routers/companies';
import { leadsRouter } from '@/features/(contact)/leads/routers/leads';
import { repliesRouter } from '@/features/replies/routers/replies';

export const appRouter = router({
    leads: leadsRouter,
    campaigns: campaignsRouter,
    credentials: credentialsRouter,
    companies: companiesRouter,
    replies: repliesRouter,
});


export type AppRouter = typeof appRouter;


