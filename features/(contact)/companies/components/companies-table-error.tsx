"use client";

import { TableErrorState } from "@/components/table-components";
import { AlertCircle } from "lucide-react";

/**
 * Error state component for the Companies table
 * Displays when there's an error fetching companies data
 */
export function CompaniesTableError() {
    return (
        <div className="space-y-4">
            <TableErrorState
                icon={AlertCircle}
                title="Failed to load companies"
                message="We couldn't fetch your companies data. Please check your connection and try again."
                onRetry={() => window.location.reload()}
            />
        </div>
    );
}
