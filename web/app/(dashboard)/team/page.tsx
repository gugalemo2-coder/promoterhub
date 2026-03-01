"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { getMonthName } from "@/lib/utils";
import { Users, Search, RefreshCw, ChevronRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function TeamPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");

  const monthly = trpc.reports.monthly.useQuery({ year, month });
  const allPromoters = trpc.reports.allPromoters.useQuery();

  const promoters = allPromoters.data ?? [];
  const monthlyData = Array.isArray(monthly.data) ? monthly.data : monthly.data ? [monthly.data] : [];

  const filtered = promoters.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.login?.toLowerCase().includes(search.toLowerCase())
  );

  const getPromoterStats = (userId: number) =>
    monthlyData.find((m: any) => m.userId === userId);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Equipe"
        subtitle={`${promoters.length} promotores cadastrados`}
        icon={Users}
        actions={
          <button
            onClick={() => { allPromoters.refetch(); monthly.refetch(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar promotor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promotor</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fotos</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Materiais</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Visitas</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allPromoters.isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Carregando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Nenhum promotor encontrado</td>
              </tr>
            ) : (
              filtered.map((promoter) => {
                const stats = getPromoterStats(promoter.id);
                return (
                  <tr key={promoter.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 text-sm font-semibold">
                            {promoter.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{promoter.name ?? "—"}</p>
                          <p className="text-xs text-gray-500">{promoter.login ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <ScoreRing score={stats ? (stats as any).score ?? 0 : 0} size={40} strokeWidth={3} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className="text-sm font-medium text-gray-900">{stats ? (stats as any).approvedPhotos ?? 0 : "—"}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-sm font-medium text-gray-900">{stats ? (stats as any).materialRequests ?? 0 : "—"}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-sm font-medium text-gray-900">{stats ? (stats as any).storeVisits ?? 0 : "—"}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status="active" />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/promoter/${promoter.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver detalhes
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
