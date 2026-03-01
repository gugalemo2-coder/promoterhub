"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { MapPin, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, Camera, Package, Clock } from "lucide-react";
import { useState } from "react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function StoreVisitsPage() {
  const now = new Date();
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: stores } = trpc.stores.list.useQuery();
  const { data: visits, isLoading, refetch } = trpc.storeVisits.history.useQuery(
    { storeId: selectedStoreId ?? 0, year, month },
    { enabled: selectedStoreId !== undefined }
  );

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const visitList = visits ?? [];
  const totalHours = visitList.reduce((a, v) => a + (v.hoursWorked ?? 0), 0).toFixed(1);
  const totalPhotos = visitList.reduce((a, v) => a + (v.photosCount ?? 0), 0);
  const approvedPhotos = visitList.reduce((a, v) => a + (v.approvedPhotosCount ?? 0), 0);
  const totalMaterials = visitList.reduce((a, v) => a + (v.materialsCount ?? 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Visitas por PDV"
        subtitle="Histórico detalhado de visitas em cada ponto de venda"
        icon={MapPin}
        iconColor="text-teal-600"
        iconBg="bg-teal-50"
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Store selector */}
        <select
          value={selectedStoreId ?? ""}
          onChange={(e) => setSelectedStoreId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[200px]"
        >
          <option value="">Selecione um PDV...</option>
          {stores?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Month navigation */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={14} className="text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[90px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => changeMonth(1)}
            disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <ChevronRight size={14} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Empty state: no store selected */}
      {!selectedStoreId ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
            <MapPin size={28} className="text-teal-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700">Selecione um PDV</p>
          <p className="text-sm text-gray-400">Escolha um ponto de venda acima para ver o histórico de visitas.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {visitList.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} className="text-teal-600" />
                  <p className="text-xs text-gray-500">Total de Visitas</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{visitList.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} className="text-blue-600" />
                  <p className="text-xs text-gray-500">Horas Trabalhadas</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{totalHours}h</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Camera size={14} className="text-purple-600" />
                  <p className="text-xs text-gray-500">Fotos Aprovadas</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">{approvedPhotos}<span className="text-sm font-normal text-gray-400">/{totalPhotos}</span></p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package size={14} className="text-orange-600" />
                  <p className="text-xs text-gray-500">Materiais Solicitados</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">{totalMaterials}</p>
              </div>
            </div>
          )}

          {/* Visits Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visitList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
                <MapPin size={28} className="text-teal-300" />
              </div>
              <p className="text-lg font-semibold text-gray-700">Nenhuma visita neste período</p>
              <p className="text-sm text-gray-400">Tente selecionar outro mês.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promotor</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Entrada</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Saída</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Horas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Fotos</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Materiais</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alerta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visitList.map((visit, idx) => (
                    <tr
                      key={`${visit.visitDate}-${visit.userId}-${idx}`}
                      className={`hover:bg-gray-50 transition-colors ${visit.hasGeoAlert ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold">
                          {formatDate(visit.visitDate)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-700 text-xs font-semibold">
                              {getInitials(visit.userName ?? "?")}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{visit.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        <span className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                          {formatTime(visit.entryTime)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        {visit.exitTime ? (
                          <span className="text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                            {formatTime(visit.exitTime)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Em andamento</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center hidden lg:table-cell">
                        <span className="text-sm font-medium text-gray-700">
                          {visit.hoursWorked ? `${visit.hoursWorked.toFixed(1)}h` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center hidden lg:table-cell">
                        <span className="text-sm text-gray-700">
                          {visit.approvedPhotosCount ?? 0}
                          <span className="text-gray-400">/{visit.photosCount ?? 0}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center hidden xl:table-cell">
                        <span className="text-sm text-gray-700">{visit.materialsCount ?? 0}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {visit.hasGeoAlert ? (
                          <AlertTriangle size={16} className="text-red-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
