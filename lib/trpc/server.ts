import "server-only";
import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { QueryClient } from "@tanstack/react-query";
import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/server/context";
import { createCallerFactory } from "@/server/trpc";
import { headers } from "next/headers";

// Create context only once per request
const createContext = cache(async () => {
    const heads = new Headers(await headers());
    heads.set("x-trpc-source", "rsc");

    return createTRPCContext({
        headers: heads,
    });
});

const getQueryClient = cache(() => new QueryClient());

console.log("AppRouter keys:", Object.keys(appRouter._def.procedures));
const createCaller = createCallerFactory(appRouter);

export const { trpc: serverTrpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
    ((ctx: any) => createCaller(ctx)) as any,
    getQueryClient
);
