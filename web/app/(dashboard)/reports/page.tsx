"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { getMonthName } from "@/lib/utils";
import { FileText, RefreshCw, Download, Users, Camera, Package, Clock, FileDown } from "lucide-react";
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

  const reportData = monthly.data as any;
  const promoters = allPromoters.data ?? [];
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const hasDailyData = reportData && !Array.isArray(reportData) && Array.isArray(reportData.dailyData);
  const dailyBarData = hasDailyData
    ? (reportData.dailyData as { day: number; hours: number; photos: number; requests: number }[])
        .filter((d) => d.hours > 0 || d.photos > 0)
        .map((d) => ({ dia: `${d.day}`, horas: parseFloat(d.hours.toFixed(1)), fotos: d.photos }))
    : [];

  const pieData = hasDailyData && Array.isArray(reportData.photosByBrand)
    ? (reportData.photosByBrand as { brandName: string; brandColor: string; count: number }[]).filter((b) => b.count > 0)
    : [];

  const tableData = Array.isArray(reportData) ? reportData : [];

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

  const promoterBarData = !hasDailyData && tableData.length > 0
    ? tableData.slice(0, 10).map((p: any) => ({
        name: p.promoterName?.split(" ")[0] ?? "—",
        fotos: p.approvedPhotos ?? 0,
        materiais: p.materialRequests ?? 0,
        visitas: p.storeVisits ?? 0,
      }))
    : [];

  const handleExportPDF = () => {
    const monthLabel = getMonthName(month);
    const tableHead = hasDailyData
      ? "<tr><th>Dia</th><th>Horas Trabalhadas</th><th>Fotos</th></tr>"
      : "<tr><th>Promotor</th><th>Score</th><th>Fotos Aprovadas</th><th>Materiais</th><th>Visitas</th><th>Dias</th><th>Horas</th></tr>";
    const tableRows = hasDailyData
      ? (reportData.dailyData as any[])
          .filter((d: any) => d.hours > 0 || d.photos > 0)
          .map((d: any) => `<tr><td>${d.day}/${month}/${year}</td><td>${parseFloat(d.hours.toFixed(1))}h</td><td>${d.photos}</td></tr>`)
          .join("")
      : tableData
          .map((p: any) => `<tr><td>${p.promoterName ?? "—"}</td><td>${p.score ?? 0}%</td><td>${p.approvedPhotos ?? 0}</td><td>${p.materialRequests ?? 0}</td><td>${p.storeVisits ?? 0}</td><td>${p.workDays ?? 0}</td><td>${(p.totalHours ?? 0).toFixed(1)}h</td></tr>`)
          .join("");
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Relatório ${monthLabel} ${year}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{color:#1e40af;font-size:20px;margin-bottom:4px}p{color:#64748b;font-size:12px;margin:2px 0}.summary{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}.card{background:#eff6ff;border-radius:6px;padding:10px 16px;min-width:120px}.card .label{font-size:10px;color:#64748b;text-transform:uppercase}.card .value{font-size:16px;font-weight:bold;color:#1e40af}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th{background:#1e40af;color:#fff;padding:8px;text-align:left}td{padding:6px 8px;border-bottom:1px solid #e2e8f0}tr:nth-child(even) td{background:#eff6ff}.footer{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center}@media print{body{padding:0}}</style></head><body><h1>Relatório Mensal de Promotores</h1><p>Período: ${monthLabel} ${year}</p><p>Gerado em: ${new Date().toLocaleDateString("pt-BR")}</p><div class='summary'><div class='card'><div class='label'>Fotos</div><div class='value'>${totals.photos}</div></div><div class='card'><div class='label'>Materiais</div><div class='value'>${totals.materials}</div></div><div class='card'><div class='label'>Visitas</div><div class='value'>${totals.visits}</div></div><div class='card'><div class='label'>Dias</div><div class='value'>${totals.workDays}</div></div><div class='card'><div class='label'>Horas</div><div class='value'>${totals.hours.toFixed(1)}h</div></div></div><table><thead>${tableHead}</thead><tbody>${tableRows}</tbody></table><div class='footer'>PromoterHub · ${monthLabel} ${year}</div></body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); }, 500); }
  };

  const handleExportCSV = () => {
    const header = ["Promotor", "Fotos Aprovadas", "Materiais", "Visitas", "Dias Trabalhados", "Score"];
    const rows = tableData.map((p: any) => [p.promoterName ?? "—", p.approvedPhotos ?? 0, p.materialRequests ?? 0, p.storeVisits ?? 0, p.workDays ?? 0, p.score ?? 0]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `relatorio-${getMonthName(month)}-${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#22c55e", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Relatórios Mensais"
        subtitle={`${getMonthName(month)} ${year} · ${promoters.length} promotores`}
        icon={FileText}
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <FileDown size={14} />
              <span className="hidden sm:inline">Exportar</span> PDF
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={14} />
              CSV
            </button>
            <button onClick={() => monthly.refetch()} className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {/* Period + Promoter selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {MONTHS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {years.map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
        <select value={selectedPromoter ?? ""} onChange={(e) => setSelectedPromoter(e.target.value ? Number(e.target.value) : undefined)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex-1 sm:flex-none min-w-0">
          <option value="">Todos os promotores</option>
          {promoters.map((p) => (<option key={p.id} value={p.id}>{p.name ?? `Promotor ${p.id}`}</option>))}
        </select>
      </div>

      {/* Summary cards — responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Fotos Aprovadas", value: totals.photos, icon: Camera, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Materiais", value: totals.materials, icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Visitas", value: totals.visits, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Dias Trabalhados", value: totals.workDays, icon: Clock, color: "text-green-600", bg: "bg-green-50" },
          { label: "Horas", value: `${totals.hours.toFixed(1)}h`, icon: Clock, color: "text-teal-600", bg: "bg-teal-50" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight truncate">{item.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{monthly.isLoading ? "—" : item.value}</p>
              </div>
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                <item.icon size={16} className={item.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts — stack on mobile */}
      {!monthly.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm overflow-hidden">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">
              {hasDailyData ? "Atividade Diária" : "Desempenho por Promotor"}
            </h3>
            {(hasDailyData ? dailyBarData : promoterBarData).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Sem dados para este período</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hasDailyData ? dailyBarData : promoterBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey={hasDailyData ? "dia" : "name"} tick={{ fontSize: 10, fill: "#6b7280" }} interval={hasDailyData ? 4 : 0} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
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

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm overflow-hidden">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Fotos por Marca</h3>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm text-center px-4">
                {hasDailyData ? "Nenhuma foto neste período" : "Selecione um promotor para ver o gráfico de marcas"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="count" nameKey="brandName" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}
                  >
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.brandColor && entry.brandColor !== "#6B7280" ? entry.brandColor : COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: unknown, name: unknown) => [`${value} fotos`, String(name)]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Table — mobile cards + desktop table */}
      {!hasDailyData && (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {monthly.isLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
            ) : tableData.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhum dado para {getMonthName(month)} {year}</div>
            ) : (
              tableData.map((p: any, i: number) => (
                <div key={`report-${p.userId ?? i}-${i}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-xs font-semibold">{p.promoterName?.charAt(0)?.toUpperCase() ?? "?"}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">{p.promoterName ?? "—"}</span>
                    <ScoreRing score={p.score ?? 0} size={36} strokeWidth={3} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                    <div><span className="font-medium text-gray-700">{p.approvedPhotos ?? 0}</span> fotos</div>
                    <div><span className="font-medium text-gray-700">{p.materialRequests ?? 0}</span> mat.</div>
                    <div><span className="font-medium text-gray-700">{p.storeVisits ?? 0}</span> vis.</div>
                    <div><span className="font-medium text-gray-700">{p.workDays ?? 0}</span> dias</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promotor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fotos</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Materiais</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Visitas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Dias Trab.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthly.isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Carregando...</td></tr>
                ) : tableData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Nenhum dado para {getMonthName(month)} {year}</td></tr>
                ) : (
                  tableData.map((p: any, i: number) => (
                    <tr key={`report-${p.userId ?? i}-${i}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-700 text-xs font-semibold">{p.promoterName?.charAt(0)?.toUpperCase() ?? "?"}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{p.promoterName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center"><div className="flex justify-center"><ScoreRing score={p.score ?? 0} size={36} strokeWidth={3} /></div></td>
                      <td className="px-4 py-4 text-center"><span className="text-sm text-gray-700">{p.approvedPhotos ?? 0}</span></td>
                      <td className="px-4 py-4 text-center"><span className="text-sm text-gray-700">{p.materialRequests ?? 0}</span></td>
                      <td className="px-4 py-4 text-center hidden lg:table-cell"><span className="text-sm text-gray-700">{p.storeVisits ?? 0}</span></td>
                      <td className="px-4 py-4 text-center hidden lg:table-cell"><span className="text-sm text-gray-700">{p.workDays ?? 0}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
