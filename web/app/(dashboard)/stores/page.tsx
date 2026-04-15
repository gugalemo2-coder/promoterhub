"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { MapPin, RefreshCw, Search, Plus, Building2, X, Loader2, Pencil, Trash2, UserCheck } from "lucide-react";
import { useState, useMemo } from "react";

interface StoreForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  promoterId: number | null;
}

const EMPTY_FORM: StoreForm = {
  name: "", address: "", city: "", state: "", zipCode: "", phone: "", promoterId: null,
};

export default function StoresPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<any | null>(null);
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const stores = trpc.stores.list.useQuery();
  const promoterUsers = trpc.stores.listPromoterUsers.useQuery();

  const createStore = trpc.stores.create.useMutation({
    onSuccess: () => {
      stores.refetch();
      setShowModal(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      setEditingStore(null);
    },
    onError: (e) => setFormError(e.message),
  });

  const updateStore = trpc.stores.update.useMutation({
    onSuccess: () => {
      stores.refetch();
      setShowModal(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      setEditingStore(null);
    },
    onError: (e) => setFormError(e.message),
  });

  const deleteStore = trpc.stores.update.useMutation({
    onSuccess: () => {
      stores.refetch();
      setDeletingId(null);
    },
  });

  const promoterList = (promoterUsers.data ?? []) as Array<{ id: number; name: string | null; login: string | null }>;

  const promoterMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of promoterList) {
      map.set(p.id, p.name ?? p.login ?? `#${p.id}`);
    }
    return map;
  }, [promoterList]);

  const data = (stores.data ?? []).filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingStore(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (store: any) => {
    setEditingStore(store);
    setForm({
      name: store.name ?? "",
      address: store.address ?? "",
      city: store.city ?? "",
      state: store.state ?? "",
      zipCode: store.zipCode ?? "",
      phone: store.phone ?? "",
      promoterId: store.promoterId ?? null,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleDelete = (store: any) => {
    if (!confirm(`Tem certeza que deseja excluir "${store.name}"?`)) return;
    setDeletingId(store.id);
    deleteStore.mutate({ id: store.id, status: "inactive" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError("Nome é obrigatório."); return; }

    if (editingStore) {
      // Update
      updateStore.mutate({
        id: editingStore.id,
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim().toUpperCase().slice(0, 2) || undefined,
        phone: form.phone.trim() || undefined,
        promoterId: form.promoterId,
      });
    } else {
      // Create
      createStore.mutate({
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim().toUpperCase().slice(0, 2) || undefined,
        zipCode: form.zipCode.trim() || undefined,
        phone: form.phone.trim() || undefined,
        promoterId: form.promoterId ?? undefined,
      });
    }
  };

  const isSaving = createStore.isPending || updateStore.isPending;

  const field = (key: keyof StoreForm, label: string, placeholder: string, type = "text", half = false) => {
    if (key === "promoterId") return null; // handled separately
    return (
      <div className={half ? "flex-1 min-w-0" : "w-full"}>
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        <input
          type={type}
          value={form[key] as string}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="PDVs Cadastrados"
        subtitle={`${stores.data?.length ?? 0} pontos de venda`}
        icon={Building2}
        iconColor="text-teal-600"
        iconBg="bg-teal-50"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => stores.refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Nova Loja
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou endereço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PDV</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Endereço</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Promotor</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Cidade / Estado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stores.isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Carregando...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Building2 size={32} className="text-gray-200" />
                    <p className="text-gray-400 text-sm">
                      {search ? "Nenhum PDV encontrado para essa busca" : "Nenhum PDV cadastrado"}
                    </p>
                    {!search && (
                      <button
                        onClick={openCreate}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        <Plus size={14} />
                        Cadastrar primeira loja
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <MapPin size={15} className="text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{store.name ?? "—"}</p>
                        {store.address && (
                          <p className="text-xs text-gray-400 md:hidden mt-0.5 truncate max-w-[200px]">{store.address}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{store.address ?? "—"}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {store.promoterId && promoterMap.has(store.promoterId) ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg font-medium">
                        <UserCheck size={13} />
                        {promoterMap.get(store.promoterId)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Sem promotor</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <span className="text-sm text-gray-600">
                      {[store.city, store.state].filter(Boolean).join(" / ") || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(store)}
                        className="p-2 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(store)}
                        disabled={deletingId === store.id}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                        title="Excluir"
                      >
                        {deletingId === store.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Store Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                  {editingStore ? <Pencil size={16} className="text-teal-600" /> : <Plus size={16} className="text-teal-600" />}
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  {editingStore ? "Editar Loja / PDV" : "Nova Loja / PDV"}
                </h2>
              </div>
              <button
                onClick={() => { setShowModal(false); setEditingStore(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Name */}
              {field("name", "Nome da Loja *", "Ex: Supermercado Central")}

              {/* Promoter */}
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Promotor Vinculado</label>
                <select
                  value={form.promoterId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, promoterId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">Nenhum (sem promotor)</option>
                  {promoterList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name ?? p.login ?? `#${p.id}`}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              {field("address", "Endereço", "Ex: Rua das Flores, 123")}

              {/* City + State */}
              <div className="flex gap-3">
                {field("city", "Cidade", "Ex: São Paulo", "text", true)}
                <div className="w-24">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">UF</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white uppercase"
                  />
                </div>
              </div>

              {/* ZipCode + Phone */}
              <div className="flex gap-3">
                {field("zipCode", "CEP", "00000-000", "text", true)}
                {field("phone", "Telefone", "(11) 99999-9999", "text", true)}
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingStore(null); }}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {isSaving ? "Salvando..." : editingStore ? "Salvar Alterações" : "Cadastrar Loja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
