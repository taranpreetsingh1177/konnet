"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
    {
        title: "Default Template",
        href: "/dashboard/content/default-template",
    },
    {
        title: "Prompts",
        href: "/dashboard/content/prompts",
    },
];

export default function ContentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="border-b">
                <div className="flex h-12 items-center space-x-4 px-6">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center text-sm font-medium transition-colors hover:text-primary",
                                pathname.startsWith(tab.href)
                                    ? "text-primary border-b-2 border-primary h-full px-2 mt-[2px]"
                                    : "text-muted-foreground px-2"
                            )}
                        >
                            {tab.title}
                        </Link>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    );
}
