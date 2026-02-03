'use client'

import { useState } from 'react'
import { LeadsTable } from "./leads-table"
import { CompaniesTable } from "./companies-table"
import { Building2, Users } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type Tab = 'leads' | 'companies'

export default function LeadsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('leads')
    const [selectedCompany, setSelectedCompany] = useState<any>(null)

    return (
        <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white">
                <div className="flex px-4">
                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`
                            flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                            ${activeTab === 'leads'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Users className="w-4 h-4" />
                        Leads
                    </button>
                    <button
                        onClick={() => setActiveTab('companies')}
                        className={`
                            flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                            ${activeTab === 'companies'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Building2 className="w-4 h-4" />
                        Companies
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'leads' && <LeadsTable />}
                {activeTab === 'companies' && <CompaniesTable onViewTemplate={setSelectedCompany} />}
            </div>

            {/* Email Template Modal */}
            <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedCompany?.logo_url && (
                                <img
                                    src={selectedCompany.logo_url}
                                    alt={selectedCompany.name}
                                    className="w-8 h-8 object-contain rounded"
                                />
                            )}
                            {selectedCompany?.name} - Email Template
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Domain</label>
                            <p className="text-sm text-gray-600">{selectedCompany?.domain}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Email Template</label>
                            <div
                                className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200"
                                dangerouslySetInnerHTML={{ __html: selectedCompany?.email_template || '' }}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
