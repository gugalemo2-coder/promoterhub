"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Trophy, MapPin, Camera, Package, Bell,
  BarChart3, Settings, LogOut, ChevronLeft, Tag, Clock, FolderOpen,
  BarChart2, Navigation, UserCog, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

type NavItem = { href: string; icon: React.ElementType; label: string; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
}
function getRoleLabel(role: string | null | undefined): string {
  if (role === "master") return "Master";
  if (role === "manager") return "Gestor";
  return "Usuário";
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const pendingQuery = trpc.photos.countPending.useQuery(undefined, { refetchInterval: 30000 });
  const pendingPhotos = (pendingQuery.data as number) ?? 0;
  const isMaster = user?.appRole === "master";

  const navGroups: NavGroup[] = [
    {
      label: "Visão Geral",
      items: [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/team", icon: Users, label: "Equipe" },
        { href: "/ranking", icon: Trophy, label: "Ranking" },
      ],
    },
    {
      label: "PDVs & Visitas",
      items: [
        { href: "/stores", icon: MapPin, label: "PDVs" },
        { href: "/store-dashboard", icon: BarChart2, label: "Dashboard PDVs" },
        { href: "/store-visits", icon: Navigation, label: "Visitas por PDV" },
      ],
    },
    {
      label: "Promotores",
      items: [
        { href: "/clock", icon: Clock, label: "Controle de Ponto" },
        { href: "/photos", icon: Camera, label: "Fotos", badge: pendingPhotos > 0 ? pendingPhotos : undefined },
        { href: "/materials", icon: Package, label: "Materiais" },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        { href: "/brands", icon: Tag, label: "Marcas" },
        { href: "/files", icon: FolderOpen, label: "Arquivos" },
      ],
    },
    {
      label: "Gestão",
      items: [
        { href: "/alerts", icon: Bell, label: "Alertas" },
        { href: "/notifications", icon: Bell, label: "Notificações" },
        { href: "/reports", icon: BarChart3, label: "Relatórios" },
        ...(isMaster ? [{ href: "/master-users", icon: UserCog, label: "Usuários" }] : []),
        { href: "/settings", icon: Settings, label: "Configurações" },
      ],
    },
  ];

  const W = collapsed ? 68 : 260;

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, height: "100vh", width: W,
      background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", zIndex: 50, overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "18px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        minHeight: 70, overflow: "hidden",
      }}>
        <div style={{
          width: 36, height: 36, minWidth: 36, background: "#1A56DB",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 800, color: "white", flexShrink: 0,
        }}>P</div>
        {!collapsed && (
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>PromoterHub</div>
            <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", marginTop: 2 }}>Painel de Gestão</div>
          </div>
        )}
        <button onClick={onToggle} title={collapsed ? "Expandir" : "Recolher"} style={{
          background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6,
          width: 28, height: 28, minWidth: 28, display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", color: "#94a3b8",
          marginLeft: collapsed ? "auto" : undefined,
        }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 8px" }}>
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed ? (
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "#475569",
                padding: "12px 10px 5px", whiteSpace: "nowrap",
              }}>{group.label}</div>
            ) : <div style={{ height: 8 }} />}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 8, cursor: "pointer",
                    color: isActive ? "white" : "#94a3b8",
                    background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                    textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden",
                    marginBottom: 2, position: "relative",
                    borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                  }}>
                  <span style={{ minWidth: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={17} />
                  </span>
                  {!collapsed && (
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.badge && item.badge > 0 && (
                    <span style={{
                      background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center",
                    }}>{item.badge > 99 ? "99+" : item.badge}</span>
                  )}
                  {collapsed && item.badge && item.badge > 0 && (
                    <span style={{
                      position: "absolute", top: 4, right: 4,
                      width: 8, height: 8, borderRadius: "50%", background: "#ef4444",
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            width: 32, height: 32, minWidth: 32, borderRadius: "50%", background: "#1d4ed8",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "white", overflow: "hidden",
          }}>
            {user?.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={user.avatarUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover" }} />
              : getInitials(user?.name)}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.name ?? "Usuário"}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{getRoleLabel(user?.appRole)}</div>
            </div>
          )}
          <button onClick={logout} title="Sair" style={{
            background: "transparent", border: "none", color: "#64748b",
            cursor: "pointer", padding: 4, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
