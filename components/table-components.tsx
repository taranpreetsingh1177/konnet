/**
 * Reusable Table Components
 * 
 * This file contains reusable components for data tables throughout the application:
 * - TableLoadingState: Loading skeleton for tables
 * - TableErrorState: Error display for table data
 * - TableEmptyState: Empty state card when no data
 * - TableContainer, TableToolbar, TableContent, TablePagination: Main table components
 * 
 * All components follow shadcn/ui design system and best practices.
 */

"use client";

import { ReactNode } from "react";
import {
    Table as ShadcnTable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
    EmptyContent,
} from "@/components/ui/empty";
import { AlertCircle, ChevronLeft, ChevronRight, Database, LucideIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, ColumnDef, flexRender } from "@tanstack/react-table";

// ============================================================================
// Loading State Component
// ============================================================================

interface TableLoadingStateProps {
    /** Error title */
    title?: string;
    /** Error message */
    message?: string;
    /** Retry callback */
    onRetry?: () => void;
    /** Custom icon */
    icon?: LucideIcon;
    /** Custom className */
    className?: string;
}

/**
 * TableLoadingState - Displays a card-based skeleton loading state for tables
 * 
 * @example
 * ```tsx
 * <TableLoadingState rows={5} />
 * ```
 */
export function TableLoadingState({
    title = "Error loading data",
    message = "Something went wrong while fetching the data. Please try again.",
    onRetry,
    icon: Icon = AlertCircle,
    className,
}: TableErrorStateProps) {
    return (
        <Card className={cn("", className)}>
            <CardContent className="p-12">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-primary">
                            <Icon className="size-5" />
                        </EmptyMedia>
                        <EmptyContent>
                            <EmptyTitle className="text-foreground">{title}</EmptyTitle>
                            <EmptyDescription>{message}</EmptyDescription>
                        </EmptyContent>
                    </EmptyHeader>
                    {onRetry && (
                        <Button
                            onClick={onRetry}
                            variant="outline"
                            size="sm"
                            className="mt-4"
                        >
                            <RefreshCw className="mr-2 size-4" />
                            Try Again
                        </Button>
                    )}
                </Empty>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Error State Component
// ============================================================================

interface TableErrorStateProps {
    /** Error title */
    title?: string;
    /** Error message */
    message?: string;
    /** Retry callback */
    onRetry?: () => void;
    /** Custom icon */
    icon?: LucideIcon;
    /** Custom className */
    className?: string;
}

/**
 * TableErrorState - Displays an error state for tables
 * 
 * @example
 * ```tsx
 * <TableErrorState 
 *   title="Failed to load data"
 *   message="Please try again"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function TableErrorState({
    title = "Error loading data",
    message = "Something went wrong while fetching the data. Please try again.",
    onRetry,
    icon: Icon = AlertCircle,
    className,
}: TableErrorStateProps) {
    return (
        <Card className={cn("border-destructive/50", className)}>
            <CardContent className="p-12">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                            <Icon className="size-5" />
                        </EmptyMedia>
                        <EmptyContent>
                            <EmptyTitle className="text-destructive">{title}</EmptyTitle>
                            <EmptyDescription>{message}</EmptyDescription>
                        </EmptyContent>
                    </EmptyHeader>
                    {onRetry && (
                        <Button
                            onClick={onRetry}
                            variant="outline"
                            size="sm"
                            className="mt-4"
                        >
                            <RefreshCw className="mr-2 size-4" />
                            Try Again
                        </Button>
                    )}
                </Empty>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface TableEmptyStateProps {
    /** Icon to display */
    icon?: LucideIcon;
    /** Empty state title */
    title?: string;
    /** Empty state description */
    description?: string;
    /** Action button configuration */
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    /** Custom className */
    className?: string;
}

/**
 * TableEmptyState - Displays an empty state when table has no data
 * 
 * @example
 * ```tsx
 * <TableEmptyState
 *   icon={Database}
 *   title="No companies found"
 *   description="Get started by creating your first company"
 *   action={{
 *     label: "Add Company",
 *     onClick: () => setOpen(true),
 *     icon: Plus,
 *   }}
 * />
 * ```
 */
export function TableEmptyState({
    icon: Icon = Database,
    title = "No data found",
    description = "There are no items to display at the moment.",
    action,
    className,
}: TableEmptyStateProps) {
    const ActionIcon = action?.icon;

    return (
        <Card className={className}>
            <CardContent className="p-12">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-muted">
                            <Icon className="size-5" />
                        </EmptyMedia>
                        <EmptyContent>
                            <EmptyTitle>{title}</EmptyTitle>
                            <EmptyDescription>{description}</EmptyDescription>
                        </EmptyContent>
                    </EmptyHeader>
                    {action && (
                        <Button onClick={action.onClick} className="mt-4">
                            {ActionIcon && <ActionIcon className="mr-2 size-4" />}
                            {action.label}
                        </Button>
                    )}
                </Empty>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Table Container & Core Components
// ============================================================================

interface TableContainerProps {
    children: ReactNode;
    className?: string;
}

/**
 * TableContainer - Wrapper for table components
 */
export function TableContainer({ children, className }: TableContainerProps) {
    return (
        <div className={cn("flex flex-col h-full space-y-4", className)}>
            {children}
        </div>
    );
}

// ============================================================================
// Table Toolbar
// ============================================================================

export interface SortOption {
    label: string;
    value: string;
}

export interface BulkAction {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    icon?: LucideIcon;
}

export interface FilterGroup {
    label: string;
    options: { label: string; value: string }[];
    value?: string;
    onChange: (value: string) => void;
}

interface TableToolbarProps {
    /** Search query value */
    searchQuery?: string;
    /** Search change handler */
    onSearchChange?: (value: string) => void;
    /** Search placeholder text */
    searchPlaceholder?: string;
    /** Number of selected rows */
    selectedCount?: number;
    /** Bulk actions configuration */
    bulkActions?: BulkAction[];
    /** Sort options */
    sortOptions?: SortOption[];
    /** Current sort field */
    sortBy?: string;
    /** Current sort order */
    sortOrder?: "asc" | "desc";
    /** Sort change handler */
    onSortChange?: (field: string, order: "asc" | "desc") => void;
    /** Filter groups */
    filters?: FilterGroup[];
    /** Custom actions to show on the right */
    actions?: ReactNode;
    /** Custom className */
    className?: string;
}

/**
 * TableToolbar - Toolbar with search, filters, sorting, and bulk actions
 */
export function TableToolbar({
    searchQuery = "",
    onSearchChange,
    searchPlaceholder = "Search...",
    selectedCount = 0,
    bulkActions = [],
    sortOptions = [],
    sortBy,
    sortOrder = "desc",
    onSortChange,
    filters = [],
    actions,
    className,
}: TableToolbarProps) {
    const hasFiltersOrSort = filters.length > 0 || sortOptions.length > 0;
    const hasBulkActions = selectedCount > 0 && bulkActions.length > 0;

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            {/* Search and Actions Row */}
            <div className="flex items-center justify-between gap-4">
                {/* Search */}
                {onSearchChange && (
                    <div className="flex-1 max-w-sm">
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="h-9"
                        />
                    </div>
                )}

                {/* Actions and Bulk Actions */}
                <div className="flex items-center gap-2">
                    {/* Bulk Actions (when items are selected) */}
                    {hasBulkActions && (
                        <>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {selectedCount} selected
                            </span>
                            {bulkActions.map((action, index) => {
                                const ActionIcon = action.icon;
                                return (
                                    <Button
                                        key={index}
                                        onClick={action.onClick}
                                        variant={action.variant || "outline"}
                                        size="sm"
                                        className="shrink-0"
                                    >
                                        {ActionIcon && <ActionIcon className="mr-2 size-4" />}
                                        {action.label}
                                    </Button>
                                );
                            })}
                        </>
                    )}

                    {/* Custom Actions */}
                    {actions}
                </div>
            </div>

            {/* Filters and Sort Row */}
            {hasFiltersOrSort && (
                <div className="flex flex-row items-center gap-2">
                    {/* Filters */}
                    {filters.map((filter, index) => (
                        <Select
                            key={index}
                            value={filter.value}
                            onValueChange={(value) => value && filter.onChange(value)}
                        >
                            <SelectTrigger className="h-9 w-[180px]">
                                <SelectValue placeholder={filter.label} />
                            </SelectTrigger>
                            <SelectContent>
                                {filter.options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ))}

                    {/* Sort */}
                    {sortOptions.length > 0 && onSortChange && (
                        <Select
                            value={sortBy}
                            onValueChange={(value) => value && onSortChange(value, sortOrder)}
                        >
                            <SelectTrigger className="h-9 w-[180px]">
                                <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sortOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Table Content
// ============================================================================

interface TableContentProps<TData> {
    /** TanStack Table instance */
    table: Table<TData>;
    /** Column definitions */
    columns: ColumnDef<TData>[];
    /** Loading state */
    isLoading?: boolean;
    /** Error state */
    error?: Error | null;
    /** Retry callback for errors */
    onRetry?: () => void;
    /** Empty state configuration */
    emptyState?: TableEmptyStateProps;
    /** Custom className */
    className?: string;
}

/**
 * TableContent - Main table content with loading, error, and empty states
 */
export function TableContent<TData>({
    table,
    columns,
    isLoading = false,
    error = null,
    onRetry,
    emptyState,
    className,
}: TableContentProps<TData>) {

    // Error State
    if (error) {
        return <TableErrorState message={error.message} onRetry={onRetry} />;
    }

    // Empty State
    if (table.getRowModel().rows.length === 0) {
        return <TableEmptyState {...emptyState} />;
    }

    // Data Table
    return (
        <div className={cn("flex-1 rounded-md border min-h-[400px]", className)}>
            <ShadcnTable>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </ShadcnTable>
        </div>
    );
}

// ============================================================================
// Table Pagination
// ============================================================================

interface TablePaginationProps<TData> {
    /** TanStack Table instance */
    table: Table<TData>;
    /** Custom className */
    className?: string;
}

/**
 * TablePagination - Pagination controls for table
 */
export function TablePagination<TData>({
    table,
    className,
}: TablePaginationProps<TData>) {
    return (
        <div className={cn("flex items-center justify-between px-2", className)}>
            <div className="flex-1 text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length > 0 && (
                    <>
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </>
                )}
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
