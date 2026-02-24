"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { MapPin, RefreshCw, Search, Plus, Building2, X, Loader2 } from "lucide-react";
import { useState } from "react";

interface NewStoreForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: NewStoreForm = {
  name: "", address: "", city: "", state: "", zipCode: "", phone: "", latitude: "", longitude: "",
};

export default function StoresPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewStoreForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const stores = trpc.stores.list.useQuery();
  const createStore = trpc.stores.create.useMutation({
    onSuccess: () => {
      stores.refetch();
      setShowModal(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (e) => setFormError(e.message),
  });

  const data = (stores.data ?? []).filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.name.trim()) { setFormError("Nome é obrigatório."); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { setFormError("Latitude inválida (ex: -23.5505)."); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setFormError("Longitude inválida (ex: -46.6333)."); return; }
    createStore.mutate({
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim().toUpperCase().slice(0, 2) || undefined,
      zipCode: form.zipCode.trim() || undefined,
      phone: form.phone.trim() || undefined,
      latitude: lat,
      longitude: lng,
    });
  };

  const field = (key: keyof NewStoreForm, label: string, placeholder: string, type = "text", half = false) => (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
      />
    </div>
  );

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
              onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setFormError(null); }}
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
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Cidade / Estado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Coordenadas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stores.isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">Carregando...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Building2 size={32} className="text-gray-200" />
                    <p className="text-gray-400 text-sm">
                      {search ? "Nenhum PDV encontrado para essa busca" : "Nenhum PDV cadastrado"}
                    </p>
                    {!search && (
                      <button
                        onClick={() => setShowModal(true)}
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
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <span className="text-sm text-gray-600">
                      {[store.city, store.state].filter(Boolean).join(" / ") || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    {store.latitude && store.longitude ? (
                      <span className="text-xs text-gray-500 font-mono">
                        {Number(store.latitude).toFixed(4)}, {Number(store.longitude).toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Não definido</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Store Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Plus size={16} className="text-teal-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Nova Loja / PDV</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Name */}
              {field("name", "Nome da Loja *", "Ex: Supermercado Central")}

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

              {/* Coordinates */}
              <div className="bg-teal-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-teal-800">📍 Coordenadas GPS *</p>
                <p className="text-xs text-teal-600">
                  Acesse <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Maps</a>, clique com o botão direito no local e copie as coordenadas.
                </p>
                <div className="flex gap-3">
                  {field("latitude", "Latitude", "Ex: -23.5505", "text", true)}
                  {field("longitude", "Longitude", "Ex: -46.6333", "text", true)}
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createStore.isPending}
                  className="flex-1 px-4 py-2.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createStore.isPending && <Loader2 size={14} className="animate-spin" />}
                  {createStore.isPending ? "Salvando..." : "Cadastrar Loja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
