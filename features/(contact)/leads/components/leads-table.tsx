"use client";

import { useState } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  TableContainer,
  TableToolbar,
  TableContent,
  TablePagination,
} from "@/components/table-components";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Building2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { CSVUploadModal } from "./csv-upload-modal";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  company_id: string | null;
  linkedin_url: string | null;
  created_at: string;
  companies?: {
    id: string;
    name: string;
    domain: string;
    logo_url: string | null;
  } | null;
}

export function LeadsTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Fetch leads data
  const { data: leads = [], isLoading, refetch } = trpc.leads.getAll.useQuery();

  // Delete mutation
  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete lead");
    },
  });

  // Handle delete
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Column definitions
  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.email}
            </span>
            {row.original.name && (
              <span className="text-sm text-muted-foreground">
                {row.original.name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "companies.name",
      header: "Company",
      cell: ({ row }) => {
        const company = row.original.companies;
        if (!company) {
          return (
            <span className="text-sm text-muted-foreground">
              No company
            </span>
          );
        }
        return (
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-8 h-8 object-contain rounded"
              />
            ) : (
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {company.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {company.domain}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.role || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => handleDelete(lead.id)}
                className="text-destructive focus:text-destructive"
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

  // Table instance
  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <>
      <TableContainer>
        <TableToolbar
          searchQuery={globalFilter}
          onSearchChange={setGlobalFilter}
          searchPlaceholder="Search leads..."
          actions={
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              size="sm"
            >
              <Upload className="mr-2 size-4" />
              Upload CSV
            </Button>
          }
        />

        <TableContent
          table={table}
          columns={columns}
          isLoading={isLoading}
          emptyState={{
            title: "No leads found",
            description: "Get started by adding your first lead or import them from a CSV file.",
          }}
        />

        <TablePagination table={table} />
      </TableContainer>

      <CSVUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onSuccess={() => {
          refetch();
          setIsUploadModalOpen(false);
        }}
      />
    </>
  );
}
