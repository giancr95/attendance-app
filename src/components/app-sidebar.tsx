"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileTextIcon,
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
import type { Role } from "@/generated/prisma/client";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: "main" | "admin";
  // Hidden from EMPLOYEE-role users. Anything that shows other people's
  // data (marcajes, nómina, reportes, calendario, empleados…) is admin-only.
  adminOnly?: boolean;
  // Title shown to employees, when it should read as "mine".
  employeeTitle?: string;
};

const NAV: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon, group: "main", employeeTitle: "Inicio" },
  { title: "Marcajes", href: "/punches", icon: TimerIcon, group: "main", adminOnly: true },
  { title: "Calendario", href: "/calendario", icon: CalendarDaysIcon, group: "main", adminOnly: true },
  { title: "Vacaciones", href: "/vacations", icon: PalmtreeIcon, group: "main", employeeTitle: "Mis vacaciones" },
  { title: "Permisos", href: "/permits", icon: ClipboardListIcon, group: "main", employeeTitle: "Mis permisos" },
  { title: "Reportes", href: "/reports", icon: BarChart3Icon, group: "main", adminOnly: true },
  { title: "Nómina", href: "/payroll", icon: WalletIcon, group: "main", adminOnly: true },
  { title: "Empleados", href: "/employees", icon: UsersIcon, group: "main", adminOnly: true },
  { title: "Plantillas", href: "/plantillas", icon: FileTextIcon, group: "main", adminOnly: true },
  { title: "Datos crudos", href: "/raw", icon: DatabaseIcon, group: "admin", adminOnly: true },
  { title: "Reglas", href: "/rules", icon: SettingsIcon, group: "admin", adminOnly: true },
];

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";
  const visibleNav = NAV.filter((n) => isAdmin || !n.adminOnly);

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
          const items = visibleNav.filter((n) => n.group === groupId);
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
                          tooltip={!isAdmin && item.employeeTitle ? item.employeeTitle : item.title}
                        >
                          <item.icon />
                          <span>
                            {!isAdmin && item.employeeTitle
                              ? item.employeeTitle
                              : item.title}
                          </span>
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
