"use client";

import { useState, useMemo } from "react";
import {
    ColumnDef,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    getFilteredRowModel,
    ColumnFiltersState,
    VisibilityState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Building2,
    MoreHorizontal,
    ArrowUpDown,
    Trash2,
    Eye,
    Globe,
    Mail,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    Linkedin,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    TableContainer,
    TableToolbar,
    TableContent,
    TablePagination,
    FilterGroup,
    SortOption
} from "@/components/table-components";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import {
    Companies,
    type CompanyEnrichmentStatus,
} from "../lib/constants";

interface Company {
    id: string;
    domain: string;
    name: string;
    logo_url: string | null;
    email_template: string | null;
    enrichment_status: CompanyEnrichmentStatus;
    created_at: string;
    leads?: { count: number }[];
}

const statusConfig: Record<CompanyEnrichmentStatus, {
    label: string;
    bgColor: string;
    textColor: string;
    icon: typeof Clock;
}> = {
    [Companies.EnrichmentStatus.PENDING]: {
        label: "Pending",
        bgColor: "bg-gray-100",
        textColor: "text-gray-600",
        icon: Clock,
    },
    [Companies.EnrichmentStatus.PROCESSING]: {
        label: "Processing",
        bgColor: "bg-blue-50",
        textColor: "text-blue-600",
        icon: Loader2,
    },
    [Companies.EnrichmentStatus.COMPLETED]: {
        label: "Completed",
        bgColor: "bg-green-50",
        textColor: "text-green-600",
        icon: CheckCircle,
    },
    [Companies.EnrichmentStatus.FAILED]: {
        label: "Failed",
        bgColor: "bg-red-50",
        textColor: "text-red-600",
        icon: XCircle,
    },
};

export function CompaniesTable() {
    const [rowSelection, setRowSelection] = useState({});
    const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const { data: companies = [], isLoading, refetch } = trpc.companies.getAll.useQuery();

    const deleteMutation = trpc.companies.delete.useMutation({
        onSuccess: () => {
            setRowSelection({});
            refetch();
        }
    });

    const bulkDeleteMutation = trpc.companies.bulkDelete.useMutation({
        onSuccess: () => {
            setRowSelection({});
            refetch();
        }
    });

    const handleDelete = (id: string) => {
        if (confirm('Delete this company? Associated leads will remain but won\'t have a linked company.')) {
            deleteMutation.mutate({ id });
        }
    };

    const handleBulkDelete = () => {
        const selectedIds = Object.keys(rowSelection);
        if (confirm(`Delete ${selectedIds.length} companies?`)) {
            bulkDeleteMutation.mutate({ ids: selectedIds });
        }
    };

    const updateMutation = trpc.companies.update.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleEnrich = async (companyId: string) => {
        try {
            toast.info("Triggering enrichment...");

            // First, mark as processing using tRPC mutation
            await updateMutation.mutateAsync({
                id: companyId,
                enrichment_status: Companies.EnrichmentStatus.PENDING,
                enrichment_error: null
            });

            const response = await fetch('/api/inngest/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'company/enrich',
                    data: { companyId }
                })
            });

            if (response.ok) {
                toast.success("Enrichment triggered!");
                refetch();
            } else {
                toast.error("Enrichment server not responding.");
                // Mark as failed
                updateMutation.mutate({
                    id: companyId,
                    enrichment_status: Companies.EnrichmentStatus.FAILED,
                    enrichment_error: 'Enrichment server not responding'
                });
            }
        } catch (error) {
            toast.error("Cannot connect to enrichment server.");
            updateMutation.mutate({
                id: companyId,
                enrichment_status: Companies.EnrichmentStatus.FAILED,
                enrichment_error: 'Cannot connect to enrichment server'
            });
        }
    };

    const columns: ColumnDef<Company>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: "Company",
            cell: ({ row }) => {
                const company = row.original;
                return (
                    <div className="flex items-center gap-3">
                        {company.logo_url ? (
                            <img
                                src={company.logo_url}
                                alt={company.name}
                                className="w-8 h-8 object-contain rounded"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-gray-400" />
                            </div>
                        )}
                        <span className="font-medium text-gray-900">{company.name}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "domain",
            header: "Domain",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{row.original.domain}</span>
                </div>
            ),
        },
        {
            id: "leads",
            header: "Leads",
            accessorFn: (row) => row.leads?.[0]?.count || 0,
            cell: ({ row }) => {
                const count = row.original.leads?.[0]?.count || 0;
                return (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{count}</span>
                    </div>
                );
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const company = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 p-0")}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem >
                                <Link href={`/dashboard/companies/${company.id}`} className="flex items-center w-full">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEnrich(company.id)}>
                                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                Enrich Data
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleDelete(company.id)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: companies,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            rowSelection,
            sorting,
            columnFilters,
            globalFilter,
            columnVisibility,
        },
    });

    const sortOptions: SortOption[] = [
        { label: "Date Added", value: "created_at" },
        { label: "Name", value: "name" },
        { label: "Leads Count", value: "leads" }
    ];

    return (
        <TableContainer>
            <TableToolbar
                searchQuery={globalFilter}
                onSearchChange={setGlobalFilter}
                searchPlaceholder="Search companies..."
                selectedCount={Object.keys(rowSelection).length}
                bulkActions={[
                    {
                        label: "Delete",
                        onClick: handleBulkDelete,
                        variant: "destructive",
                        icon: Trash2,
                    },
                ]}
                sortOptions={sortOptions}
                sortBy={sorting[0]?.id}
                sortOrder={sorting[0]?.desc ? "desc" : "asc"}
                onSortChange={(field, order) => {
                    setSorting([{ id: field, desc: order === "desc" }]);
                }}
            />
            <TableContent table={table} columns={columns} isLoading={isLoading} />
            <TablePagination table={table} />
        </TableContainer>
    );
}
