"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  UsersIcon,
  Building2Icon,
  KeyIcon,
  MailIcon,
  FileTextIcon,
  HomeIcon,
  GlobeIcon,
} from "lucide-react";


import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  matches?: string[];
}

const navItems: NavGroup[] = [
  {
    group: "",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard/home",
        icon: HomeIcon,
      },
      {
        name: "Prompts",
        href: "/dashboard/prompts",
        icon: FileTextIcon,
      },
    ]
  },
  {
    group: "Contacts",
    items: [
      {
        name: "Leads",
        href: "/dashboard/leads",
        icon: UsersIcon,
      },
      {
        name: "Companies",
        href: "/dashboard/companies",
        icon: Building2Icon,
      },
    ]
  },
  {
    group: 'Campaigns',
    items: [
      {
        name: "Campaigns",
        href: "/dashboard/campaigns",
        icon: MailIcon,
      },
      {
        name: "Credentials",
        href: "/dashboard/credentials",
        icon: KeyIcon,
      },
    ]
  }
];

function SidebarNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.matches
    ? item.matches.some((m) => pathname.startsWith(m))
    : pathname.startsWith(item.href);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        className=""
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
}

function SidebarGroupItem({ group }: { group: NavGroup }) {
  return (
    <SidebarGroup>
      {
        group.group !== "" && (
          <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
        )
      }
      <SidebarGroupContent>
        <SidebarMenu className="">
          {group.items.map((item) => (
            <SidebarNavItem key={item.name} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface SidebarProps {
  // Empty for now
}

export function Sidebar({ }: SidebarProps) {
  return (
    <ShadcnSidebar>
      <SidebarHeader className="border-sidebar-border">
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground">
          Konnet
        </span>
      </SidebarHeader>

      <SidebarContent>
        {navItems.map((group) => (
          <SidebarGroupItem key={group.group} group={group} />
        ))}
      </SidebarContent>
    </ShadcnSidebar>
  );
}


