'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Mail, Settings, Key, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    {
        name: 'Leads',
        href: '/dashboard/leads',
        icon: Users,
    },
    {
        name: 'Credentials',
        href: '/dashboard/credentials',
        icon: Key,
    },
    {
        name: 'Campaigns',
        href: '/dashboard/campaigns',
        icon: Mail,
    },
]

const bottomNavItems = [
    {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
    },
]

interface SidebarProps {
    onLogout: () => void
}

export function Sidebar({ onLogout }: SidebarProps) {
    const pathname = usePathname()

    return (
        <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="px-4 py-5 border-b border-gray-50">
                <h1 className="font-bold text-gray-900 text-xl tracking-tight">Konnet</h1>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-3 py-2">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                                    isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-4 h-4",
                                    isActive ? "text-blue-500" : "text-gray-400"
                                )} />
                                {item.name}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="px-3 py-4 border-t border-gray-100">
                <div className="space-y-1">
                    {bottomNavItems.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                                    isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-4 h-4",
                                    isActive ? "text-blue-500" : "text-gray-400"
                                )} />
                                {item.name}
                            </Link>
                        )
                    })}

                    <button
                        onClick={onLogout}
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-150"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </div>
        </aside>
    )
}
