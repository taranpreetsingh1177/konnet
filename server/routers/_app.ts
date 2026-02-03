import { router, publicProcedure } from '../trpc';
import { leadsRouter } from './leads';
import { campaignsRouter } from './campaigns';
import { credentialsRouter } from './credentials';
import { companiesRouter } from './companies';

export const appRouter = router({
    health: publicProcedure.query(() => {
        return 'ok';
    }),
    leads: leadsRouter,
    campaigns: campaignsRouter,
    credentials: credentialsRouter,
    companies: companiesRouter,
});

export type AppRouter = typeof appRouter;


