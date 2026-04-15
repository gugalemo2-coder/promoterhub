"use client";

import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";

/** Convert a display name to a login handle: lowercase, no accents, no spaces */
function nameToLogin(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getApiUrl() {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
    return "https://api-production-bbc3e.up.railway.app";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

export default function RegisterPage() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [loginEdited, setLoginEdited] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  // Auto-generate login from name (unless user has manually edited it)
  useEffect(() => {
    if (!loginEdited) {
      setLogin(nameToLogin(name));
    }
  }, [name, loginEdited]);

  const handleLoginChange = (value: string) => {
    setLoginEdited(true);
    // Apply same normalization as you type
    setLogin(nameToLogin(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Nome deve ter pelo menos 2 caracteres.");
      return;
    }
    if (login.length < 2) {
      setError("Login deve ter pelo menos 2 caracteres.");
      return;
    }
    if (password.length < 4) {
      setError("Senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/app-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          login,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta.");
        return;
      }

      // Save token and refresh auth state
      if (data.app_session_id) {
        if (typeof window !== "undefined") {
          localStorage.setItem("promoterhub_token", data.app_session_id);
        }
      }
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setSubmitting(false);
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-lg">
            <Image src="/logo-dinamica.png" alt="Dinâmica" width={64} height={64} style={{ objectFit: "contain" }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
          <p className="text-blue-200 mt-2 text-sm">Cadastre-se como promotor</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 mb-5">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                autoCapitalize="words"
                autoCorrect="off"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-gray-50"
              />
            </div>

            {/* Login (auto-gerado) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Usuário <span className="font-normal text-gray-400">(gerado automaticamente)</span>
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => handleLoginChange(e.target.value)}
                placeholder="seulogin"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-gray-50"
              />
              {login && (
                <p className="text-xs text-gray-400 mt-1">
                  Seu login será: <span className="font-semibold text-gray-600">{login}</span>
                </p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  disabled={submitting}
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

            {/* Confirmar Senha */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirmar Senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-gray-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
            >
              {submitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <UserPlus size={17} />
              )}
              Criar Conta
            </button>
          </form>

          {/* Link para voltar ao login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              <ArrowLeft size={14} />
              Já tenho conta
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
