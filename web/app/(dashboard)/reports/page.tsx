"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { getMonthName, formatDate } from "@/lib/utils";
import { FileText, RefreshCw, Download, Users, Camera, Package, Clock } from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthly = trpc.reports.monthly.useQuery({ year, month });
  const allPromoters = trpc.reports.allPromoters.useQuery();

  const data = Array.isArray(monthly.data) ? monthly.data : monthly.data ? [monthly.data] : [];
  const promoters = allPromoters.data ?? [];

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const years = [now.getFullYear() - 1, now.getFullYear()];

  // Aggregate totals
  const totals = data.reduce(
    (acc, p: any) => ({
      photos: acc.photos + (p.approvedPhotos ?? 0),
      materials: acc.materials + (p.materialRequests ?? 0),
      visits: acc.visits + (p.storeVisits ?? 0),
      workDays: acc.workDays + (p.workDays ?? 0),
    }),
    { photos: 0, materials: 0, visits: 0, workDays: 0 }
  );

  // Chart data
  const chartData = data.slice(0, 10).map((p: any) => ({
    name: p.promoterName?.split(" ")[0] ?? "—",
    fotos: p.approvedPhotos ?? 0,
    materiais: p.materialRequests ?? 0,
    visitas: p.storeVisits ?? 0,
  }));

  const handleExportCSV = () => {
    const header = ["Promotor", "Fotos Aprovadas", "Materiais", "Visitas", "Dias Trabalhados", "Score"];
    const rows = data.map((p: any) => [
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Fotos Aprovadas", value: totals.photos, icon: Camera, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Materiais Solicitados", value: totals.materials, icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Visitas a PDVs", value: totals.visits, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Dias Trabalhados", value: totals.workDays, icon: Clock, color: "text-green-600", bg: "bg-green-50" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{monthly.isLoading ? "—" : item.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>
                <item.icon size={20} className={item.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!monthly.isLoading && chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Desempenho por Promotor</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="fotos" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Fotos" />
              <Bar dataKey="materiais" fill="#f97316" radius={[3, 3, 0, 0]} name="Materiais" />
              <Bar dataKey="visitas" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Visitas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
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
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                  Nenhum dado para {getMonthName(month)} {year}
                </td>
              </tr>
            ) : (
              data.map((p: any, i: number) => (
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
    </div>
  );
}
