'use client'

import React, { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { UploadCloud, FileSpreadsheet, ArrowRight, Check } from "lucide-react"
import Papa from 'papaparse'
import { createLeads, type LeadInput } from './actions'

type FieldMapping = {
    email: string
    linkedin_url: string
    name: string
    company: string
    role: string
}

type CSVUploadModalProps = {
    onSuccess?: () => void
}

export function CSVUploadModal({ onSuccess }: CSVUploadModalProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'mapping' | 'loading' | 'success'>('upload')
    const [csvData, setCsvData] = useState<string[][]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
        email: '',
        linkedin_url: '',
        name: '',
        company: '',
        role: '',
    })
    const [error, setError] = useState<string | null>(null)
    const [importedCount, setImportedCount] = useState(0)
    const [companiesCreated, setCompaniesCreated] = useState(0)

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)

        Papa.parse(file, {
            complete: (results) => {
                const data = results.data as string[][]
                if (data.length < 2) {
                    setError('CSV file must have at least a header row and one data row')
                    return
                }

                const headerRow = data[0]
                setHeaders(headerRow)
                setCsvData(data.slice(1).filter(row => row.some(cell => cell?.trim())))

                // Auto-detect common field names
                const autoMapping: FieldMapping = {
                    email: '',
                    linkedin_url: '',
                    name: '',
                    company: '',
                    role: '',
                }

                headerRow.forEach((header, index) => {
                    const lowerHeader = header.toLowerCase().trim()
                    if (lowerHeader.includes('email') || lowerHeader.includes('e-mail')) {
                        autoMapping.email = header
                    } else if (lowerHeader.includes('linkedin') || lowerHeader.includes('profile')) {
                        autoMapping.linkedin_url = header
                    } else if (lowerHeader.includes('name') && !lowerHeader.includes('company')) {
                        autoMapping.name = header
                    } else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
                        autoMapping.company = header
                    } else if (lowerHeader.includes('role') || lowerHeader.includes('title') || lowerHeader.includes('position')) {
                        autoMapping.role = header
                    }
                })

                setFieldMapping(autoMapping)
                setStep('mapping')
            },
            error: (error) => {
                setError(`Failed to parse CSV: ${error.message}`)
            }
        })
    }, [])

    const handleImport = async () => {
        if (!fieldMapping.email) {
            setError('Email field mapping is required')
            return
        }

        setStep('loading')
        setError(null)

        try {
            const emailIndex = headers.indexOf(fieldMapping.email)
            const linkedinIndex = fieldMapping.linkedin_url ? headers.indexOf(fieldMapping.linkedin_url) : -1
            const nameIndex = fieldMapping.name ? headers.indexOf(fieldMapping.name) : -1
            const companyIndex = fieldMapping.company ? headers.indexOf(fieldMapping.company) : -1
            const roleIndex = fieldMapping.role ? headers.indexOf(fieldMapping.role) : -1

            // Get custom fields (columns not mapped to standard fields)
            const mappedColumns = [
                fieldMapping.email,
                fieldMapping.linkedin_url,
                fieldMapping.name,
                fieldMapping.company,
                fieldMapping.role
            ].filter(Boolean)

            const customFieldHeaders = headers.filter(h => !mappedColumns.includes(h))

            const leads: LeadInput[] = csvData
                .filter(row => row[emailIndex]?.trim()) // Must have email
                .map(row => {
                    const customFields: Record<string, string> = {}
                    customFieldHeaders.forEach(header => {
                        const idx = headers.indexOf(header)
                        if (idx >= 0 && row[idx]?.trim()) {
                            customFields[header] = row[idx].trim()
                        }
                    })

                    return {
                        email: row[emailIndex]?.trim() || '',
                        linkedin_url: linkedinIndex >= 0 ? row[linkedinIndex]?.trim() : undefined,
                        name: nameIndex >= 0 ? row[nameIndex]?.trim() : undefined,
                        company: companyIndex >= 0 ? row[companyIndex]?.trim() : undefined,
                        role: roleIndex >= 0 ? row[roleIndex]?.trim() : undefined,
                        custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
                    }
                })

            const result = await createLeads(leads)

            if (result.success) {
                setImportedCount(result.count || 0)
                setCompaniesCreated(result.companiesCreated || 0)
                setStep('success')
                onSuccess?.()
            } else {
                setError(result.error || 'Failed to import leads')
                setStep('mapping')
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during import')
            setStep('mapping')
        }
    }

    const resetModal = () => {
        setStep('upload')
        setCsvData([])
        setHeaders([])
        setFieldMapping({
            email: '',
            linkedin_url: '',
            name: '',
            company: '',
            role: '',
        })
        setError(null)
        setImportedCount(0)
        setCompaniesCreated(0)
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            resetModal()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger>
                <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-md px-6">
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                {step === 'upload' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Upload CSV File</DialogTitle>
                            <DialogDescription>
                                Upload a CSV file containing your leads data.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-gray-400 transition-colors">
                                <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
                                <Label htmlFor="csv-upload" className="cursor-pointer text-center">
                                    <span className="text-primary font-medium">Click to upload</span>
                                    <span className="text-gray-500"> or drag and drop</span>
                                    <p className="text-xs text-gray-400 mt-1">CSV files only</p>
                                </Label>
                                <Input
                                    id="csv-upload"
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-red-500 text-center">{error}</p>
                            )}
                        </div>
                    </>
                )}

                {step === 'mapping' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Map Your Fields</DialogTitle>
                            <DialogDescription>
                                Match your CSV columns to lead fields. Found {csvData.length} rows.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-3">
                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <Label>Email *</Label>
                                    <Select
                                        value={fieldMapping.email || undefined}
                                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, email: val || '' }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {headers.map(header => (
                                                <SelectItem key={header} value={header}>{header}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <Label>Name</Label>
                                    <Select
                                        value={fieldMapping.name}
                                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, name: val || '' }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">-- None --</SelectItem>
                                            {headers.map(header => (
                                                <SelectItem key={header} value={header}>{header}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <Label>Company</Label>
                                    <Select
                                        value={fieldMapping.company}
                                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, company: val || '' }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">-- None --</SelectItem>
                                            {headers.map(header => (
                                                <SelectItem key={header} value={header}>{header}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <Label>Role / Title</Label>
                                    <Select
                                        value={fieldMapping.role}
                                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, role: val || '' }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">-- None --</SelectItem>
                                            {headers.map(header => (
                                                <SelectItem key={header} value={header}>{header}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <Label>LinkedIn URL</Label>
                                    <Select
                                        value={fieldMapping.linkedin_url}
                                        onValueChange={(val) => setFieldMapping(prev => ({ ...prev, linkedin_url: val || '' }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">-- None --</SelectItem>
                                            {headers.map(header => (
                                                <SelectItem key={header} value={header}>{header}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Back
                            </Button>
                            <Button onClick={handleImport}>
                                Import {csvData.length} Leads
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === 'loading' && (
                    <div className="py-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Importing leads and creating companies...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="py-12 text-center">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Import Successful!</h3>
                        <p className="text-gray-600 mb-2">{importedCount} leads imported</p>
                        {companiesCreated > 0 && (
                            <p className="text-sm text-gray-500 mb-6">
                                {companiesCreated} {companiesCreated === 1 ? 'company' : 'companies'} created and queued for enrichment
                            </p>
                        )}
                        <Button onClick={() => handleOpenChange(false)}>
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
