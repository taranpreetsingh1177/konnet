'use client'

import { useState, useMemo } from 'react'
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Mail, Building2, User, Tag, Briefcase, Linkedin,
    Download, Search, Trash2, MoreHorizontal, Pencil,
    ChevronDown, Filter, ArrowUpDown, Check, X
} from "lucide-react"
import { CSVUploadModal } from "./csv-upload-modal"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"

interface Lead {
    id: string
    email: string
    name: string | null
    company_id: string | null
    companies?: {
        id: string
        name: string
        domain: string
        logo_url: string | null
    } | null
    role: string | null
    linkedin_url: string | null
    created_at: string
    lead_tags: Array<{
        tag_id: string
        tags: {
            id: string
            name: string
            color: string
        } | null
    }>
}

type SortField = 'email' | 'name' | 'role' | 'created_at'
type SortOrder = 'asc' | 'desc'

export function LeadsTable() {
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [editingLead, setEditingLead] = useState<Lead | null>(null)
    const [editForm, setEditForm] = useState({
        name: '',
        role: '',
        linkedin_url: '',
    })

    // Filter state
    const [filterCompany, setFilterCompany] = useState<string[]>([])
    const [filterHasLinkedIn, setFilterHasLinkedIn] = useState<boolean | null>(null)

    // Sort state
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    // tRPC queries and mutations
    const { data: leads = [], isLoading, refetch } = trpc.leads.getAll.useQuery()
    const deleteMutation = trpc.leads.delete.useMutation({
        onSuccess: () => refetch()
    })
    const bulkDeleteMutation = trpc.leads.bulkDelete.useMutation({
        onSuccess: () => {
            setSelectedRows(new Set())
            refetch()
        }
    })
    const updateMutation = trpc.leads.update.useMutation({
        onSuccess: () => {
            setEditingLead(null)
            refetch()
        }
    })

    // Get unique companies for filter
    const uniqueCompanies = useMemo(() => {
        const companies = leads
            .map((l: Lead) => l.companies?.name)
            .filter((c): c is string => c !== null && c !== '')
        return [...new Set(companies)].sort()
    }, [leads])

    // Filter and sort leads
    const filteredAndSortedLeads = useMemo(() => {
        let result = leads.filter((lead: Lead) => {
            // Search filter
            const query = searchQuery.toLowerCase()
            const matchesSearch =
                lead.email.toLowerCase().includes(query) ||
                (lead.name?.toLowerCase() || '').includes(query) ||
                (lead.companies?.name?.toLowerCase() || '').includes(query) ||
                (lead.role?.toLowerCase() || '').includes(query)

            if (!matchesSearch) return false

            // Company filter
            if (filterCompany.length > 0 && !filterCompany.includes(lead.companies?.name || '')) {
                return false
            }

            // LinkedIn filter
            if (filterHasLinkedIn === true && !lead.linkedin_url) return false
            if (filterHasLinkedIn === false && lead.linkedin_url) return false

            return true
        })

        // Sort
        result.sort((a: Lead, b: Lead) => {
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
    }, [leads, searchQuery, filterCompany, filterHasLinkedIn, sortField, sortOrder])

    const hasActiveFilters = filterCompany.length > 0 || filterHasLinkedIn !== null

    const clearFilters = () => {
        setFilterCompany([])
        setFilterHasLinkedIn(null)
    }

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredAndSortedLeads.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(filteredAndSortedLeads.map((l: Lead) => l.id)))
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

    const handleBulkDelete = () => {
        bulkDeleteMutation.mutate({ ids: Array.from(selectedRows) })
    }

    const openEditModal = (lead: Lead) => {
        setEditingLead(lead)
        setEditForm({
            name: lead.name || '',
            role: lead.role || '',
            linkedin_url: lead.linkedin_url || '',
        })
    }

    const handleSaveEdit = () => {
        if (editingLead) {
            updateMutation.mutate({
                id: editingLead.id,
                name: editForm.name || null,
                role: editForm.role || null,
                linkedin_url: editForm.linkedin_url || null,
            })
        }
    }

    const exportToCSV = () => {
        const headers = ['Email', 'Name', 'Company', 'Role', 'LinkedIn']
        const rows = filteredAndSortedLeads.map((lead: Lead) => [
            lead.email,
            lead.name || '',
            lead.companies?.name || '',
            lead.role || '',
            lead.linkedin_url || ''
        ])
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'leads.csv'
        a.click()
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search leads..."
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
                                    {filterCompany.length + (filterHasLinkedIn !== null ? 1 : 0)}
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

                            {/* Company Filter */}
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">Company</DropdownMenuLabel>
                                {uniqueCompanies.slice(0, 5).map((company) => (
                                    <DropdownMenuCheckboxItem
                                        key={company}
                                        checked={filterCompany.includes(company)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setFilterCompany([...filterCompany, company])
                                            } else {
                                                setFilterCompany(filterCompany.filter(c => c !== company))
                                            }
                                        }}
                                    >
                                        {company}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            {/* LinkedIn Filter */}
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">LinkedIn</DropdownMenuLabel>
                                <DropdownMenuCheckboxItem
                                    checked={filterHasLinkedIn === true}
                                    onCheckedChange={(checked) => setFilterHasLinkedIn(checked ? true : null)}
                                >
                                    Has LinkedIn
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={filterHasLinkedIn === false}
                                    onCheckedChange={(checked) => setFilterHasLinkedIn(checked ? false : null)}
                                >
                                    No LinkedIn
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
                                <DropdownMenuRadioItem value="email">Email</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="company">Company</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="role">Role</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="created_at">Date Added</DropdownMenuRadioItem>
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
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <CSVUploadModal onSuccess={() => refetch()} />
                </div>
            </div>

            {/* Spreadsheet Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-gray-200">
                            <th className="w-12 px-3 py-2.5 text-left">
                                <Checkbox
                                    checked={selectedRows.size === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    className="data-[state=checked]:bg-blue-500"
                                />
                            </th>
                            <th className="w-10 px-2 py-2.5 text-left text-xs font-medium text-gray-400">
                                #
                            </th>
                            <th className="min-w-[220px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Mail className="w-3.5 h-3.5" />
                                    Email
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </div>
                            </th>
                            <th className="min-w-[150px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <User className="w-3.5 h-3.5" />
                                    Name
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </div>
                            </th>
                            <th className="min-w-[150px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Building2 className="w-3.5 h-3.5" />
                                    Company
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </div>
                            </th>
                            <th className="min-w-[130px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    Role
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </div>
                            </th>
                            <th className="min-w-[120px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Tag className="w-3.5 h-3.5" />
                                    Tags
                                </div>
                            </th>
                            <th className="w-12 px-3 py-2.5"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-12 text-gray-400">
                                    Loading...
                                </td>
                            </tr>
                        ) : filteredAndSortedLeads.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <p>No leads found</p>
                                        <p className="text-sm">
                                            {hasActiveFilters ? 'Try adjusting your filters' : 'Upload a CSV to get started'}
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
                            filteredAndSortedLeads.map((lead: Lead, index: number) => (
                                <tr
                                    key={lead.id}
                                    className={`
                                        border-b border-gray-100 transition-colors
                                        ${selectedRows.has(lead.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}
                                    `}
                                >
                                    <td className="px-3 py-2">
                                        <Checkbox
                                            checked={selectedRows.has(lead.id)}
                                            onCheckedChange={() => toggleSelectRow(lead.id)}
                                            className="data-[state=checked]:bg-blue-500"
                                        />
                                    </td>
                                    <td className="px-2 py-2 text-xs text-gray-400 font-mono">
                                        {index + 1}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-800 font-medium">{lead.email}</span>
                                            {lead.linkedin_url && (
                                                <a
                                                    href={lead.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:text-blue-600"
                                                >
                                                    <Linkedin className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={lead.name ? 'text-gray-700' : 'text-gray-300'}>
                                            {lead.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        {lead.companies?.name ? (
                                            <div className="flex items-center gap-2">
                                                {lead.companies.logo_url && (
                                                    <img
                                                        src={lead.companies.logo_url}
                                                        alt={lead.companies.name}
                                                        className="w-5 h-5 object-contain rounded"
                                                    />
                                                )}
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: `hsl(${(lead.companies.name.charCodeAt(0) * 15) % 360}, 85%, 93%)`,
                                                        color: `hsl(${(lead.companies.name.charCodeAt(0) * 15) % 360}, 70%, 35%)`
                                                    }}
                                                >
                                                    {lead.companies.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={lead.role ? 'text-gray-600 text-xs' : 'text-gray-300'}>
                                            {lead.role || '—'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1 flex-wrap">
                                            {lead.lead_tags?.map((lt) => (
                                                <span
                                                    key={lt.tag_id}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                                    style={{
                                                        backgroundColor: (lt.tags?.color || '#6b7280') + '20',
                                                        color: lt.tags?.color || '#6b7280'
                                                    }}
                                                >
                                                    {lt.tags?.name}
                                                </span>
                                            ))}
                                            {(!lead.lead_tags || lead.lead_tags.length === 0) && (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger type="button" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 w-7 p-0")}>
                                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => openEditModal(lead)}>
                                                    <Pencil className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(lead.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                <span>
                    {filteredAndSortedLeads.length} lead{filteredAndSortedLeads.length !== 1 ? 's' : ''}
                    {hasActiveFilters && ` (filtered from ${leads.length})`}
                </span>
                {selectedRows.size > 0 && (
                    <span>{selectedRows.size} selected</span>
                )}
            </div>

            {/* Edit Lead Modal */}
            <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Lead</DialogTitle>
                        <DialogDescription>
                            Update the lead information below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                value={editingLead?.email || ''}
                                disabled
                                className="bg-gray-50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Input
                                id="edit-role"
                                value={editForm.role}
                                onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                                placeholder="Software Engineer"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-linkedin">LinkedIn URL</Label>
                            <Input
                                id="edit-linkedin"
                                value={editForm.linkedin_url}
                                onChange={(e) => setEditForm(f => ({ ...f, linkedin_url: e.target.value }))}
                                placeholder="https://linkedin.com/in/johndoe"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingLead(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
