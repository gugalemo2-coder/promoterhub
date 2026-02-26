"use client";

import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Users, Camera, Package, Shield, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const { isAuthenticated, loading, demoLogin, appLogin } = useAuth();
  const router = useRouter();

  const [demoLoading, setDemoLoading] = useState<"promoter" | "manager" | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const handleAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginValue.trim() || !password.trim()) {
      setError("Preencha o login e a senha.");
      return;
    }
    try {
      setError("");
      setLoginLoading(true);
      await appLogin(loginValue.trim().toLowerCase(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login ou senha incorretos.");
    } finally {
      setLoginLoading(false);
    }
  };

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

  const isAnyLoading = loginLoading || demoLoading !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-lg">
            <Image src="/logo-dinamica.png" alt="Dinâmica" width={64} height={64} style={{ objectFit: "contain" }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Dinâmica Corretora</h1>
          <p className="text-blue-200 mt-2 text-sm">Painel de Gestão de Promotores</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-6">
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleAppLogin} className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Login</label>
              <input
                type="text"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                placeholder="seu login"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isAnyLoading}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isAnyLoading}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-gray-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
            >
              {loginLoading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <LogIn size={17} />
              )}
              Entrar
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">ou acesso de demonstração</span>
            </div>
          </div>

          {/* Demo Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleDemoLogin("manager")}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-60 text-gray-700 font-medium py-2.5 px-6 rounded-xl border border-gray-200 transition-colors text-sm"
            >
              {demoLoading === "manager" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Shield size={16} className="text-blue-500" />
              )}
              Entrar como Gestor Demo
            </button>

            <button
              onClick={() => handleDemoLogin("promoter")}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-60 text-gray-700 font-medium py-2.5 px-6 rounded-xl border border-gray-200 transition-colors text-sm"
            >
              {demoLoading === "promoter" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Users size={16} className="text-green-500" />
              )}
              Entrar como Promotor Demo
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Dados seguros · Dinâmica Corretora v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
