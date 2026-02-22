// Base router
import { router } from "../trpc";

// Feature routers
import { campaignsRouter } from "@/features/(campaign)/campaigns/routers/campaigns";
import { credentialsRouter } from "@/features/(campaign)/credentials/routers/credentials";
import { companiesRouter } from "@/features/(contact)/companies/routers/companies";
import { leadsRouter } from "@/features/(contact)/leads/routers/leads";

export const appRouter = router({
  leads: leadsRouter,
  campaigns: campaignsRouter,
  credentials: credentialsRouter,
  companies: companiesRouter,
});

export type AppRouter = typeof appRouter;
