"use client";
import {
  UserCog,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Key,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

interface AppUser {
  id: number;
  name: string | null;
  login: string;
  appRole: "promoter" | "manager" | "supervisor" | "master";
  active: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
}

type RoleFilter = "all" | "promoter" | "manager" | "supervisor" | "master";
type StatusFilter = "all" | "active" | "inactive";

const ROLE_LABELS: Record<string, string> = {
  promoter: "Promotor",
  manager: "Gestor",
  supervisor: "Supervisor",
  master: "Master",
};

const ROLE_COLORS: Record<string, string> = {
  promoter: "bg-blue-100 text-blue-700",
  manager: "bg-purple-100 text-purple-700",
  supervisor: "bg-orange-100 text-orange-700",
  master: "bg-amber-100 text-amber-700",
};

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
    // Production fallback — hardcoded like trpc.ts does
    return "https://api-production-bbc3e.up.railway.app";
  }
  return "http://localhost:3000";
}

/** Build headers with Authorization Bearer token (same mechanism as tRPC client) */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("promoterhub_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
      {message}
    </div>
  );
}

export default function MasterUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals
  const [roleModal, setRoleModal] = useState<AppUser | null>(null);
  const [passwordModal, setPasswordModal] = useState<AppUser | null>(null);
  const [deleteModal, setDeleteModal] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/master/users`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      } else {
        console.error("Failed to fetch users:", res.status, await res.text().catch(() => ""));
      }
    } catch (e) {
      console.error("Fetch users error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.login.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.appRole === roleFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.active) ||
      (statusFilter === "inactive" && !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    inactive: users.filter((u) => !u.active).length,
    promoters: users.filter((u) => u.appRole === "promoter").length,
    managers: users.filter((u) => u.appRole === "manager").length,
  };

  // ── Change Role ──
  const handleChangeRole = async (targetUser: AppUser, newRole: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/master/users/${targetUser.id}/role`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ appRole: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Cargo de ${targetUser.name ?? targetUser.login} alterado para ${ROLE_LABELS[newRole]}!`);
        setRoleModal(null);
        fetchUsers();
      } else {
        showToast(data.error ?? "Erro ao alterar cargo.", "error");
      }
    } catch {
      showToast("Erro de conexão.", "error");
    } finally {
      setProcessing(false);
    }
  };

  // ── Toggle Active ──
  const handleToggleActive = async (targetUser: AppUser) => {
    setProcessing(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/master/users/${targetUser.id}/active`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !targetUser.active }),
      });
      const data = await res.json();
      if (res.ok) {
        const action = targetUser.active ? "desativada" : "ativada";
        showToast(`Conta de ${targetUser.name ?? targetUser.login} ${action} com sucesso!`);
        fetchUsers();
      } else {
        showToast(data.error ?? "Erro ao alterar status.", "error");
      }
    } catch {
      showToast("Erro de conexão.", "error");
    } finally {
      setProcessing(false);
    }
  };

  // ── Reset Password ──
  const handleResetPassword = async () => {
    if (!passwordModal) return;
    if (!newPassword || newPassword.trim().length < 4) {
      showToast("A senha deve ter pelo menos 4 caracteres.", "error");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/master/users/${passwordModal.id}/password`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Senha de ${passwordModal.name ?? passwordModal.login} redefinida!`);
        setPasswordModal(null);
        setNewPassword("");
      } else {
        showToast(data.error ?? "Erro ao redefinir senha.", "error");
      }
    } catch {
      showToast("Erro de conexão.", "error");
    } finally {
      setProcessing(false);
    }
  };

  // ── Delete User ──
  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    setProcessing(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/master/users/${deleteModal.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Conta de ${deleteModal.name ?? deleteModal.login} excluída permanentemente.`);
        setDeleteModal(null);
        fetchUsers();
      } else {
        showToast(data.error ?? "Erro ao excluir conta.", "error");
      }
    } catch {
      showToast("Erro de conexão.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const isMaster = user?.appRole === "master";

  if (!isMaster) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96 gap-4">
        <Shield size={48} className="text-gray-300" />
        <p className="text-gray-500 text-lg font-medium">Acesso restrito a contas Master</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 flex-shrink-0">
            <UserCog size={20} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
            <p className="text-sm text-gray-500">Gerenciamento de contas e permissões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-gray-700" },
          { label: "Ativos", value: stats.active, color: "text-green-600" },
          { label: "Inativos", value: stats.inactive, color: "text-red-500" },
          { label: "Promotores", value: stats.promoters, color: "text-blue-600" },
          { label: "Gestores", value: stats.managers, color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou login..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Todos os cargos</option>
          <option value="promoter">Promotores</option>
          <option value="manager">Gestores</option>
          <option value="supervisor">Supervisores</option>
          <option value="master">Masters</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <RefreshCw size={20} className="animate-spin" />
            Carregando usuários...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Users size={40} />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards (below md) */}
            <div className="divide-y divide-gray-50 md:hidden">
              {filtered.map((u) => (
                <div key={u.id} className={`p-4 ${!u.active ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt={u.name ?? u.login} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        (u.name ?? u.login).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.name ?? "—"}</p>
                      <p className="text-xs text-gray-500 truncate">{u.login}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.appRole] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[u.appRole] ?? u.appRole}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-green-500" : "bg-red-400"}`} />
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setRoleModal(u)} title="Alterar cargo" className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"><Shield size={16} /></button>
                      <button onClick={() => { setPasswordModal(u); setNewPassword(""); setShowPassword(false); }} title="Redefinir senha" className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Key size={16} /></button>
                      <button onClick={() => handleToggleActive(u)} title={u.active ? "Desativar" : "Ativar"} className={`p-2 rounded-lg transition-colors ${u.active ? "text-orange-500 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}`}>
                        {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      {u.appRole !== "master" && (
                        <button onClick={() => setDeleteModal(u)} title="Excluir" className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (md+) */}
            <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Usuário</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Login</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cargo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !u.active ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt={u.name ?? u.login} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          (u.name ?? u.login).charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="font-medium text-gray-800">{u.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.login}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.appRole] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[u.appRole] ?? u.appRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-green-500" : "bg-red-400"}`} />
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setRoleModal(u)} title="Alterar cargo" className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"><Shield size={16} /></button>
                      <button onClick={() => { setPasswordModal(u); setNewPassword(""); setShowPassword(false); }} title="Redefinir senha" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Key size={16} /></button>
                      <button onClick={() => handleToggleActive(u)} title={u.active ? "Desativar conta" : "Ativar conta"} className={`p-1.5 rounded-lg transition-colors ${u.active ? "text-orange-500 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}`}>
                        {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      {u.appRole !== "master" && (
                        <button onClick={() => setDeleteModal(u)} title="Excluir conta" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* Role Modal */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Alterar Cargo</h3>
            <p className="text-sm text-gray-500 mb-4">Usuário: <strong>{roleModal.name ?? roleModal.login}</strong></p>
            <p className="text-xs text-gray-400 mb-3">
              Cargo atual:{" "}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[roleModal.appRole]}`}>
                {ROLE_LABELS[roleModal.appRole]}
              </span>
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {(["promoter", "supervisor", "manager", "master"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => handleChangeRole(roleModal, role)}
                  disabled={processing || role === roleModal.appRole}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    role === roleModal.appRole
                      ? "border-blue-500 bg-blue-50 text-blue-700 cursor-default"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700"
                  } disabled:opacity-50`}
                >
                  <Shield size={16} />
                  {ROLE_LABELS[role]}
                  {role === roleModal.appRole && <span className="ml-auto text-xs text-blue-500">Atual</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setRoleModal(null)} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Redefinir Senha</h3>
            <p className="text-sm text-gray-500 mb-4">Usuário: <strong>{passwordModal.name ?? passwordModal.login}</strong></p>
            <div className="relative mb-5">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nova senha (mín. 4 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPasswordModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleResetPassword} disabled={processing || !newPassword || newPassword.trim().length < 4} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {processing ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Excluir Conta</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Tem certeza que deseja excluir permanentemente a conta de <strong>{deleteModal.name ?? deleteModal.login}</strong>?
            </p>
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-5">
              ⚠️ Esta ação é irreversível. Todos os dados do usuário serão removidos permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleDeleteUser} disabled={processing} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                {processing ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
