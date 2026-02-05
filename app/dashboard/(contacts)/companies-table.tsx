'use client'

import { useState } from 'react'
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Building2, Search, Trash2, MoreHorizontal, Globe,
    Mail, Loader2, CheckCircle, XCircle, Clock, Eye
} from "lucide-react"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc/client"

interface Company {
    id: string
    domain: string
    name: string
    logo_url: string | null
    email_template: string | null
    enrichment_status: 'pending' | 'processing' | 'completed' | 'failed'
    created_at: string
    leads?: { count: number }[]
}

const statusConfig = {
    pending: { label: 'Pending', bgColor: 'bg-gray-100', textColor: 'text-gray-600', icon: Clock },
    processing: { label: 'Processing', bgColor: 'bg-blue-50', textColor: 'text-blue-600', icon: Loader2 },
    completed: { label: 'Completed', bgColor: 'bg-green-50', textColor: 'text-green-600', icon: CheckCircle },
    failed: { label: 'Failed', bgColor: 'bg-red-50', textColor: 'text-red-600', icon: XCircle },
}

interface CompaniesTableProps {
    onViewTemplate?: (company: Company) => void
}

export function CompaniesTable({ onViewTemplate }: CompaniesTableProps) {
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    const { data: companies = [], isLoading, refetch } = trpc.companies.getAll.useQuery()
    const deleteMutation = trpc.companies.delete.useMutation({
        onSuccess: () => refetch()
    })
    const bulkDeleteMutation = trpc.companies.bulkDelete.useMutation({
        onSuccess: () => {
            setSelectedRows(new Set())
            refetch()
        }
    })

    const retryMutation = trpc.companies.retryFailedEnrichment.useMutation({
        onSuccess: (data) => {
            alert(`Retrying enrichment for ${data.count} companies`)
            refetch()
        },
        onError: (error) => {
            alert(`Failed to retry: ${error.message}`)
        }
    })

    const filteredCompanies = companies.filter((company: Company) => {
        const query = searchQuery.toLowerCase()
        return company.name.toLowerCase().includes(query) ||
            company.domain.toLowerCase().includes(query)
    })

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredCompanies.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(filteredCompanies.map((c: Company) => c.id)))
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
        if (confirm('Delete this company? Associated leads will remain but won\'t have a linked company.')) {
            deleteMutation.mutate({ id })
        }
    }

    const handleBulkDelete = () => {
        if (confirm(`Delete ${selectedRows.size} companies?`)) {
            bulkDeleteMutation.mutate({ ids: Array.from(selectedRows) })
        }
    }

    const getLeadsCount = (company: Company) => {
        return company.leads?.[0]?.count || 0
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64 h-9 bg-gray-50 border-gray-200 focus:bg-white"
                        />
                    </div>
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
                    {companies.some((c: Company) => c.enrichment_status === 'failed') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryMutation.mutate()}
                            disabled={retryMutation.isPending}
                            className="h-9 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <Clock className={`w-4 h-4 mr-2 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                            Retry Failed Analysis
                        </Button>
                    )}
                </div>
            </div>

            {/* Spreadsheet Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-gray-200">
                            <th className="w-12 px-3 py-2.5 text-left">
                                <Checkbox
                                    checked={selectedRows.size === filteredCompanies.length && filteredCompanies.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    className="data-[state=checked]:bg-blue-500"
                                />
                            </th>
                            <th className="w-10 px-2 py-2.5 text-left text-xs font-medium text-gray-400">
                                #
                            </th>
                            <th className="w-16 px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Logo
                                </div>
                            </th>
                            <th className="min-w-[200px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Building2 className="w-3.5 h-3.5" />
                                    Company
                                </div>
                            </th>
                            <th className="min-w-[180px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Globe className="w-3.5 h-3.5" />
                                    Domain
                                </div>
                            </th>
                            <th className="min-w-[120px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Status
                                </div>
                            </th>
                            <th className="min-w-[100px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Mail className="w-3.5 h-3.5" />
                                    Leads
                                </div>
                            </th>
                            <th className="min-w-[150px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Email Template
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
                        ) : filteredCompanies.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <p>No companies yet</p>
                                        <p className="text-sm">
                                            Upload leads with company information to get started
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredCompanies.map((company: Company, index: number) => {
                                const StatusIcon = statusConfig[company.enrichment_status]?.icon || Clock

                                return (
                                    <tr
                                        key={company.id}
                                        className={`
                                            border-b border-gray-100 transition-colors
                                            ${selectedRows.has(company.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}
                                        `}
                                    >
                                        <td className="px-3 py-2">
                                            <Checkbox
                                                checked={selectedRows.has(company.id)}
                                                onCheckedChange={() => toggleSelectRow(company.id)}
                                                className="data-[state=checked]:bg-blue-500"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-400 font-mono">
                                            {index + 1}
                                        </td>
                                        <td className="px-3 py-2">
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
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-gray-800 font-medium">{company.name}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-gray-600">{company.domain}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`
                                                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                                ${statusConfig[company.enrichment_status]?.bgColor || 'bg-gray-100'}
                                                ${statusConfig[company.enrichment_status]?.textColor || 'text-gray-600'}
                                            `}>
                                                <StatusIcon className={`w-3 h-3 ${company.enrichment_status === 'processing' ? 'animate-spin' : ''}`} />
                                                {statusConfig[company.enrichment_status]?.label || company.enrichment_status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                            {getLeadsCount(company)}
                                        </td>
                                        <td className="px-3 py-2">
                                            {company.email_template ? (
                                                <Link
                                                    href={`/dashboard/companies/${company.id}`}
                                                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50")}
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                    View
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/dashboard/companies/${company.id}`}
                                                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-gray-500 hover:text-gray-700")}
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                    Open
                                                </Link>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger type="button" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 w-7 p-0")}>
                                                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem>
                                                        <Link href={`/dashboard/companies/${company.id}`}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(company.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
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
                    {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'}
                </span>
                {selectedRows.size > 0 && (
                    <span>{selectedRows.size} selected</span>
                )}
            </div>
        </div>
    )
}
