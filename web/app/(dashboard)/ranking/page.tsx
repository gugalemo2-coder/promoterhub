"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { getMonthName, getScoreBg } from "@/lib/utils";
import { Trophy, Medal, RefreshCw, ChevronRight, Download, Camera, Package, MapPin } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MEDAL_COLORS = [
  "text-yellow-500",
  "text-gray-400",
  "text-orange-400",
];

const MEDAL_BG = [
  "bg-yellow-50 border-yellow-200",
  "bg-gray-50 border-gray-200",
  "bg-orange-50 border-orange-200",
];

const MEDAL_LABELS = ["1º Lugar", "2º Lugar", "3º Lugar"];

export default function RankingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const ranking = trpc.promoterRanking.monthly.useQuery({ year, month });
  const data = ranking.data ?? [];

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const avgScore = data.length > 0
    ? Math.round(data.reduce((s, p) => s + (p.score ?? 0), 0) / data.length)
    : 0;

  const handleExport = () => {
    const rows = data.map((p, i) => [
      i + 1,
      p.userName ?? "—",
      p.score ?? 0,
      p.totalApprovedPhotos ?? 0,
      p.totalMaterialRequests ?? 0,
      p.totalVisits ?? 0,
    ]);
    const header = ["Pos", "Promotor", "Score", "Fotos", "Materiais", "Visitas"];
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking-${getMonthName(month)}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Ranking de Promotores"
        subtitle={`${getMonthName(month)} ${year} · Score médio: ${avgScore}`}
        icon={Trophy}
        iconColor="text-yellow-600"
        iconBg="bg-yellow-50"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button
              onClick={() => ranking.refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        }
      />

      {/* Period selector */}
      <div className="flex items-center gap-3 mb-6">
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

      {/* Top 3 podium — responsive: stack on mobile, 3 cols on sm+ */}
      {!ranking.isLoading && data.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {data.slice(0, 3).map((p, i) => (
            <Link
              key={`podium-${p.userId}-${i}`}
              href={`/promoter/${p.userId}`}
              className={cn(
                "bg-white rounded-xl border p-4 sm:p-5 shadow-sm transition-colors hover:shadow-md",
                MEDAL_BG[i]
              )}
            >
              {/* Mobile: horizontal layout */}
              <div className="flex items-center gap-3 sm:flex-col sm:text-center">
                <div className="flex items-center gap-2 sm:flex-col">
                  <Medal size={20} className={cn(MEDAL_COLORS[i])} />
                  <span className="text-xs font-medium text-gray-500 sm:hidden">{MEDAL_LABELS[i]}</span>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 sm:mx-auto sm:mb-1">
                  <span className="text-blue-700 font-bold text-base sm:text-lg">
                    {p.userName?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0 sm:flex-none">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.userName ?? "—"}</p>
                </div>
                <div className="flex-shrink-0 sm:mt-2 sm:flex sm:justify-center">
                  <ScoreRing score={p.score ?? 0} size={44} strokeWidth={4} />
                </div>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-gray-500">
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{p.totalApprovedPhotos ?? 0}</p>
                  <p className="truncate">Fotos</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{p.totalMaterialRequests ?? 0}</p>
                  <p className="truncate">Materiais</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{p.totalVisits ?? 0}</p>
                  <p className="truncate">Visitas</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Loading */}
      {ranking.isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhum dado disponível para {getMonthName(month)} {year}
        </div>
      ) : (
        <>
          {/* Mobile Cards (below md) */}
          <div className="flex flex-col gap-3 md:hidden">
            {data.map((p, i) => (
              <Link
                key={`card-${p.userId}-${i}`}
                href={`/promoter/${p.userId}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 w-7 text-center">
                    {i < 3 ? (
                      <Medal size={16} className={MEDAL_COLORS[i]} />
                    ) : (
                      <span className="text-sm font-medium text-gray-400">{i + 1}</span>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 text-xs font-semibold">
                      {p.userName?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.userName ?? "—"}</p>
                  </div>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", getScoreBg(p.score ?? 0))}>
                    {p.score ?? 0}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-10">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Camera size={11} className="text-purple-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700">{p.totalApprovedPhotos ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Package size={11} className="text-orange-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700">{p.totalMaterialRequests ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={11} className="text-teal-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700">{p.totalVisits ?? 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop Table (hidden below md) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promotor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fotos Aprov.</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Materiais</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Visitas</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((p, i) => (
                  <tr key={`row-${p.userId}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      {i < 3 ? (
                        <Medal size={16} className={MEDAL_COLORS[i]} />
                      ) : (
                        <span className="text-sm font-medium text-gray-400">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 text-xs font-semibold">
                            {p.userName?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{p.userName ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", getScoreBg(p.score ?? 0))}>
                        {p.score ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-700">{p.totalApprovedPhotos ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-sm text-gray-700">{p.totalMaterialRequests ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-sm text-gray-700">{p.totalVisits ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/promoter/${p.userId}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Detalhes
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
