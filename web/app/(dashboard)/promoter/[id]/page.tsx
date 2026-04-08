"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { getMonthName, formatDate, getScoreBg, cn } from "@/lib/utils";
import { User, ArrowLeft, MapPin, TrendingUp, TrendingDown, Minus, Camera, Clock, Package, AlertTriangle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface Props {
  params: Promise<{ id: string }>;
}

export default function PromoterDetailPage({ params }: Props) {
  const { id } = use(params);
  const promoterId = Number(id);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const detail = trpc.promoterDetail.get.useQuery({ promoterId, year, month });
  const rankPos = trpc.promoterRanking.rankPosition.useQuery({ promoterId, year, month });

  const data = detail.data;
  const rank = rankPos.data;

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const years = [now.getFullYear() - 1, now.getFullYear()];

  // monthlyTrend returns: { month: "Jan/2025", score: N, approvedPhotos: N, hoursWorked: N, visits: N }
  // Extract just the month abbreviation for the chart label
  const trendData = data?.monthlyTrend?.map((t) => ({
    name: t.month.split("/")[0] ?? t.month,
    score: t.score ?? 0,
    fotos: t.approvedPhotos ?? 0,
    horas: t.hoursWorked ?? 0,
    visitas: t.visits ?? 0,
  })) ?? [];

  // prevRank is the field name in the server response
  const prevRank = rank?.prevRank ?? 0;
  const currentRank = rank?.currentRank ?? 0;
  const positionDiff = prevRank && currentRank ? prevRank - currentRank : 0;
  const TrendIcon = positionDiff > 0 ? TrendingUp : positionDiff < 0 ? TrendingDown : Minus;
  const trendColor = positionDiff > 0 ? "text-green-600" : positionDiff < 0 ? "text-red-500" : "text-gray-400";

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/ranking" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={14} />
          Voltar para Ranking
        </Link>
      </div>

      <PageHeader
        title={data?.userName ?? "Promotor"}
        subtitle={`${getMonthName(month)} ${year}`}
        icon={User}
        actions={
          <div className="flex items-center gap-2">
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
        }
      />

      {detail.isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">Nenhum dado disponível</div>
      ) : (
        <>
          {/* Score + Rank — responsive grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
              <ScoreRing score={data.score ?? 0} size={56} strokeWidth={5} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Score</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.score ?? 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Posição</p>
              <div className="flex items-center gap-2">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">#{rank?.currentRank ?? "—"}</p>
                {rank && positionDiff !== 0 && (
                  <div className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
                    <TrendIcon size={12} />
                    <span>{Math.abs(positionDiff)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">de {rank?.totalPromoters ?? "—"} promotores</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Camera size={12} className="text-purple-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Fotos Aprovadas</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.totalApprovedPhotos ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">{data.totalRejectedPhotos ?? 0} rejeitadas</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin size={12} className="text-teal-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Visitas a PDVs</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.totalVisits ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">{data.totalMaterialRequests ?? 0} materiais</p>
            </div>
          </div>

          {/* Chart */}
          {trendData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm mb-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Evolução dos Últimos 6 Meses</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Score" />
                  <Line type="monotone" dataKey="fotos" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Fotos" />
                  <Line type="monotone" dataKey="visitas" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} name="Visitas" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Store breakdown */}
          {data.storeBreakdown && data.storeBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">PDVs Visitados no Mês</h3>
              </div>

              {/* Mobile cards (below md) */}
              <div className="divide-y divide-gray-50 md:hidden">
                {data.storeBreakdown.map((s) => (
                  <div key={s.storeId} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">{s.storeName ?? "—"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium text-gray-700">{s.visits ?? 0}</span> visitas
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{s.photos ?? 0}</span> fotos
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{s.hoursWorked ? s.hoursWorked.toFixed(1) + "h" : "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table (md+) */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PDV</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Visitas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fotos</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.storeBreakdown.map((s) => (
                    <tr key={s.storeId} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{s.storeName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-700">{s.visits ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-700">{s.photos ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-500">{s.hoursWorked ? s.hoursWorked.toFixed(1) + "h" : "—"}</span>
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
