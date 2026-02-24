"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { Clock, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, MapPin } from "lucide-react";
import { useState } from "react";

function formatTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ClockPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: entries, isLoading, refetch } = trpc.timeEntries.allForDate.useQuery({
    date: selectedDate.toISOString(),
  });

  const changeDate = (delta: number) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const isToday = isSameDay(selectedDate, new Date());

  const entryCount = entries?.filter((e) => e.entryType === "entry").length ?? 0;
  const exitCount = entries?.filter((e) => e.entryType === "exit").length ?? 0;
  const withinRadius = entries?.filter((e) => e.isWithinRadius).length ?? 0;
  const outsideRadius = (entries?.length ?? 0) - withinRadius;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Controle de Ponto"
        subtitle="Registros de entrada e saída de todos os promotores"
        icon={Clock}
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
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

      {/* Date Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-gray-900 capitalize">{formatDate(selectedDate)}</p>
          {isToday && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mt-0.5">
              Hoje
            </span>
          )}
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total de Registros</p>
          <p className="text-2xl font-bold text-gray-900">{entries?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Entradas</p>
          <p className="text-2xl font-bold text-green-600">{entryCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Saídas</p>
          <p className="text-2xl font-bold text-orange-500">{exitCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Fora do Raio</p>
          <p className="text-2xl font-bold text-red-500">{outsideRadius}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promotor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Loja</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Horário</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Distância</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Raio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Carregando...</td>
              </tr>
            ) : !entries || entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Clock size={32} className="text-gray-200" />
                    <p className="text-gray-400 text-sm">Nenhum registro neste dia</p>
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={`${entry.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-semibold">
                          {String(entry.userId).charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Promotor #{entry.userId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-700">Loja #{entry.storeId}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      entry.entryType === "entry"
                        ? "bg-green-50 text-green-700"
                        : "bg-orange-50 text-orange-700"
                    }`}>
                      {entry.entryType === "entry" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-mono text-gray-900">{formatTime(entry.entryTime)}</span>
                  </td>
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    {entry.distanceFromStore ? (
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} />
                        {parseFloat(entry.distanceFromStore).toFixed(2)} km
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {entry.isWithinRadius ? (
                      <CheckCircle size={16} className="text-green-500 mx-auto" />
                    ) : (
                      <XCircle size={16} className="text-red-500 mx-auto" />
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
