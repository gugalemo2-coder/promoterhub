"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, Trophy, MapPin, Camera, Package,
  BarChart3, Settings, LogOut, ChevronLeft, Tag, Clock, FolderOpen,
  BarChart2, Navigation, UserCog, ChevronRight, Bell,
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
  if (role === "supervisor") return "Supervisor";
  return "Usuário";
}

function getRoleBadgeColor(role: string | null | undefined): string {
  if (role === "master") return "#7c3aed";
  if (role === "supervisor") return "#0891b2";
  return "#1d4ed8";
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const pendingQuery = trpc.photos.countPending.useQuery(undefined, { refetchInterval: 30000 });
  const pendingPhotos = (pendingQuery.data as number) ?? 0;
  const isMaster = user?.appRole === "master";
  const isSupervisor = user?.appRole === "supervisor";

  const navGroups: NavGroup[] = isSupervisor
    ? [
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
          label: "Relatórios",
          items: [
            { href: "/reports", icon: BarChart3, label: "Relatórios" },
          ],
        },
      ]
    : [
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
            { href: "/notifications", icon: Bell, label: "Notificações" },
            { href: "/reports", icon: BarChart3, label: "Relatórios" },
            ...(isMaster ? [{ href: "/master-users", icon: UserCog, label: "Usuários" }] : []),
            { href: "/settings", icon: Settings, label: "Configurações" },
          ],
        },
      ];

  const W = collapsed ? 68 : 260;
  const badgeColor = getRoleBadgeColor(user?.appRole);

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
        padding: "14px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        minHeight: 70, overflow: "hidden",
      }}>
        <div style={{
          width: 40, height: 40, minWidth: 40, background: "white",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden", padding: 3,
        }}>
          <Image src="/logo-dinamica.png" alt="Dinâmica" width={34} height={34} style={{ objectFit: "contain" }} />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "white", whiteSpace: "nowrap", lineHeight: 1.2 }}>Dinâmica</div>
            <div style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap", marginTop: 2 }}>Painel de Gestão</div>
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

      {/* Footer — always visible, adapts to collapsed state */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 10px" }}>
        {collapsed ? (
          /* Collapsed: avatar + logout icon stacked */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: badgeColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "white", overflow: "hidden",
              flexShrink: 0,
            }}>
              {user?.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatarUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover" }} />
                : getInitials(user?.name)}
            </div>
            <button onClick={logout} title="Sair" style={{
              background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8",
              cursor: "pointer", padding: "5px", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          /* Expanded: welcome banner with name, role badge and logout */
          <div style={{
            background: `${badgeColor}18`,
            border: `1px solid ${badgeColor}30`,
            borderRadius: 10, padding: "10px 12px",
          }}>
            {/* Top row: avatar + name + logout */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 34, height: 34, minWidth: 34, borderRadius: "50%",
                background: badgeColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "white", overflow: "hidden", flexShrink: 0,
              }}>
                {user?.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={user.avatarUrl} alt="" style={{ width: 34, height: 34, objectFit: "cover" }} />
                  : getInitials(user?.name)}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1 }}>Bem-vindo(a),</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                  {user?.name ?? "Usuário"}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sair"
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 7, padding: "5px 8px", cursor: "pointer",
                  color: "#94a3b8", display: "flex", alignItems: "center", gap: 4,
                  flexShrink: 0, fontSize: 11, fontWeight: 600,
                }}
              >
                <LogOut size={12} />
                Sair
              </button>
            </div>
            {/* Role badge */}
            <div style={{
              display: "inline-flex", alignItems: "center",
              background: badgeColor,
              borderRadius: 20, padding: "2px 10px",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>
                {getRoleLabel(user?.appRole)}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
