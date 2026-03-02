"use client";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
    if (!loading && isAuthenticated && user) {
      const role = (user as any).appRole;
      if (role !== "manager" && role !== "master" && role !== "supervisor") {
        router.replace("/login");
      }
    }
  }, [loading, isAuthenticated, user, router]);

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

  const sidebarW = collapsed ? 68 : 260;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        style={{
          marginLeft: sidebarW,
          flex: 1,
          transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </main>
    </div>
  );
}
