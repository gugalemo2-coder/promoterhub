"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { FileSignature, RefreshCw, CheckCircle, X, Loader2, Download, History } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
}

function SignatureCanvas({ onSign, onClear }: { onSign: (data: string) => void; onClear: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#1a202c";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setDrawing(false);
    if (hasDrawn) {
      onSign(canvasRef.current!.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    setHasDrawn(false);
    onClear();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={180}
        className="bg-white border-2 border-dashed border-gray-300 rounded-xl cursor-crosshair w-full max-w-md"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <p className="text-xs text-gray-400">Assine com o mouse na área acima</p>
      {hasDrawn && (
        <button
          onClick={clear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <X size={12} />
          Limpar assinatura
        </button>
      )}
    </div>
  );
}

export default function SignReportPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedPromoter, setSelectedPromoter] = useState<number | undefined>(undefined);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: promoters } = trpc.reports.allPromoters.useQuery();
  const { data: monthlyData, isLoading: loadingReport } = trpc.reports.monthly.useQuery({
    year: selectedYear,
    month: selectedMonth,
    userId: selectedPromoter,
  });
  const { data: signedHistory, refetch: refetchHistory } = trpc.signedReports.listByManager.useQuery();

  const createSignedReportMutation = trpc.signedReports.create.useMutation({
    onSuccess: (data) => {
      setLastReportId(data.reportId);
      setShowSignModal(false);
      setShowSuccess(true);
      refetchHistory();
    },
    onError: (e) => alert(e.message),
  });

  const handleSign = () => {
    if (!signatureData) {
      alert("Por favor, assine o relatório antes de confirmar.");
      return;
    }
    const reportContent = JSON.stringify({
      month: selectedMonth,
      year: selectedYear,
      promoterId: selectedPromoter,
      totalHours: monthlyData?.totalHours ?? 0,
      totalPhotos: monthlyData?.totalPhotos ?? 0,
      signedAt: new Date().toISOString(),
    });
    const reportHash = hashString(reportContent + signatureData.slice(0, 100));
    createSignedReportMutation.mutate({
      month: selectedMonth,
      year: selectedYear,
      promoterId: selectedPromoter,
      signatureData,
      reportHash,
    });
  };

  const handleExport = (reportId: string) => {
    const verifyUrl = `https://promoterhub.app/verify/${reportId}`;
    const content = `RELATÓRIO ASSINADO DIGITALMENTE\n\nCódigo: ${reportId}\nMês: ${MONTHS[selectedMonth - 1]}/${selectedYear}\n${selectedPromoter ? `Promotor ID: ${selectedPromoter}` : "Todos os promotores"}\n\nDADOS DO PERÍODO:\n• Total de horas: ${(monthlyData?.totalHours ?? 0).toFixed(1)}h\n• Fotos enviadas: ${monthlyData?.totalPhotos ?? 0}\n• Materiais solicitados: ${monthlyData?.totalRequests ?? 0}\n\nVERIFICAÇÃO:\nAcesse ${verifyUrl} para verificar a autenticidade deste relatório.\n\nAssinado digitalmente em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${reportId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Assinar Relatório"
        subtitle="Assine digitalmente e gere código de verificação"
        icon={FileSignature}
        iconColor="text-violet-600"
        iconBg="bg-violet-50"
        actions={
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <History size={14} />
            Histórico
          </button>
        }
      />

      {/* Success Banner */}
      {showSuccess && lastReportId && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">Relatório assinado com sucesso!</p>
            <p className="text-xs text-green-600 mt-0.5">Código de verificação: <strong>{lastReportId}</strong></p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport(lastReportId)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Download size={12} />
              Exportar
            </button>
            <button onClick={() => setShowSuccess(false)} className="p-1 text-green-400 hover:text-green-600">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Period & Promoter Selection */}
        <div className="space-y-5">
          {/* Year selector */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-3">📅 Período do Relatório</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ano</p>
            <div className="flex gap-2 mb-4">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    selectedYear === y
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-violet-300"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mês</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTHS.map((m, i) => {
                const idx = i + 1;
                const active = selectedMonth === idx;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(idx)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Promoter selector */}
          {promoters && promoters.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-900 mb-3">👤 Promotor (opcional)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedPromoter(undefined)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                    !selectedPromoter
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"
                  }`}
                >
                  Todos
                </button>
                {promoters.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPromoter(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                      selectedPromoter === p.id
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"
                    }`}
                  >
                    {p.name ?? `Promotor ${p.id}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Report Preview */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-4">📊 Resumo do Período</p>
            {loadingReport ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-violet-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Período", value: `${MONTHS[selectedMonth - 1]} ${selectedYear}` },
                  { label: "Horas trabalhadas", value: `${(monthlyData?.totalHours ?? 0).toFixed(1)}h` },
                  { label: "Visitas realizadas", value: String(monthlyData?.workingDays ?? 0) },
                  { label: "Fotos enviadas", value: String(monthlyData?.totalPhotos ?? 0) },
                  { label: "Materiais solicitados", value: String(monthlyData?.totalRequests ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sign button */}
          <button
            onClick={() => setShowSignModal(true)}
            className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileSignature size={18} />
            Assinar Relatório Digitalmente
          </button>
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Histórico de Relatórios Assinados</h3>
            <span className="text-xs text-gray-400">{signedHistory?.length ?? 0} relatórios</span>
          </div>
          {!signedHistory || signedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FileSignature size={24} className="text-gray-300" />
              <p className="text-sm text-gray-400">Nenhum relatório assinado ainda.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Período</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Promotor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Data</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {signedHistory.map((r, idx) => (
                  <tr key={`${r.reportId}-${idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-violet-700 bg-violet-50 px-2 py-1 rounded-lg">
                        {r.reportId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-700">{MONTHS[r.month - 1].slice(0, 3)}/{r.year}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="text-xs text-gray-500">{(r as unknown as { promoterName?: string }).promoterName ?? "Todos"}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="text-xs text-gray-400">
                        {new Date(r.signedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleExport(r.reportId)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Download size={11} />
                        Exportar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Assinar Relatório</h2>
              <button onClick={() => setShowSignModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
                <p><strong>Período:</strong> {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                <p><strong>Horas:</strong> {(monthlyData?.totalHours ?? 0).toFixed(1)}h</p>
                <p><strong>Fotos:</strong> {monthlyData?.totalPhotos ?? 0}</p>
              </div>
              <SignatureCanvas
                onSign={(data) => setSignatureData(data)}
                onClear={() => setSignatureData(null)}
              />
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowSignModal(false)}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSign}
                disabled={!signatureData || createSignedReportMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createSignedReportMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                {createSignedReportMutation.isPending ? "Assinando..." : "Confirmar Assinatura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
