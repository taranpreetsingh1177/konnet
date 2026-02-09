"use client";

import { TableErrorState } from "@/components/table-components";
import { AlertCircle } from "lucide-react";

/**
 * Error state component for the Leads table
 * Displays when there's an error fetching leads data
 */
export function LeadsTableError() {
    return (
        <div className="space-y-4">
            <TableErrorState
                icon={AlertCircle}
                title="Failed to load leads"
                message="We couldn't fetch your leads data. Please check your connection and try again."
                onRetry={() => window.location.reload()}
            />
        </div>
    );
}
