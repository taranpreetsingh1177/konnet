'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ContactsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const tabs = [
        {
            name: 'Leads',
            href: '/dashboard/leads',
            icon: Users,
            active: pathname === '/dashboard/leads'
        },
        {
            name: 'Companies',
            href: '/dashboard/companies',
            icon: Building2,
            active: pathname === '/dashboard/companies'
        }
    ]

    return (
        <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white">
                <div className="flex px-4">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                tab.active
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}
