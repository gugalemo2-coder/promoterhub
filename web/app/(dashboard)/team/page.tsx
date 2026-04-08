"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { getMonthName } from "@/lib/utils";
import { Users, Search, RefreshCw, ChevronRight, Camera, Package, MapPin } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function TeamPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");

  // Use ranking data instead of monthly report — it has per-promoter stats
  const ranking = trpc.promoterRanking.monthly.useQuery({ year, month });
  const allPromoters = trpc.reports.allPromoters.useQuery();

  const promoters = allPromoters.data ?? [];
  const rankingData = ranking.data ?? [];

  const filtered = promoters.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.login?.toLowerCase().includes(search.toLowerCase())
  );

  const getPromoterStats = (userId: number) =>
    rankingData.find((m: any) => m.userId === userId);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Equipe"
        subtitle={`${promoters.length} promotores cadastrados`}
        icon={Users}
        actions={
          <button
            onClick={() => { allPromoters.refetch(); ranking.refetch(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
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

      {/* Loading */}
      {allPromoters.isLoading || ranking.isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Nenhum promotor encontrado</div>
      ) : (
        <>
          {/* Mobile Cards (visible below md) */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((promoter) => {
              const stats = getPromoterStats(promoter.id);
              return (
                <Link
                  key={promoter.id}
                  href={`/promoter/${promoter.id}`}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-sm font-semibold">
                        {promoter.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{promoter.name ?? "—"}</p>
                      <p className="text-xs text-gray-500 truncate">{promoter.login ?? "—"}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <ScoreRing score={stats?.score ?? 0} size={44} strokeWidth={3} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Camera size={12} className="text-purple-500 flex-shrink-0" />
                      <span className="font-medium text-gray-700">{stats?.totalApprovedPhotos ?? 0}</span>
                      <span>Fotos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Package size={12} className="text-orange-500 flex-shrink-0" />
                      <span className="font-medium text-gray-700">{stats?.totalMaterialRequests ?? 0}</span>
                      <span>Mat.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={12} className="text-teal-500 flex-shrink-0" />
                      <span className="font-medium text-gray-700">{stats?.totalVisits ?? 0}</span>
                      <span>Visitas</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop Table (hidden below md) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promotor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fotos</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Materiais</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Visitas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((promoter) => {
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
                          <ScoreRing score={stats?.score ?? 0} size={40} strokeWidth={3} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900">{stats?.totalApprovedPhotos ?? 0}</span>
                      </td>
                      <td className="px-4 py-4 text-center hidden lg:table-cell">
                        <span className="text-sm font-medium text-gray-900">{stats?.totalMaterialRequests ?? 0}</span>
                      </td>
                      <td className="px-4 py-4 text-center hidden lg:table-cell">
                        <span className="text-sm font-medium text-gray-900">{stats?.totalVisits ?? 0}</span>
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
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
