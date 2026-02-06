// Base router
import { router } from '../trpc';

// Feature routers
import { campaignsRouter } from '@/features/campaigns/routers/campaigns';
import { credentialsRouter } from './credentials';
import { companiesRouter } from '@/features/(contact)/companies/routers/companies';
import { leadsRouter } from '@/features/(contact)/leads/routers/leads';

export const appRouter = router({
    leads: leadsRouter,
    campaigns: campaignsRouter,
    credentials: credentialsRouter,
    companies: companiesRouter,
});

export type AppRouter = typeof appRouter;


