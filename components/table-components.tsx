"use client";

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader as UITableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Settings2,
    Trash2,
    XCircle,
} from "lucide-react";
import { flexRender, ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { PAGINATION } from "@/lib/constants/page";

// ----------------------------------------------------------------------------
// Table Container
// ----------------------------------------------------------------------------

interface TableContainerProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    toolbar?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export function TableContainer({
    children,
    header,
    toolbar,
    footer,
    className,
}: TableContainerProps) {
    return (
        <div className={cn("h-full flex flex-col bg-white", className)}>
            {(header || toolbar) && (
                <div className="flex flex-col border-b border-gray-100 bg-white">
                    {header}
                    {toolbar}
                </div>
            )}
            <div className="flex-1 overflow-auto bg-white relative">
                {children}
            </div>
            {footer}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Table Header
// ----------------------------------------------------------------------------

interface TableHeaderProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function TableHeader({
    title,
    description,
    action,
    className,
}: TableHeaderProps) {
    return (
        <div className={cn("px-6 py-5 flex items-start justify-between", className)}>
            <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                {description && (
                    <p className="text-sm text-gray-500">{description}</p>
                )}
            </div>
            {action}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Table Toolbar
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Table Toolbar
// ----------------------------------------------------------------------------

interface FilterOption {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterGroup {
    label: string; // e.g., "Status"
    key: string; // unique key for this grouop
    type: "img" | "checkbox"; // generic filter type
    options: FilterOption[];
    selectedValues: string[]; // Controlled state
    onFilterChange: (values: string[]) => void;
}

export interface SortOption {
    label: string;
    value: string;
}

interface TableToolbarProps {
    searchQuery?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;

    // Filters
    filterGroups?: FilterGroup[];

    // Sorting
    sortOptions?: SortOption[];
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    onSortChange?: (field: string, order: "asc" | "desc") => void;

    children?: React.ReactNode;
    selectedCount?: number;
    totalCount?: number; // Needed for "all" selection mode
    bulkActions?: {
        label: string;
        icon?: React.ComponentType<{ className?: string }>;
        onClick: () => void;
        variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
        disabled?: boolean;
        selectionMode?: "single" | "multiple" | "all" | "any"; // Default "any" (>0)
    }[];
    className?: string;
}

export function TableToolbar({
    searchQuery,
    onSearchChange,
    searchPlaceholder = "Search...",
    filterGroups = [],
    sortOptions = [],
    sortBy,
    sortOrder,
    onSortChange,
    children,
    selectedCount = 0,
    totalCount,
    bulkActions = [],
    className,
}: TableToolbarProps) {
    const hasActiveFilters = filterGroups.some(g => g.selectedValues.length > 0);

    return (
        <div className={cn("flex flex-col gap-4 px-4 py-3 bg-white border-b border-gray-100", className)}>
            <div className="flex items-center justify-between gap-4">
                {/* Left Side: Search & Filters */}
                <div className="flex items-center flex-1 gap-2 overflow-x-auto no-scrollbar">
                    {onSearchChange && (
                        <div className="relative w-64 flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={searchQuery || ""}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    )}

                    {filterGroups.map((group) => (
                        <FilterDropdown
                            key={group.key}
                            group={group}
                        />
                    ))}

                    {/* render any extra children (like custom date range pickers etc) */}
                    {children}

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => filterGroups.forEach(g => g.onFilterChange([]))}
                            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    )}
                </div>

                {/* Right Side: Sorting & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedCount > 0 ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
                            <div className="text-sm font-medium mr-2">
                                {selectedCount} selected
                            </div>
                            {bulkActions.map((action, index) => {
                                const mode = action.selectionMode || "any";

                                // Logic for visibility
                                if (mode === "single" && selectedCount !== 1) return null;
                                if (mode === "multiple" && selectedCount <= 1) return null;
                                if (mode === "all") {
                                    if (!totalCount || selectedCount !== totalCount) return null;
                                }
                                // "any" shows for count > 0, which is already true inside this block

                                const Icon = action.icon;
                                return (
                                    <Button
                                        key={index}
                                        variant={action.variant || "outline"}
                                        size="sm"
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                        className="h-8 text-xs"
                                    >
                                        {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
                                        {action.label}
                                    </Button>
                                );
                            })}
                        </div>
                    ) : (
                        sortedActions(onSortChange, sortOptions, sortBy, sortOrder)
                    )}
                </div>
            </div>
        </div>
    );
}

function sortedActions(
    onSortChange: TableToolbarProps['onSortChange'],
    sortOptions: SortOption[],
    sortBy?: string,
    sortOrder?: "asc" | "desc"
) {
    if (!onSortChange || sortOptions.length === 0) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
                <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                Sort
                {sortBy && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-medium">
                        {sortOptions.find(o => o.value === sortBy)?.label || sortBy}
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(val) => onSortChange(val, sortOrder || 'desc')}>
                    {sortOptions.map(option => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Order</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOrder} onValueChange={(val) => onSortChange(sortBy || sortOptions[0]?.value, val as "asc" | "desc")}>
                    <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


function FilterDropdown({ group }: { group: FilterGroup }) {
    const selectedSet = new Set(group.selectedValues);
    const activeCount = selectedSet.size;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9 border-dashed",
                    activeCount > 0 && "border-solid bg-secondary/50 border-secondary-foreground/20"
                )}
            >
                <Plus className="w-4 h-4 mr-2 text-muted-foreground" />
                {group.label}
                {activeCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                        {activeCount}
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Filter by {group.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {group.options.map((option) => {
                    const isSelected = selectedSet.has(option.value);
                    const Icon = option.icon;
                    return (
                        <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                                const newValues = checked
                                    ? [...group.selectedValues, option.value]
                                    : group.selectedValues.filter(v => v !== option.value);
                                group.onFilterChange(newValues);
                            }}
                        >
                            {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                            <span>{option.label}</span>
                        </DropdownMenuCheckboxItem>
                    );
                })}
                {activeCount > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() => group.onFilterChange([])}
                            className="justify-center text-center text-sm"
                        >
                            Clear filters
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


// ----------------------------------------------------------------------------
// Table Content (Empty, Loading, Error, Data)
// ----------------------------------------------------------------------------

interface TableContentProps<T> {
    table: import("@tanstack/react-table").Table<T>; // Using explicit type import for now or generic if we import Table type
    isLoading?: boolean;
    error?: string | null;
    emptyState?: React.ReactNode;
    columns: ColumnDef<T>[];
}

export function TableContent<T>({
    table,
    isLoading,
    error,
    emptyState,
    columns,
}: TableContentProps<T>) {
    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Something went wrong
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mb-4">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Try Again
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-sm text-gray-500">Loading data...</p>
            </div>
        );
    }

    if (table.getRowModel().rows.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                {emptyState || (
                    <>
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                            <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            No results found
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm">
                            Try adjusting your search or filters, or add a new item to get started.
                        </p>
                    </>
                )}
            </div>
        );
    }

    return (
        <Table>
            <UITableHeader className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 shadow-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-gray-200 hover:bg-transparent">
                        {headerGroup.headers.map((header) => {
                            return (
                                <TableHead key={header.id} className="h-10 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            );
                        })}
                    </TableRow>
                ))}
            </UITableHeader>
            <TableBody>
                {table.getRowModel().rows.map((row) => (
                    <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="group hover:bg-gray-50/50 border-gray-100 transition-colors data-[state=selected]:bg-blue-50/40"
                    >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="px-4 py-3">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

// ----------------------------------------------------------------------------
// Table Pagination
// ----------------------------------------------------------------------------

interface TablePaginationProps<T> {
    table: import("@tanstack/react-table").Table<T>;
    totalItems?: number;
    className?: string;
    showPageSize?: boolean;
}

export function TablePagination<T>({
    table,
    totalItems,
    className,
    showPageSize = true,
}: TablePaginationProps<T>) {
    const pageIndex = table.getState().pagination.pageIndex;
    const pageSize = table.getState().pagination.pageSize;
    const pageCount = table.getPageCount();
    // If manual pagination is handled server-side, totalItems logic might differ.
    // Assuming this component uses tanstack table's state or is fed appropriate data.

    const pageSizeOptions = [
        PAGINATION.DEFAULT_PAGE_SIZE,
        PAGINATION.DEFAULT_PAGE_SIZE * 2,
        PAGINATION.DEFAULT_PAGE_SIZE * 3,
        PAGINATION.DEFAULT_PAGE_SIZE * 5,
        PAGINATION.MAX_PAGE_SIZE
    ].filter((size, index, self) => self.indexOf(size) === index && size <= PAGINATION.MAX_PAGE_SIZE).sort((a, b) => a - b);

    return (
        <div className={cn("flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30", className)}>
            <div className="flex-1 text-xs text-gray-500">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {totalItems ?? table.getFilteredRowModel().rows.length} row(s) selected
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                {showPageSize && (
                    <div className="flex items-center space-x-2">
                        <p className="text-xs font-medium text-gray-500">Rows per page</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 w-[70px] bg-white text-xs")}>
                                {pageSize}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[70px]">
                                {pageSizeOptions.map((size) => (
                                    <DropdownMenuItem
                                        key={size}
                                        onClick={() => table.setPageSize(size)}
                                        className="text-xs"
                                    >
                                        {size}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
                <div className="flex w-[100px] items-center justify-center text-xs font-medium text-gray-500">
                    Page {pageIndex + 1} of {pageCount}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 bg-white lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 bg-white lg:flex"
                        onClick={() => table.setPageIndex(pageCount - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
