'use client'

import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    ArrowLeft, Building2, Globe, Mail, Users,
    CheckCircle, Clock, Save, Loader2, LayoutDashboard,
    Eye, EyeOff, AlertTriangle, RefreshCw, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

import { toast } from "sonner"
import { cn } from '@/lib/utils'

type ViewSection = 'template' | 'leads' | 'insights'

export default function CompanyDetailPage() {
    const params = useParams()
    const companyId = params.id as string
    const [activeTab, setActiveTab] = useState<ViewSection>('template')

    // ... (rest of the fetching and state sync)
    const { data: company, isLoading, refetch } = trpc.companies.getById.useQuery({ id: companyId })
    const updateMutation = trpc.companies.update.useMutation({
        onSuccess: () => {
            toast.success('Settings updated')
            refetch()
        },
        onError: (err) => {
            toast.error(err.message)
        }
    })

    // Local State for Template
    const [templateSubject, setTemplateSubject] = useState('')
    const [templateBody, setTemplateBody] = useState('')

    // Sync state when data loads
    useEffect(() => {
        if (company) {
            setTemplateSubject(company.email_subject || '')
            setTemplateBody(company.email_template || '')
        }
    }, [company])


    const handleSaveTemplate = () => {
        updateMutation.mutate({
            id: companyId,
            email_subject: templateSubject,
            email_template: templateBody
        })
    }

    const handleRetryEnrichment = async () => {
        try {
            toast.info("Retrying enrichment...")

            // First, mark as processing optimistically
            await fetch('/api/trpc/companies.update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    json: {
                        id: companyId,
                        enrichment_status: 'pending',
                        enrichment_error: null
                    }
                })
            })

            const response = await fetch('/api/inngest/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'company/enrich',
                    data: { companyId }
                })
            })

            if (response.ok) {
                toast.success("Enrichment triggered!")
                refetch()
            } else {
                // Inngest server not responding properly
                toast.error("Enrichment server not responding. Please try again later.")
                // Mark as failed
                updateMutation.mutate({
                    id: companyId,
                    enrichment_status: 'failed',
                    enrichment_error: 'Enrichment server not responding'
                })
            }
        } catch (error) {
            // Network error - Inngest server likely not running
            toast.error("Cannot connect to enrichment server. Is Inngest running?")
            updateMutation.mutate({
                id: companyId,
                enrichment_status: 'failed',
                enrichment_error: 'Cannot connect to enrichment server'
            })
        }
    }

    // Check for stale processing state (> 5 minutes)
    const isStaleProcessing = () => {
        if (company?.enrichment_status !== 'processing') return false
        if (!company?.enrichment_started_at) return false
        const startedAt = new Date(company.enrichment_started_at)
        const now = new Date()
        const diffMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60)
        return diffMinutes > 5
    }

    // Get first lead for preview
    const previewLead = company?.leads?.[0] as any | undefined

    // Replace template variables with actual lead data for preview
    const replaceVarsForPreview = (template: string) => {
        if (!template || !previewLead) return template
        let result = template
        const vars: Record<string, string> = {
            name: previewLead.name || 'John Doe',
            email: previewLead.email || 'john@example.com',
            role: previewLead.role || 'Manager',
            company_name: company?.name || 'Company'
        }
        for (const [key, value] of Object.entries(vars)) {
            // Replace {{key}} and {key}
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value)
            result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value)
        }
        return result
    }

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!company) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Company not found</p>
                <Link href="/dashboard/leads" className="text-blue-500 hover:underline mt-2 inline-block">
                    Return to Companies
                </Link>
            </div>
        )
    }

    const leadsCount = company.leads?.length || 0;

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/leads" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                            {company.logo_url ? (
                                <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
                            ) : (
                                <Building2 className="w-5 h-5 text-gray-400" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-gray-900 leading-tight tracking-tight">{company.name}</h1>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                <Globe className="w-3 h-3" />
                                <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                                    {company.domain}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {company.enrichment_status === 'failed' || isStaleProcessing() ? (
                        <>
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border",
                                isStaleProcessing()
                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                    : "bg-red-50 text-red-700 border-red-100"
                            )}>
                                <AlertTriangle className="w-3 h-3" />
                                {isStaleProcessing() ? 'Stuck' : 'Failed'}
                            </span>
                            {company.enrichment_error && (
                                <span className="text-[10px] text-gray-400 max-w-[200px] truncate" title={company.enrichment_error}>
                                    {company.enrichment_error}
                                </span>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-7 gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                                    isStaleProcessing()
                                        ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100"
                                        : "bg-red-50 hover:bg-red-100 text-red-700 border-red-100"
                                )}
                                onClick={handleRetryEnrichment}
                            >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                            </Button>
                        </>
                    ) : (
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase",
                            company.enrichment_status === 'completed' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        )}>
                            {company.enrichment_status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {company.enrichment_status === 'completed' ? 'Enriched' : 'Processing'}
                        </span>
                    )}
                </div>
            </div>

            {/* Sub-Navbar */}
            <div className="bg-white border-b border-gray-100 px-4 flex items-center gap-1 shrink-0 h-11">
                <button
                    onClick={() => setActiveTab('template')}
                    className={cn(
                        "h-full flex items-center gap-2 text-xs font-bold px-5 border-b-2 transition-all relative top-[1px]",
                        activeTab === 'template' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Mail className="w-4 h-4" />
                    Template Editor
                </button>
                <button
                    onClick={() => setActiveTab('leads')}
                    className={cn(
                        "h-full flex items-center gap-2 text-xs font-bold px-5 border-b-2 transition-all relative top-[1px]",
                        activeTab === 'leads' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Users className="w-4 h-4" />
                    Associated Leads
                    <span className={cn(
                        "ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]",
                        activeTab === 'leads' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                    )}>{leadsCount}</span>
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={cn(
                        "h-full flex items-center gap-2 text-xs font-bold px-5 border-b-2 transition-all relative top-[1px]",
                        activeTab === 'insights' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Insights
                </button>
            </div>

            {/* Content Area - Edge-to-Edge */}
            <div className="flex-1 overflow-hidden">

                {/* Template View */}
                {activeTab === 'template' && (
                    <div className="h-full flex flex-col animate-in fade-in duration-300">
                        {/* Action Bar */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 bg-white shrink-0">
                            <div className="space-y-0.5">
                                <h2 className="text-sm font-bold text-gray-900 tracking-tight">Email Template</h2>
                                <p className="text-[11px] text-gray-400 font-medium">AI-generated personalized template for {company.name}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-2 text-[10px] font-bold uppercase tracking-wider text-purple-600 hover:bg-purple-50"
                                    onClick={handleRetryEnrichment}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Regenerate
                                </Button>
                                <Button
                                    onClick={handleSaveTemplate}
                                    disabled={updateMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-xs font-bold h-9 px-6 shadow-sm shadow-blue-100"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                                    Save Template
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
                            <div className="space-y-2 shrink-0">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Subject Line</Label>
                                <Input
                                    value={templateSubject}
                                    onChange={(e) => setTemplateSubject(e.target.value)}
                                    placeholder={`Quick question for ${company.name}...`}
                                    className="h-11 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-50/50 bg-gray-50/30 font-medium"
                                />
                            </div>

                            <div className="flex-1 flex flex-col min-h-0 space-y-2">
                                <div className="flex items-center justify-between pl-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Preview</Label>
                                    {previewLead && (
                                        <span className="text-[10px] text-blue-500 font-bold tracking-tight flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                            Previewing as: {previewLead.name || previewLead.email}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 min-h-0 border border-gray-100 rounded-xl overflow-auto bg-gray-50/30 p-8 flex justify-center">
                                    <div className="bg-white w-full max-w-[600px] shadow-xl shadow-gray-200/50 rounded-lg border border-gray-100 flex flex-col min-h-full h-fit">
                                        {/* HTML Email Preview */}
                                        <div className="p-10" dangerouslySetInnerHTML={{ __html: replaceVarsForPreview(templateBody) }} />
                                        <div className="mt-auto p-6 border-t border-gray-50 bg-gray-50/50 text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                                            Sent via Konnet Outreach
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leads View */}
                {activeTab === 'leads' && (
                    <div className="h-full flex flex-col animate-in fade-in duration-300 bg-white">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between shrink-0">
                            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Verified Contacts</h2>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/50 border-b sticky top-0 z-10 transition-all">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px]">Name</th>
                                        <th className="px-6 py-3 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px]">Email</th>
                                        <th className="px-6 py-3 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px]">Position</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-medium">
                                    {/* @ts-ignore */}
                                    {company.leads?.map((lead: any) => (
                                        <tr key={lead.id} className="hover:bg-blue-50/20 transition-all group">
                                            <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-[11px] tracking-tight">{lead.name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-gray-500 text-xs tracking-tight">{lead.email}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                    {lead.role || 'Primary Contact'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Insights View */}
                {activeTab === 'insights' && (
                    <div className="h-full flex flex-col p-6 gap-8 animate-in fade-in duration-300 bg-white overflow-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 transition-all hover:bg-white group cursor-default">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Users className="w-5 h-5 text-blue-600 group-hover:text-white" />
                                    </div>
                                </div>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Reach</h3>
                                <div className="text-3xl font-black text-gray-900 leading-none">{leadsCount}</div>
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">Verified decision makers</p>
                            </div>

                            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 transition-all hover:bg-white group cursor-default">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-purple-50 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all">
                                        <Mail className="w-5 h-5 text-purple-600 group-hover:text-white" />
                                    </div>
                                </div>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sent Emails</h3>
                                <div className="text-3xl font-black text-gray-900 leading-none">0</div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col p-12 bg-gray-50/30 rounded-3xl border border-dashed border-gray-200 items-center justify-center text-center gap-4 group">
                            <div className="p-4 bg-white rounded-full border border-gray-100 group-hover:scale-110 transition-all">
                                <LayoutDashboard className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Advanced Metrics</h3>
                                <p className="text-xs text-gray-500 font-medium max-w-sm leading-relaxed lowercase">
                                    Real-time analytics for {company.name} will appear here after the first campaign blast.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
