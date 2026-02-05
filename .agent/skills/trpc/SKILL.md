---
name: tRPC Best Practices
description: Creates tRPC routers and queries using v11 with Next.js App Router, suspense, and prefetching patterns.
---

# tRPC v11 Best Practices for Next.js App Router

## Router Organization

### File Structure
1. **Create separate router files** - Each domain should have its own router file in the `server/routers` directory, NOT all in `_app.ts`
2. **Use domain-based organization**:
   ```
   server/
   ├── routers/
   │   ├── _app.ts          # Main app router that merges all routers
   │   ├── companies.ts     # Company-related procedures
   │   ├── users.ts         # User-related procedures
   │   ├── campaigns.ts     # Campaign-related procedures
   │   └── workflows.ts     # Workflow-related procedures
   ├── trpc.ts              # tRPC initialization and middleware
   └── context.ts           # Request context creation
   ```

### Router File Pattern
```typescript
// server/routers/companies.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const companiesRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.company.findUnique({
        where: { id: input.id },
      });
    }),

  getMany: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.company.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      domain: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.company.create({
        data: input,
      });
    }),
});
```

### Merging Routers in _app.ts
```typescript
// server/routers/_app.ts
import { createTRPCRouter } from "../trpc";
import { companiesRouter } from "./companies";
import { usersRouter } from "./users";
import { campaignsRouter } from "./campaigns";
import { workflowsRouter } from "./workflows";

export const appRouter = createTRPCRouter({
  companies: companiesRouter,
  users: usersRouter,
  campaigns: campaignsRouter,
  workflows: workflowsRouter,
});

export type AppRouter = typeof appRouter;
```

## Next.js App Router Integration

### Client Setup (app/_trpc/client.ts)
```typescript
"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();
```

### Server Setup (app/_trpc/server.ts)
```typescript
import "server-only";
import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { createCaller } from "@/server/routers/_app";
import { createTRPCContext } from "@/server/context";

// Create context only once per request
export const createContext = cache(async () => {
  return await createTRPCContext();
});

// Get the tRPC caller for server components
export const caller = async () => {
  const ctx = await createContext();
  return createCaller(ctx);
};

// Create hydration helpers for prefetching
export const { trpc: serverTrpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  async () => (await caller()).createCaller,
  {
    // Optional: Configure dehydrate options
  }
);
```

### Provider Setup (app/_trpc/Provider.tsx)
```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "./client";
import superjson from "superjson";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## Performance Patterns with Suspense & Prefetching

### Pattern 1: Server Component with Prefetching
```typescript
// app/(dashboard)/companies/page.tsx
import { Suspense } from "react";
import { HydrateClient, serverTrpc } from "@/app/_trpc/server";
import { CompaniesList } from "@/components/companies-list";
import { CompaniesListSkeleton } from "@/components/companies-list-skeleton";

export default async function CompaniesPage() {
  // Prefetch on the server
  await serverTrpc.companies.getMany.prefetch({ limit: 10 });

  return (
    <HydrateClient>
      <Suspense fallback={<CompaniesListSkeleton />}>
        <CompaniesList />
      </Suspense>
    </HydrateClient>
  );
}
```

### Pattern 2: Client Component Using Prefetched Data
```typescript
// components/companies-list.tsx
"use client";

import { trpc } from "@/app/_trpc/client";

export function CompaniesList() {
  // This data was prefetched on the server and hydrated
  const { data, isLoading } = trpc.companies.getMany.useQuery({
    limit: 10,
  });

  if (isLoading) return <CompaniesListSkeleton />;

  return (
    <div>
      {data?.items.map((company) => (
        <div key={company.id}>{company.name}</div>
      ))}
    </div>
  );
}
```

### Pattern 3: Infinite Query with Suspense
```typescript
// components/infinite-companies-list.tsx
"use client";

import { trpc } from "@/app/_trpc/client";
import { useIntersection } from "@/hooks/use-intersection";

export function InfiniteCompaniesList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.companies.getMany.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const { ref } = useIntersection({
    onIntersect: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  return (
    <div>
      {data?.pages.map((page) =>
        page.items.map((company) => (
          <div key={company.id}>{company.name}</div>
        ))
      )}
      {hasNextPage && <div ref={ref}>Loading more...</div>}
    </div>
  );
}
```

### Pattern 4: Prefetching Helper Function
```typescript
// lib/prefetch-helpers.ts
import "server-only";
import { serverTrpc } from "@/app/_trpc/server";

export async function prefetchCompanies(limit = 10) {
  await serverTrpc.companies.getMany.prefetch({ limit });
}

export async function prefetchCompany(id: string) {
  await serverTrpc.companies.getById.prefetch({ id });
}

export async function prefetchWorkflows() {
  await serverTrpc.workflows.getMany.prefetch({ limit: 20 });
}

// Usage in page:
// import { prefetchCompanies } from "@/lib/prefetch-helpers";
// await prefetchCompanies(20);
```

### Pattern 5: Optimistic Updates
```typescript
"use client";

import { trpc } from "@/app/_trpc/client";

export function CreateCompanyForm() {
  const utils = trpc.useUtils();
  
  const createCompany = trpc.companies.create.useMutation({
    onMutate: async (newCompany) => {
      // Cancel outgoing refetches
      await utils.companies.getMany.cancel();

      // Snapshot the previous value
      const previousCompanies = utils.companies.getMany.getData();

      // Optimistically update
      utils.companies.getMany.setData(
        { limit: 10 },
        (old) => ({
          items: old?.items ? [newCompany as any, ...old.items] : [newCompany as any],
          nextCursor: old?.nextCursor,
        })
      );

      return { previousCompanies };
    },
    onError: (err, newCompany, context) => {
      // Rollback on error
      utils.companies.getMany.setData(
        { limit: 10 },
        context?.previousCompanies
      );
    },
    onSettled: () => {
      // Refetch to ensure sync
      utils.companies.getMany.invalidate();
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createCompany.mutate({ name: "...", domain: "..." });
    }}>
      {/* form fields */}
    </form>
  );
}
```

## Advanced Patterns

### Parallel Prefetching
```typescript
// app/(dashboard)/dashboard/page.tsx
export default async function DashboardPage() {
  // Prefetch multiple queries in parallel
  await Promise.all([
    serverTrpc.companies.getMany.prefetch({ limit: 5 }),
    serverTrpc.workflows.getMany.prefetch({ limit: 10 }),
    serverTrpc.campaigns.getMany.prefetch({ limit: 5 }),
  ]);

  return (
    <HydrateClient>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </HydrateClient>
  );
}
```

### Conditional Prefetching
```typescript
export default async function CompanyPage({ params }: { params: { id: string } }) {
  const companyId = params.id;

  // Only prefetch if ID exists
  if (companyId) {
    await serverTrpc.companies.getById.prefetch({ id: companyId });
  }

  return (
    <HydrateClient>
      <Suspense fallback={<CompanySkeleton />}>
        <CompanyDetails id={companyId} />
      </Suspense>
    </HydrateClient>
  );
}
```

### Using ensureData for Critical Data
```typescript
// For data that MUST be present before rendering
export default async function CriticalPage() {
  // ensureData throws if data cannot be fetched
  const company = await serverTrpc.companies.getById.ensureData({ 
    id: "123" 
  });

  // Company is guaranteed to exist here
  return <div>{company.name}</div>;
}
```

## Key Reminders

### Router Organization
- ✅ **Always** create separate router files for each domain (companies.ts, users.ts, etc.)
- ✅ **Always** merge routers in `_app.ts`, never define all procedures there
- ✅ **Always** export typed routers for type safety

### Next.js Performance
- ✅ **Always** use `prefetch` in Server Components for initial data loading
- ✅ **Always** wrap client components with `<HydrateClient>` when using prefetched data
- ✅ **Always** use `<Suspense>` boundaries for progressive loading
- ✅ **Consider** using `useInfiniteQuery` for paginated lists
- ✅ **Consider** optimistic updates for better UX on mutations
- ✅ **Consider** parallel prefetching for dashboard/overview pages

### tRPC v11 Specific
- ✅ Use `createTRPCReact` for client setup
- ✅ Use `createHydrationHelpers` from `@trpc/react-query/rsc`
- ✅ Use `server-only` package in server utilities
- ✅ Use `cache()` from React for context creation
- ✅ Enable `transformer: superjson` for Date/Map/Set support

### Input Validation
- ✅ **Always** use Zod for input validation on procedures
- ✅ **Always** set reasonable defaults and limits (e.g., `.max(100)` for pagination)
- ✅ **Always** validate incoming data, never trust client input
