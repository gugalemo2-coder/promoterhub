"use client";
import { trpc } from "@/lib/trpc";
import { formatHours, getMonthName } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Clock, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StoreTimePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [promoterId, setPromoterId] = useState<number | undefined>(undefined);

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const stats = trpc.timeEntries.storeTimeStats.useQuery(
    { promoterId: promoterId!, startDate, endDate },
    { enabled: !!promoterId }
  );
  const promoters = trpc.stores.listPromoterUsers.useQuery();

  const promoterList = (promoters.data ?? []) as any[];
  const storeStats = (stats.data ?? []) as any[];

  const chartData = storeStats.map((s: any) => ({
    name: (s.storeName ?? "Loja").length > 15 ? (s.storeName ?? "Loja").slice(0, 14) + "…" : (s.storeName ?? "Loja"),
    minutos: s.totalMinutes ?? 0,
    horas: formatHours(s.totalMinutes ?? 0),
  }));

  const navigateMonth = (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <PageHeader title="Tempo por Loja" subtitle="Horas trabalhadas por promotor em cada loja" icon={Clock} iconColor="text-teal-600" iconBg="bg-teal-50" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <select
          value={promoterId ?? ""}
          onChange={(e) => setPromoterId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-full sm:min-w-[200px] sm:w-auto"
        >
          <option value="">Selecione um promotor</option>
          {promoterList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex items-center gap-2 self-start">
          <button onClick={() => navigateMonth(-1)} className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-900 min-w-[100px] text-center">{getMonthName(month)} {year}</span>
          <button onClick={() => navigateMonth(1)} className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {!promoterId ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Clock size={44} className="text-gray-200" />
          <p className="text-sm text-gray-400 text-center">Selecione um promotor para visualizar as horas por loja</p>
        </div>
      ) : stats.isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
      ) : storeStats.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Nenhum dado encontrado para este período</div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribuição de Tempo por Loja</h3>
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40, 200)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => formatHours(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} width={120} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value: number) => [formatHours(value), "Tempo"]}
                />
                <Bar dataKey="minutos" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mobile Cards (below md) */}
          <div className="flex flex-col gap-3 md:hidden">
            {storeStats.map((s: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-teal-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">{s.storeName ?? "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium text-gray-700">{formatHours(s.totalMinutes ?? 0)}</span> trabalhadas
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{s.visitCount ?? 0}</span> visita{(s.visitCount ?? 0) !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (md+) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Loja</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tempo Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Visitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {storeStats.map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{s.storeName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{formatHours(s.totalMinutes ?? 0)}</td>
                    <td className="px-4 py-3 text-gray-700">{s.visitCount ?? 0}</td>
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
