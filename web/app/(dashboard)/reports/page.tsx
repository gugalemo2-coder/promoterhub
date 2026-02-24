"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { getMonthName } from "@/lib/utils";
import { FileText, RefreshCw, Download, Users, Camera, Package, Clock } from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedPromoter, setSelectedPromoter] = useState<number | undefined>(undefined);

  const monthly = trpc.reports.monthly.useQuery({ year, month, userId: selectedPromoter });
  const allPromoters = trpc.reports.allPromoters.useQuery();

  // monthly.data can be a single object (with dailyData) or an array (per-promoter summary)
  const reportData = monthly.data as any;
  const promoters = allPromoters.data ?? [];
  const years = [now.getFullYear() - 1, now.getFullYear()];

  // If filtered by promoter, we get a single report object with dailyData
  const hasDailyData = reportData && !Array.isArray(reportData) && Array.isArray(reportData.dailyData);
  const dailyBarData = hasDailyData
    ? (reportData.dailyData as { day: number; hours: number; photos: number; requests: number }[])
        .filter((d) => d.hours > 0 || d.photos > 0)
        .map((d) => ({ dia: `${d.day}`, horas: parseFloat(d.hours.toFixed(1)), fotos: d.photos }))
    : [];

  const pieData = hasDailyData && Array.isArray(reportData.photosByBrand)
    ? (reportData.photosByBrand as { brandName: string; brandColor: string; count: number }[]).filter((b) => b.count > 0)
    : [];

  // Per-promoter summary table (when no specific promoter is selected)
  const tableData = Array.isArray(reportData) ? reportData : [];

  // Totals
  const totals = hasDailyData
    ? {
        photos: reportData.totalPhotos ?? 0,
        materials: reportData.totalRequests ?? 0,
        visits: 0,
        workDays: reportData.workingDays ?? 0,
        hours: reportData.totalHours ?? 0,
      }
    : tableData.reduce(
        (acc: any, p: any) => ({
          photos: acc.photos + (p.approvedPhotos ?? 0),
          materials: acc.materials + (p.materialRequests ?? 0),
          visits: acc.visits + (p.storeVisits ?? 0),
          workDays: acc.workDays + (p.workDays ?? 0),
          hours: acc.hours + (p.totalHours ?? 0),
        }),
        { photos: 0, materials: 0, visits: 0, workDays: 0, hours: 0 }
      );

  // Per-promoter bar chart (when showing all)
  const promoterBarData = !hasDailyData && tableData.length > 0
    ? tableData.slice(0, 10).map((p: any) => ({
        name: p.promoterName?.split(" ")[0] ?? "—",
        fotos: p.approvedPhotos ?? 0,
        materiais: p.materialRequests ?? 0,
        visitas: p.storeVisits ?? 0,
      }))
    : [];

  const handleExportCSV = () => {
    const header = ["Promotor", "Fotos Aprovadas", "Materiais", "Visitas", "Dias Trabalhados", "Score"];
    const rows = tableData.map((p: any) => [
      p.promoterName ?? "—",
      p.approvedPhotos ?? 0,
      p.materialRequests ?? 0,
      p.storeVisits ?? 0,
      p.workDays ?? 0,
      p.score ?? 0,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${getMonthName(month)}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#22c55e", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Relatórios Mensais"
        subtitle={`${getMonthName(month)} ${year} · ${promoters.length} promotores`}
        icon={FileText}
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Exportar CSV
            </button>
            <button
              onClick={() => monthly.refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
          </div>
        }
      />

      {/* Period + Promoter selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {MONTHS.map((m) => (
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
        <select
          value={selectedPromoter ?? ""}
          onChange={(e) => setSelectedPromoter(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos os promotores</option>
          {promoters.map((p) => (
            <option key={p.id} value={p.id}>{p.name ?? `Promotor ${p.id}`}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Fotos Aprovadas", value: totals.photos, icon: Camera, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Materiais Solicitados", value: totals.materials, icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Visitas a PDVs", value: totals.visits, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Dias Trabalhados", value: totals.workDays, icon: Clock, color: "text-green-600", bg: "bg-green-50" },
          { label: "Horas Trabalhadas", value: `${totals.hours.toFixed(1)}h`, icon: Clock, color: "text-teal-600", bg: "bg-teal-50" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{monthly.isLoading ? "—" : item.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg}`}>
                <item.icon size={18} className={item.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {!monthly.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bar Chart: daily hours + photos (when promoter selected) OR per-promoter (when all) */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">
              {hasDailyData ? "Atividade Diária (horas e fotos)" : "Desempenho por Promotor"}
            </h3>
            {(hasDailyData ? dailyBarData : promoterBarData).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
                Sem dados para este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={hasDailyData ? dailyBarData : promoterBarData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey={hasDailyData ? "dia" : "name"}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    interval={hasDailyData ? 4 : 0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {hasDailyData ? (
                    <>
                      <Bar dataKey="horas" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Horas" />
                      <Bar dataKey="fotos" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Fotos" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="fotos" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Fotos" />
                      <Bar dataKey="materiais" fill="#f97316" radius={[3, 3, 0, 0]} name="Materiais" />
                      <Bar dataKey="visitas" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Visitas" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Chart: photos by brand */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Fotos por Marca</h3>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
                {hasDailyData ? "Nenhuma foto neste período" : "Selecione um promotor para ver o gráfico de marcas"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="brandName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ brandName, percent }) =>
                      `${brandName} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.brandColor && entry.brandColor !== "#6B7280" ? entry.brandColor : COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} fotos`, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Table — only shown when viewing all promoters */}
      {!hasDailyData && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promotor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fotos</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Materiais</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Visitas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Dias Trab.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monthly.isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Carregando...</td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum dado para {getMonthName(month)} {year}
                  </td>
                </tr>
              ) : (
                tableData.map((p: any, i: number) => (
                  <tr key={`report-${p.userId ?? i}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 text-xs font-semibold">
                            {p.promoterName?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{p.promoterName ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <ScoreRing score={p.score ?? 0} size={36} strokeWidth={3} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className="text-sm text-gray-700">{p.approvedPhotos ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className="text-sm text-gray-700">{p.materialRequests ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-sm text-gray-700">{p.storeVisits ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-sm text-gray-700">{p.workDays ?? 0}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
