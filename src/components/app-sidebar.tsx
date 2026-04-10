"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  ClipboardListIcon,
  DatabaseIcon,
  HexagonIcon,
  LayoutDashboardIcon,
  PalmtreeIcon,
  SettingsIcon,
  TimerIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: "main" | "admin";
};

const NAV: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon, group: "main" },
  { title: "Marcajes", href: "/punches", icon: TimerIcon, group: "main" },
  { title: "Vacaciones", href: "/vacations", icon: PalmtreeIcon, group: "main" },
  { title: "Permisos", href: "/permits", icon: ClipboardListIcon, group: "main" },
  { title: "Reportes", href: "/reports", icon: BarChart3Icon, group: "main" },
  { title: "Nómina", href: "/payroll", icon: WalletIcon, group: "main" },
  { title: "Empleados", href: "/employees", icon: UsersIcon, group: "main" },
  { title: "Datos crudos", href: "/raw", icon: DatabaseIcon, group: "admin" },
  { title: "Reglas", href: "/rules", icon: SettingsIcon, group: "admin" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg border bg-background">
            <HexagonIcon className="size-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">RRHH</span>
            <span className="text-xs text-muted-foreground">
              LaCasaDelPlastico
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {(["main", "admin"] as const).map((groupId) => {
          const items = NAV.filter((n) => n.group === groupId);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={groupId}>
              <SidebarGroupLabel>
                {groupId === "main" ? "Navegación" : "Administración"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={active}
                          tooltip={item.title}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
