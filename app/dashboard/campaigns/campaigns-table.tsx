'use client'

import { useState, useMemo } from 'react'
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Mail, Users, Clock, CheckCircle, Loader2, Play,
    Download, Search, Trash2, MoreHorizontal,
    ChevronDown, Filter, ArrowUpDown, Plus, Calendar, AlertCircle, StopCircle
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc/client"
import { CreateCampaignModal } from "./create-campaign-modal"
import { startCampaign } from "./actions"

interface Campaign {
    id: string
    name: string
    status: string
    use_ai: boolean
    created_at: string
    scheduled_at: string | null
    campaign_accounts: Array<{
        account_id: string
        accounts: { email: string } | null
    }>
    campaign_leads: Array<{
        id: string
        status: string
        sent_at: string | null
        opened_at: string | null
    }>
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: any }> = {
    draft: { label: 'Draft', bgColor: 'bg-gray-100', textColor: 'text-gray-600', icon: Clock },
    scheduled: { label: 'Scheduled', bgColor: 'bg-blue-50', textColor: 'text-blue-600', icon: Clock },
    running: { label: 'Running', bgColor: 'bg-amber-50', textColor: 'text-amber-600', icon: Loader2 },
    completed: { label: 'Completed', bgColor: 'bg-green-50', textColor: 'text-green-600', icon: CheckCircle },
    cancelled: { label: 'Cancelled', bgColor: 'bg-red-50', textColor: 'text-red-600', icon: StopCircle },
}

type SortField = 'name' | 'status' | 'created_at'
type SortOrder = 'asc' | 'desc'

interface CampaignsTableProps {
    accounts: any[]
    companies: any[]
}

export function CampaignsTable({ accounts, companies }: CampaignsTableProps) {
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [startingCampaign, setStartingCampaign] = useState<string | null>(null)

    // Filter state
    const [filterStatus, setFilterStatus] = useState<string[]>([])
    const [filterAI, setFilterAI] = useState<boolean | null>(null)

    // Sort state
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    const { data: campaigns = [], isLoading, refetch } = trpc.campaigns.getAll.useQuery()
    const deleteMutation = trpc.campaigns.delete.useMutation({
        onSuccess: () => refetch()
    })
    const cancelMutation = trpc.campaigns.cancel.useMutation({
        onSuccess: () => refetch()
    })
    const bulkDeleteMutation = trpc.campaigns.bulkDelete.useMutation({
        onSuccess: () => {
            setSelectedRows(new Set())
            refetch()
        }
    })

    // Filter and sort campaigns
    const filteredAndSortedCampaigns = useMemo(() => {
        let result = campaigns.filter((campaign: Campaign) => {
            // Search filter
            const query = searchQuery.toLowerCase()
            const matchesSearch = campaign.name.toLowerCase().includes(query)

            if (!matchesSearch) return false

            // Status filter
            if (filterStatus.length > 0 && !filterStatus.includes(campaign.status)) {
                return false
            }

            // AI filter
            if (filterAI === true && !campaign.use_ai) return false
            if (filterAI === false && campaign.use_ai) return false

            return true
        })

        // Sort
        result.sort((a: Campaign, b: Campaign) => {
            let aVal = a[sortField] || ''
            let bVal = b[sortField] || ''

            if (sortField === 'created_at') {
                aVal = new Date(aVal).getTime().toString()
                bVal = new Date(bVal).getTime().toString()
            }

            const comparison = aVal.toString().localeCompare(bVal.toString())
            return sortOrder === 'asc' ? comparison : -comparison
        })

        return result
    }, [campaigns, searchQuery, filterStatus, filterAI, sortField, sortOrder])

    const hasActiveFilters = filterStatus.length > 0 || filterAI !== null

    const clearFilters = () => {
        setFilterStatus([])
        setFilterAI(null)
    }

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredAndSortedCampaigns.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(filteredAndSortedCampaigns.map((c: Campaign) => c.id)))
        }
    }

    const toggleSelectRow = (id: string) => {
        const newSelected = new Set(selectedRows)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedRows(newSelected)
    }

    const handleDelete = (id: string) => {
        deleteMutation.mutate({ id })
    }

    const handleCancel = (id: string) => {
        cancelMutation.mutate({ id })
    }

    const handleBulkDelete = () => {
        bulkDeleteMutation.mutate({ ids: Array.from(selectedRows) })
    }

    const handleStartCampaign = async (id: string) => {
        setStartingCampaign(id)
        await startCampaign(id)
        setStartingCampaign(null)
        refetch()
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search campaigns..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64 h-9 bg-gray-50 border-gray-200 focus:bg-white"
                        />
                    </div>

                    {/* Filter Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            type="button"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9", hasActiveFilters ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-gray-600')}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                            {hasActiveFilters && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                                    {filterStatus.length + (filterAI !== null ? 1 : 0)}
                                </span>
                            )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    Filters
                                    {hasActiveFilters && (
                                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                                            Clear all
                                        </Button>
                                    )}
                                </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />

                            {/* Status Filter */}
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">Status</DropdownMenuLabel>
                                {['draft', 'scheduled', 'running', 'completed'].map((status) => (
                                    <DropdownMenuCheckboxItem
                                        key={status}
                                        checked={filterStatus.includes(status)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setFilterStatus([...filterStatus, status])
                                            } else {
                                                setFilterStatus(filterStatus.filter(s => s !== status))
                                            }
                                        }}
                                    >
                                        {statusConfig[status]?.label || status}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            {/* AI Filter */}
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">Type</DropdownMenuLabel>
                                <DropdownMenuCheckboxItem
                                    checked={filterAI === true}
                                    onCheckedChange={(checked) => setFilterAI(checked ? true : null)}
                                >
                                    AI Generated
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={filterAI === false}
                                    onCheckedChange={(checked) => setFilterAI(checked ? false : null)}
                                >
                                    Manual Template
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 text-gray-600")}>
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            Sort
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="created_at">Date Created</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Order</DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                                <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                    {selectedRows.size > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                            className="h-9 text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete ({selectedRows.size})
                        </Button>
                    )}
                    <CreateCampaignModal accounts={accounts} companies={companies} onSuccess={() => refetch()} />
                </div>
            </div>

            {/* Spreadsheet Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-gray-200">
                            <th className="w-12 px-3 py-2.5 text-left">
                                <Checkbox
                                    checked={selectedRows.size === filteredAndSortedCampaigns.length && filteredAndSortedCampaigns.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    className="data-[state=checked]:bg-blue-500"
                                />
                            </th>
                            <th className="w-10 px-2 py-2.5 text-left text-xs font-medium text-gray-400">
                                #
                            </th>
                            <th className="min-w-[200px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Mail className="w-3.5 h-3.5" />
                                    Campaign
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </div>
                            </th>
                            <th className="min-w-[100px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Mail className="w-3.5 h-3.5" />
                                    Accounts
                                </div>
                            </th>
                            <th className="min-w-[100px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Users className="w-3.5 h-3.5" />
                                    Recipients
                                </div>
                            </th>
                            <th className="min-w-[150px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Progress
                                </div>
                            </th>
                            <th className="min-w-[120px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Status
                                </div>
                            </th>
                            <th className="min-w-[100px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Created
                                </div>
                            </th>
                            <th className="w-12 px-3 py-2.5"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="text-center py-12 text-gray-400">
                                    Loading...
                                </td>
                            </tr>
                        ) : filteredAndSortedCampaigns.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <p>No campaigns found</p>
                                        <p className="text-sm">
                                            {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first campaign to get started'}
                                        </p>
                                        {hasActiveFilters && (
                                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                                Clear filters
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredAndSortedCampaigns.map((campaign: Campaign, index: number) => {
                                const StatusIcon = statusConfig[campaign.status]?.icon || Clock
                                const sentCount = campaign.campaign_leads?.filter((l) => l.status === 'sent' || l.status === 'opened' || l.status === 'replied').length || 0
                                const totalCount = campaign.campaign_leads?.length || 0
                                const failedCount = campaign.campaign_leads?.filter((l) => l.status === 'failed').length || 0
                                const progress = totalCount > 0 ? (sentCount / totalCount) * 100 : 0

                                return (
                                    <tr
                                        key={campaign.id}
                                        className={`
                                            border-b border-gray-100 transition-colors
                                            ${selectedRows.has(campaign.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}
                                        `}
                                    >
                                        <td className="px-3 py-2">
                                            <Checkbox
                                                checked={selectedRows.has(campaign.id)}
                                                onCheckedChange={() => toggleSelectRow(campaign.id)}
                                                className="data-[state=checked]:bg-blue-500"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-400 font-mono">
                                            {index + 1}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-col">
                                                <span className="text-gray-800 font-medium">{campaign.name}</span>
                                                {campaign.use_ai && (
                                                    <span className="text-xs text-blue-500 mt-0.5">AI Generated</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-gray-600">{campaign.campaign_accounts?.length || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-gray-600">{totalCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 transition-all"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {sentCount}/{totalCount}
                                                </span>
                                                {failedCount > 0 && (
                                                    <span className="text-xs text-red-500 flex items-center gap-0.5">
                                                        <AlertCircle className="w-3 h-3" />
                                                        {failedCount}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`
                                                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                                ${statusConfig[campaign.status]?.bgColor || 'bg-gray-100'}
                                                ${statusConfig[campaign.status]?.textColor || 'text-gray-600'}
                                            `}>
                                                <StatusIcon className={`w-3 h-3 ${campaign.status === 'running' ? 'animate-spin' : ''}`} />
                                                {statusConfig[campaign.status]?.label || campaign.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500">
                                            {new Date(campaign.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-3 py-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger type="button" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 w-7 p-0")}>
                                                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    {campaign.status === 'draft' && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => handleStartCampaign(campaign.id)}
                                                                disabled={startingCampaign === campaign.id}
                                                            >
                                                                <Play className="w-4 h-4 mr-2" />
                                                                {startingCampaign === campaign.id ? 'Starting...' : 'Start'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    {/* Cancel Option for Running/Scheduled */}
                                                    {['running', 'scheduled'].includes(campaign.status) ? (
                                                        <DropdownMenuItem
                                                            onClick={() => handleCancel(campaign.id)}
                                                            className="text-red-600"
                                                        >
                                                            <StopCircle className="w-4 h-4 mr-2" />
                                                            Cancel
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        /* Delete Option for Draft/Completed/Failed/Cancelled */
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(campaign.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                <span>
                    {filteredAndSortedCampaigns.length} campaign{filteredAndSortedCampaigns.length !== 1 ? 's' : ''}
                    {hasActiveFilters && ` (filtered from ${campaigns.length})`}
                </span>
                {selectedRows.size > 0 && (
                    <span>{selectedRows.size} selected</span>
                )}
            </div>
        </div >
    )
}
