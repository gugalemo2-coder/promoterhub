"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { BarChart3, RefreshCw, ChevronLeft, ChevronRight, Download, AlertTriangle } from "lucide-react";
import { useState } from "react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function scoreColor(score: number): string {
  if (score >= 70) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function scoreBg(score: number): string {
  if (score >= 70) return "#D1FAE5";
  if (score >= 40) return "#FEF3C7";
  return "#FEE2E2";
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function MedalEmoji({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
      #{rank}
    </span>
  );
}

export default function StoreDashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedPromoterId, setSelectedPromoterId] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const { data: promoters } = trpc.storePerformance.promoters.useQuery();
  const { data, isLoading, refetch } = trpc.storePerformance.ranking.useQuery({
    year,
    month,
    promoterId: selectedPromoterId,
  });

  const stores = data ?? [];
  const maxVisits = Math.max(...stores.map((s) => s.totalVisits), 1);
  const maxPhotos = Math.max(...stores.map((s) => s.totalPhotos), 1);
  const maxCoverage = Math.max(...stores.map((s) => s.totalCoverageMinutes), 1);

  const totalVisits = stores.reduce((a, s) => a + s.totalVisits, 0);
  const totalPhotos = stores.reduce((a, s) => a + s.totalPhotos, 0);
  const totalCoverage = (stores.reduce((a, s) => a + s.totalCoverageMinutes, 0) / 60).toFixed(1);
  const avgScore = stores.length > 0 ? Math.round(stores.reduce((a, s) => a + s.score, 0) / stores.length) : 0;

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const handleExport = () => {
    if (stores.length === 0) return;
    setExporting(true);
    const monthName = MONTHS[month - 1];
    const verificationCode = `PMH-${year}${String(month).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const generatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const tableRows = stores.map((s, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
      const coverage = (s.totalCoverageMinutes / 60).toFixed(1);
      const approvalRate = Math.round(s.photoApprovalRate * 100);
      return `<tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"}">
        <td style="padding:10px 12px;text-align:center;font-size:18px">${medal}</td>
        <td style="padding:10px 12px;font-weight:600;color:#111827">${s.storeName}</td>
        <td style="padding:10px 12px;text-align:center">${s.totalVisits}</td>
        <td style="padding:10px 12px;text-align:center">${s.totalPhotos}</td>
        <td style="padding:10px 12px;text-align:center">${approvalRate}%</td>
        <td style="padding:10px 12px;text-align:center">${coverage}h</td>
        <td style="padding:10px 12px;text-align:center">${Math.round(s.materialApprovalRate * 100)}%</td>
        <td style="padding:10px 12px;text-align:center">
          <span style="background:${s.score >= 70 ? "#d1fae5" : s.score >= 40 ? "#fef3c7" : "#fee2e2"};color:${s.score >= 70 ? "#065f46" : s.score >= 40 ? "#92400e" : "#991b1b"};padding:4px 10px;border-radius:20px;font-weight:700">${s.score}</span>
        </td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ranking PDVs ${monthName} ${year}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#374151}.header{background:linear-gradient(135deg,#1e40af,#0e7490);color:white;padding:32px 40px}.header h1{font-size:26px;font-weight:800;margin-bottom:4px}.header p{font-size:14px;opacity:.85}.summary{display:flex;gap:16px;padding:24px 40px;background:#f8fafc;border-bottom:1px solid #e5e7eb}.summary-card{flex:1;background:white;border-radius:12px;padding:16px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08)}.summary-card .num{font-size:28px;font-weight:800;color:#1e40af}.summary-card .label{font-size:12px;color:#6b7280;margin-top:4px}.section{padding:24px 40px}table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#1e40af;color:white}thead th{padding:12px;text-align:center;font-weight:600}thead th:nth-child(2){text-align:left}.footer{padding:24px 40px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:12px;color:#9ca3af}</style>
    </head><body>
    <div class="header"><h1>PromoterHub — Ranking de PDVs</h1><p>${monthName} ${year} · ${stores.length} pontos de venda · Score médio: ${avgScore} pts</p></div>
    <div class="summary">
      <div class="summary-card"><div class="num">${stores.length}</div><div class="label">PDVs avaliados</div></div>
      <div class="summary-card"><div class="num">${totalVisits}</div><div class="label">Visitas totais</div></div>
      <div class="summary-card"><div class="num">${totalPhotos}</div><div class="label">Fotos enviadas</div></div>
      <div class="summary-card"><div class="num">${totalCoverage}h</div><div class="label">Cobertura total</div></div>
      <div class="summary-card"><div class="num">${avgScore}</div><div class="label">Score médio</div></div>
    </div>
    <div class="section"><h2 style="font-size:18px;font-weight:700;color:#111827;margin-bottom:16px">Ranking Completo</h2>
    <table><thead><tr><th>Pos.</th><th style="text-align:left">PDV</th><th>Visitas</th><th>Fotos</th><th>Aprovação</th><th>Cobertura</th><th>Materiais</th><th>Score</th></tr></thead>
    <tbody>${tableRows}</tbody></table>
    <p style="margin-top:12px;font-size:12px;color:#0369a1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px">
      <strong>Fórmula:</strong> Visitas 25% + Fotos 20% + Qualidade de fotos 20% + Cobertura 20% + Materiais 10% − Alertas 5%
    </p></div>
    <div class="footer"><span>Gerado em ${generatedAt} · PromoterHub</span><span>Cód. verificação: <strong>${verificationCode}</strong></span></div>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking_pdvs_${monthName}_${year}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard de PDVs"
        subtitle="Ranking de pontos de venda por score composto"
        icon={BarChart3}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-50"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || stores.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
            >
              <Download size={14} />
              Exportar
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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

        {/* Promoter filter */}
        <select
          value={selectedPromoterId ?? ""}
          onChange={(e) => setSelectedPromoterId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todos os promotores</option>
          {promoters?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "PDVs avaliados", value: stores.length, color: "text-indigo-600" },
          { label: "Visitas totais", value: totalVisits, color: "text-blue-600" },
          { label: "Fotos enviadas", value: totalPhotos, color: "text-green-600" },
          { label: "Cobertura total", value: `${totalCoverage}h`, color: "text-orange-600" },
          { label: "Score médio", value: avgScore, color: scoreColor(avgScore) },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Ranking Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <BarChart3 size={28} className="text-indigo-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700">Nenhum dado para este período</p>
          <p className="text-sm text-gray-400">Selecione outro mês ou verifique se há visitas registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Pos.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PDV</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Visitas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fotos</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Aprovação</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Cobertura</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Alertas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.map((store, idx) => {
                const color = scoreColor(store.score);
                const bg = scoreBg(store.score);
                const coverage = (store.totalCoverageMinutes / 60).toFixed(1);
                const approvalRate = Math.round(store.photoApprovalRate * 100);
                return (
                  <tr key={`${store.storeId}-${idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <MedalEmoji rank={store.rank} />
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-gray-900">{store.storeName}</p>
                      {(store.city || store.state) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[store.city, store.state].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{store.totalVisits}</p>
                        <MiniBar value={store.totalVisits} max={maxVisits} color="#3B82F6" />
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{store.totalPhotos}</p>
                        <MiniBar value={store.totalPhotos} max={maxPhotos} color="#8B5CF6" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-sm font-medium text-gray-700">{approvalRate}%</span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{coverage}h</p>
                        <MiniBar value={store.totalCoverageMinutes} max={maxCoverage} color="#F59E0B" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center hidden xl:table-cell">
                      {store.totalAlerts > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle size={13} className="text-red-500" />
                          <span className="text-sm font-medium text-red-600">{store.totalAlerts}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="inline-flex items-center justify-center w-12 h-8 rounded-full text-sm font-bold"
                        style={{ backgroundColor: bg, color }}
                      >
                        {store.score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              <strong>Fórmula do score:</strong> Visitas 25% + Fotos 20% + Qualidade de fotos 20% + Cobertura 20% + Materiais 10% − Alertas 5%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
