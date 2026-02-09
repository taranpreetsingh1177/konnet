"use client";

import { TableEmptyState } from "@/components/table-components";
import { Building2, Plus } from "lucide-react";

interface CompaniesTableEmptyProps {
    /** Optional action handler for creating a new company */
    onAddCompany?: () => void;
}

/**
 * Empty state component for the Companies table
 * Displays when there are no companies to show
 */
export function CompaniesTableEmpty({ onAddCompany }: CompaniesTableEmptyProps) {
    return (
        <div className="space-y-4">
            <TableEmptyState
                icon={Building2}
                title="No companies found"
                description="Get started by adding your first company. Companies help you organize and track your leads effectively."
                action={
                    onAddCompany
                        ? {
                            label: "Add Company",
                            onClick: onAddCompany,
                            icon: Plus,
                        }
                        : undefined
                }
            />
        </div>
    );
}
