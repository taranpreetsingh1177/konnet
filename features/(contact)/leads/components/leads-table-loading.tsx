"use client";

import { TableLoadingState } from "@/components/table-components";

/**
 * Loading state component for the Leads table
 * Displays a skeleton with appropriate column count
 */
export function LeadsTableLoading() {
    return (
        <div className="space-y-4">
            <TableLoadingState
                title="Loading Leads"
                message="Loading leads data..."
            />
        </div>
    );
}
