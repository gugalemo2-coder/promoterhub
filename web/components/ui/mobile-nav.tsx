"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Camera, Package, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/promoter-home", icon: Home, label: "Início" },
  { href: "/promoter-clock", icon: Clock, label: "Ponto" },
  { href: "/promoter-photos", icon: Camera, label: "Fotos" },
  { href: "/product-expiration", icon: Package, label: "Vencimento" },
  { href: "/my-profile", icon: User, label: "Perfil" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 68,
        background: "white",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 12px",
              textDecoration: "none",
              color: isActive ? "#1A56DB" : "#9ca3af",
              transition: "color 0.15s",
              minWidth: 56,
            }}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
