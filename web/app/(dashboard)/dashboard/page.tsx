"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { formatDateTime, getMonthName } from "@/lib/utils";
import {
  Users, Camera, Package, Bell, Trophy, Clock, TrendingUp, MapPin, RefreshCw, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const dailyReport = trpc.reports.daily.useQuery({});
  const ranking = trpc.promoterRanking.monthly.useQuery({ year, month });
  const alerts = trpc.geoAlerts.list.useQuery({ limit: 5 });
  const allPromoters = trpc.reports.allPromoters.useQuery();

  const isLoading = dailyReport.isLoading || ranking.isLoading;

  const report = dailyReport.data;
  const topPromoters = ranking.data?.slice(0, 5) ?? [];
  const recentAlerts = alerts.data ?? [];

  // Photos chart from ranking data — use correct field names from PromoterRankingEntry
  const photosChartData = topPromoters.slice(0, 5).map((p) => ({
    name: p.userName?.split(" ")[0] ?? "—",
    fotos: p.totalApprovedPhotos ?? 0,
    score: p.score ?? 0,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={`${getMonthName(month)} ${year} · Visão geral da equipe`}
        icon={TrendingUp}
        actions={
          <button
            onClick={() => { dailyReport.refetch(); ranking.refetch(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Promotores Ativos"
          value={isLoading ? "—" : (allPromoters.data?.length ?? 0)}
          subtitle="Total cadastrados"
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Fotos Hoje"
          value={isLoading ? "—" : (report?.totalPhotos ?? 0)}
          subtitle="Registradas hoje"
          icon={Camera}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Materiais Solicitados"
          value={isLoading ? "—" : (report?.totalRequests ?? 0)}
          subtitle="Hoje"
          icon={Package}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard
          title="Alertas Hoje"
          value={isLoading ? "—" : (report?.totalAlerts ?? 0)}
          subtitle="Registrados hoje"
          icon={Bell}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Promotores */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Top 5 Promotores — Fotos Aprovadas</h3>
            <Trophy size={16} className="text-yellow-500" />
          </div>
          {ranking.isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
          ) : photosChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados disponíveis</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={photosChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(v) => [v, "Fotos"]}
                />
                <Bar dataKey="fotos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Score dos promotores */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Score dos Promotores — {getMonthName(month)}</h3>
            <Trophy size={16} className="text-blue-500" />
          </div>
          {ranking.isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
          ) : topPromoters.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados disponíveis</div>
          ) : (
            <div className="space-y-3">
              {topPromoters.map((p, i) => (
                <Link key={`${p.userId}-${i}`} href={`/promoter/${p.userId}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 text-xs font-semibold">
                      {p.userName?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.userName ?? "—"}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.min(p.score ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <ScoreRing score={p.score ?? 0} size={36} strokeWidth={3} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas Recentes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Alertas Recentes</h3>
            <Bell size={16} className="text-red-500" />
          </div>
          {alerts.isLoading ? (
            <div className="text-gray-400 text-sm text-center py-8">Carregando...</div>
          ) : recentAlerts.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-8">Nenhum alerta recente</div>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={14} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      PDV #{alert.storeId} — {alert.alertType.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(alert.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    alert.acknowledged ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>
                    {alert.acknowledged ? "Reconhecido" : "Aberto"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atividade de Hoje */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Atividade de Hoje</h3>
            <Clock size={16} className="text-blue-500" />
          </div>
          {dailyReport.isLoading ? (
            <div className="text-gray-400 text-sm text-center py-8">Carregando...</div>
          ) : !report ? (
            <div className="text-gray-400 text-sm text-center py-8">Sem atividade registrada hoje</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Registros de Ponto", value: report.totalEntries ?? 0, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Fotos", value: report.totalPhotos ?? 0, icon: Camera, color: "text-purple-600", bg: "bg-purple-50" },
                { label: "Solicitações", value: report.totalRequests ?? 0, icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
                { label: "Alertas", value: report.totalAlerts ?? 0, icon: Bell, color: "text-red-600", bg: "bg-red-50" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                    <item.icon size={14} className={item.color} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
