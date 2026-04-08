"use client";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { WebPushSetup } from "@/components/web-push-setup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = (user as any)?.appRole as string | undefined;
  const isPromoter = role === "promoter";

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f9fafb", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 48, height: 48, background: "#1A56DB", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", marginBottom: 8 }}>P</div>
        <Loader2 style={{ color: "#1A56DB", animation: "spin 1s linear infinite" }} size={24} />
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Carregando painel...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  /* ── Promoter: bottom nav layout ── */
  if (isPromoter) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f9fafb", overflowX: "hidden", width: "100%" }}>
        <WebPushSetup />
        <main style={{ flex: 1, paddingBottom: 72, display: "flex", flexDirection: "column", overflowX: "hidden", width: "100%", maxWidth: "100vw" }}>
          {children}
        </main>
        <MobileNav />
      </div>
    );
  }

  /* ── Manager/Master/Supervisor: sidebar on desktop, drawer on mobile ── */
  const sidebarW = collapsed ? 68 : 260;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .desktop-main { margin-left: 0 !important; }
          .mobile-header { display: flex !important; }
        }
        @media (min-width: 769px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-header { display: none !important; }
          .mobile-overlay { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
        <WebPushSetup />

        {/* Desktop sidebar */}
        <div className="desktop-sidebar" style={{ display: "flex" }}>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>

        {/* Mobile header bar */}
        <div className="mobile-header" style={{
          display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
          height: 56, background: "#0f172a", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Dinâmica</span>
          <div style={{ width: 38 }} />
        </div>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 45 }}
          />
        )}

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer" style={{
            position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
            width: 280, background: "#0f172a", overflowY: "auto",
            boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
            animation: "slideIn 0.2s ease-out",
          }}>
            <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main
          className="desktop-main"
          style={{
            marginLeft: sidebarW,
            flex: 1,
            transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            overflowX: "hidden",
          }}
        >
          {/* Spacer for mobile header */}
          <div className="mobile-header" style={{ display: "none", height: 56, flexShrink: 0 }} />
          {children}
        </main>
      </div>
    </>
  );
}
