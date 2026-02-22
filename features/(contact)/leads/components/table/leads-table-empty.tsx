"use client";

import { TableEmptyState } from "@/components/table-components";
import { Users, Plus } from "lucide-react";

interface LeadsTableEmptyProps {
    /** Optional action handler for creating a new lead */
    onAddLead?: () => void;
}

/**
 * Empty state component for the Leads table
 * Displays when there are no leads to show
 */
export function LeadsTableEmpty({ onAddLead }: LeadsTableEmptyProps) {
    return (
        <div className="space-y-4">
            <TableEmptyState
                icon={Users}
                title="No leads found"
                description="Get started by adding your first lead or import them from a CSV file to begin tracking your contacts."
                action={
                    onAddLead
                        ? {
                            label: "Add Lead",
                            onClick: onAddLead,
                            icon: Plus,
                        }
                        : undefined
                }
            />
        </div>
    );
}
