"use client";
import { trpc } from "@/lib/trpc";
import { formatHours, getMonthName } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
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
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader title="Tempo por Loja" subtitle="Horas trabalhadas por promotor em cada loja" icon={Clock} iconColor="text-teal-600" iconBg="bg-teal-50" />

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <select value={promoterId ?? ""} onChange={(e) => setPromoterId(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", background: "white", minWidth: 200 }}>
          <option value="">Selecione um promotor</option>
          {promoterList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigateMonth(-1)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={16} style={{ color: "#6b7280" }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", minWidth: 90, textAlign: "center" }}>{getMonthName(month)} {year}</span>
          <button onClick={() => navigateMonth(1)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} style={{ color: "#6b7280" }} />
          </button>
        </div>
      </div>

      {!promoterId ? (
        <div style={{ textAlign: "center", padding: 80, color: "#9ca3af", fontSize: 14 }}>
          <Clock size={44} style={{ color: "#d1d5db", margin: "0 auto 12px" }} />
          Selecione um promotor para visualizar as horas por loja
        </div>
      ) : stats.isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>Carregando...</div>
      ) : storeStats.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>Nenhum dado encontrado para este período</div>
      ) : (
        <>
          {/* Chart */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16, margin: "0 0 16px" }}>Distribuição de Tempo por Loja</h3>
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40, 200)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => formatHours(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} width={130} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value: number) => [formatHours(value), "Tempo"]}
                />
                <Bar dataKey="minutos" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  {["Loja", "Tempo Total", "Visitas"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storeStats.map((s: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: "#111827" }}>{s.storeName ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>{formatHours(s.totalMinutes ?? 0)}</td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>{s.visitCount ?? 0}</td>
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
