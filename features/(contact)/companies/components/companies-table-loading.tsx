"use client";

import { TableLoadingState } from "@/components/table-components";

/**
 * Loading state component for the Companies table
 * Displays while companies data is being fetched
 */
export function CompaniesTableLoading() {
    return (
        <div className="space-y-4">
            <TableLoadingState
                title="Loading Companies"
                message="Fetching your companies data..."
            />
        </div>
    );
}
