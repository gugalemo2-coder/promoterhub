"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Trophy,
  MapPin,
  Camera,
  Package,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/team", icon: Users, label: "Equipe" },
  { href: "/ranking", icon: Trophy, label: "Ranking" },
  { href: "/stores", icon: MapPin, label: "PDVs" },
  { href: "/photos", icon: Camera, label: "Fotos" },
  { href: "/materials", icon: Package, label: "Materiais" },
  { href: "/alerts", icon: Bell, label: "Alertas" },
  { href: "/reports", icon: BarChart3, label: "Relatórios" },
  { href: "/settings", icon: Settings, label: "Configurações" },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">PromoterHub</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white text-sm font-bold">P</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                size={18}
                className={cn(
                  "flex-shrink-0",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && (
                <ChevronRight size={14} className="ml-auto text-blue-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "G"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name ?? "Gestor"}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Expandir menu"
          >
            <Menu size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
