'use client'

import { useState } from 'react'
import { CompaniesTable } from "../companies-table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function CompaniesPage() {
    const [selectedCompany, setSelectedCompany] = useState<any>(null)

    return (
        <>
            <CompaniesTable onViewTemplate={setSelectedCompany} />

            {/* Email Template Modal - Moved from old page.tsx */}
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
        </>
    )
}
