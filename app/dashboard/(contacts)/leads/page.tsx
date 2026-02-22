import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/lib/trpc/server";
import { LeadsTable } from "@/features/(contact)/leads/components/table/leads-table";
import { serverTrpc } from '@/lib/trpc/server'
import { LeadsTableError } from "@/features/(contact)/leads/components/table/leads-table-error";
import { LeadsTableLoading } from "@/features/(contact)/leads/components/table/leads-table-loading";

export const dynamic = 'force-dynamic';

export default function LeadsPage() {


    return (
        <HydrateClient>
            <ErrorBoundary fallback={<LeadsTableError />}>
                <Suspense fallback={<LeadsTableLoading />}>
                    <div className="h-full p-4">
                        <LeadsTable />
                    </div>
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    );
}
