'use client'

import { useState } from 'react'
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Mail, Key, Calendar, CheckCircle2,
    Trash2, MoreHorizontal, Plus
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc/client"
import Link from "next/link"

interface Account {
    id: string
    email: string
    created_at: string
    provider: string
}

export function CredentialsTable() {
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

    const { data: accounts = [], isLoading, refetch } = trpc.credentials.getAll.useQuery()
    const deleteMutation = trpc.credentials.delete.useMutation({
        onSuccess: () => refetch()
    })
    const bulkDeleteMutation = trpc.credentials.bulkDelete.useMutation({
        onSuccess: () => {
            setSelectedRows(new Set())
            refetch()
        }
    })

    const toggleSelectAll = () => {
        if (selectedRows.size === accounts.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(accounts.map((a: Account) => a.id)))
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

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Connected Gmail Accounts</span>
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
                            Disconnect ({selectedRows.size})
                        </Button>
                    )}
                    <Link href="/api/google/connect">
                        <Button size="sm" className="h-9 bg-blue-500 hover:bg-blue-600">
                            <Plus className="w-4 h-4 mr-2" />
                            Connect Account
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Spreadsheet Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-gray-200">
                            <th className="w-12 px-3 py-2.5 text-left">
                                <Checkbox
                                    checked={selectedRows.size === accounts.length && accounts.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    className="data-[state=checked]:bg-blue-500"
                                />
                            </th>
                            <th className="w-10 px-2 py-2.5 text-left text-xs font-medium text-gray-400">
                                #
                            </th>
                            <th className="min-w-[300px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Mail className="w-3.5 h-3.5" />
                                    Email Address
                                </div>
                            </th>
                            <th className="min-w-[120px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Key className="w-3.5 h-3.5" />
                                    Provider
                                </div>
                            </th>
                            <th className="min-w-[120px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Status
                                </div>
                            </th>
                            <th className="min-w-[140px] px-3 py-2.5 text-left">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Connected
                                </div>
                            </th>
                            <th className="w-12 px-3 py-2.5"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-400">
                                    Loading...
                                </td>
                            </tr>
                        ) : accounts.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <p>No accounts connected</p>
                                        <p className="text-sm">Connect a Gmail account to start sending campaigns</p>
                                        <Link href="/api/google/connect">
                                            <Button size="sm" className="mt-2 bg-blue-500 hover:bg-blue-600">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Connect Account
                                            </Button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            accounts.map((account: Account, index: number) => (
                                <tr
                                    key={account.id}
                                    className={`
                                        border-b border-gray-100 transition-colors
                                        ${selectedRows.has(account.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}
                                    `}
                                >
                                    <td className="px-3 py-3">
                                        <Checkbox
                                            checked={selectedRows.has(account.id)}
                                            onCheckedChange={() => toggleSelectRow(account.id)}
                                            className="data-[state=checked]:bg-blue-500"
                                        />
                                    </td>
                                    <td className="px-2 py-3 text-xs text-gray-400 font-mono">
                                        {index + 1}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-medium text-sm">
                                                {account.email.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-gray-800 font-medium">{account.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                                            <img src="/logos/gmail.svg" alt="Gmail" className="w-4 h-4" />
                                            Gmail
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Connected
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-sm text-gray-500">
                                        {new Date(account.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-3 py-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger type="button" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 w-7 p-0")}>
                                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(account.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Disconnect
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
                <span>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
                {selectedRows.size > 0 && (
                    <span>{selectedRows.size} selected</span>
                )}
            </div>
        </div>
    )
}
