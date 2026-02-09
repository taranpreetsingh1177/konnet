import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/lib/trpc/server";
import { CompaniesTable } from "@/features/(contact)/companies/components/companies-table";
import { CompaniesTableLoading } from "@/features/(contact)/companies/components/companies-table-loading";
import { CompaniesTableError } from "@/features/(contact)/companies/components/companies-table-error";

export default function CompaniesPage() {
    return (
        <HydrateClient>
            <ErrorBoundary fallback={<CompaniesTableError />}>
                <Suspense fallback={<CompaniesTableLoading />}>
                    <div className="h-full p-4">
                        <CompaniesTable />
                    </div>
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    );
}
