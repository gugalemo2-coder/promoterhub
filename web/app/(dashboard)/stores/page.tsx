"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { MapPin, RefreshCw, Search, Plus, Building2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function StoresPage() {
  const [search, setSearch] = useState("");

  const stores = trpc.stores.list.useQuery();
  const data = (stores.data ?? []).filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
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
          <button
            onClick={() => stores.refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
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
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PDV</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Endereço</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Raio (m)</th>
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
                <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                  {search ? "Nenhum PDV encontrado para essa busca" : "Nenhum PDV cadastrado"}
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
                    <span className="text-sm text-gray-700">500m</span>
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
    </div>
  );
}
