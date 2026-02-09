"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Mail,
  Settings,
  Key,
  LogOut,
  Building2,
  FileText,
} from "lucide-react";

import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  matches?: string[];
}

const navItems: NavItem[] = [
  {
    name: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    name: "Companies",
    href: "/dashboard/companies",
    icon: Building2,
  },
  {
    name: "Credentials",
    href: "/dashboard/credentials",
    icon: Key,
  },
  {
    name: "Campaigns",
    href: "/dashboard/campaigns",
    icon: Mail,
  },
  {
    name: "Content",
    href: "/dashboard/content/default-template",
    icon: FileText,
    matches: ["/dashboard/content"],
  },
];

const bottomNavItems: NavItem[] = [
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <ShadcnSidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6">
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground">
          Konnet
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-y-2">
              {navItems.map((item) => {
                const isActive = item.matches
                  ? item.matches.some((m) => pathname.startsWith(m))
                  : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className="flex gap-x-4 h-10 px-4 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-600"
                      tooltip={item.name}
                      render={
                        <Link href={item.href} prefetch={true}>
                          <item.icon />
                          <span>{item.name}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  isActive={isActive}
                  className="flex gap-x-4 h-10 px-4 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-600"
                  tooltip={item.name}
                  render={
                    <Link href={item.href} prefetch={true}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 data-[active=true]:bg-red-50 data-[active=true]:text-red-700"
              tooltip="Log Out"
            >
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
