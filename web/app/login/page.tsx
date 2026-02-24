"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Users, Camera, Package, Shield } from "lucide-react";

export default function LoginPage() {
  const { isAuthenticated, loading, demoLogin } = useAuth();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState<"promoter" | "manager" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const handleDemoLogin = async (role: "promoter" | "manager") => {
    try {
      setError("");
      setDemoLoading(role);
      await demoLogin(role);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setDemoLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-3xl font-bold text-white">PromoterHub</h1>
          <p className="text-blue-200 mt-2 text-sm">Painel de Gestão de Promotores</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: Users, label: "Gestão de Equipe" },
              { icon: Camera, label: "Controle de Fotos" },
              { icon: Package, label: "Materiais" },
              { icon: Shield, label: "Monitoramento" },
            ].map((feat) => (
              <div key={feat.label} className="flex items-center gap-2 text-gray-600">
                <feat.icon size={16} className="text-blue-500 flex-shrink-0" />
                <span className="text-xs">{feat.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-center text-sm text-gray-500 font-medium mb-4">
              Acesso de Demonstração
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={() => handleDemoLogin("manager")}
              disabled={demoLoading !== null}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
            >
              {demoLoading === "manager" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Shield size={18} />
              )}
              Entrar como Gestor Demo
            </button>

            <button
              onClick={() => handleDemoLogin("promoter")}
              disabled={demoLoading !== null}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-semibold py-3.5 px-6 rounded-xl border border-gray-200 transition-colors"
            >
              {demoLoading === "promoter" ? (
                <Loader2 size={18} className="animate-spin text-gray-400" />
              ) : (
                <Users size={18} className="text-gray-400" />
              )}
              Entrar como Promotor Demo
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Dados de demonstração · Acesso seguro
          </p>
        </div>
      </div>
    </div>
  );
}
