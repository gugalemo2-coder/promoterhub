"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import { Package, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

export default function MaterialsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "delivered" | "cancelled" | undefined>(undefined);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const requests = trpc.materialRequests.listAll.useQuery({
    status,
    limit: 100,
  });

  const approve = trpc.materialRequests.approve.useMutation({
    onSuccess: () => requests.refetch(),
  });

  const reject = trpc.materialRequests.reject.useMutation({
    onSuccess: () => {
      requests.refetch();
      setRejectId(null);
      setRejectReason("");
    },
  });

  const data = requests.data ?? [];

  const statusTabs = [
    { key: undefined, label: "Todas" },
    { key: "pending" as const, label: "Pendentes" },
    { key: "approved" as const, label: "Aprovadas" },
    { key: "rejected" as const, label: "Rejeitadas" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Solicitações de Materiais"
        subtitle={`${data.length} solicitações encontradas`}
        icon={Package}
        iconColor="text-orange-600"
        iconBg="bg-orange-50"
        actions={
          <button
            onClick={() => requests.refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        }
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === tab.key
                ? "bg-orange-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reject modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Motivo da rejeição</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => reject.mutate({ id: rejectId, rejectionReason: rejectReason || "Sem motivo informado" })}
                disabled={reject.isPending}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">PDV</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material ID</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtd.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridade</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Data</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {requests.isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Carregando...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                  Nenhuma solicitação encontrada
                </td>
              </tr>
            ) : (
              data.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-gray-900">#{req.id}</span>
                    {req.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{req.notes}</p>}
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-700">PDV #{req.storeId}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-700">#{req.materialId}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-medium text-gray-900">{req.quantityRequested}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      req.priority === "high" ? "bg-red-50 text-red-700" :
                      req.priority === "medium" ? "bg-yellow-50 text-yellow-700" :
                      "bg-gray-50 text-gray-600"
                    }`}>
                      {req.priority === "high" ? "Alta" : req.priority === "medium" ? "Média" : "Baixa"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StatusBadge status={req.status ?? "pending"} />
                  </td>
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <span className="text-xs text-gray-500">{formatDateTime(req.createdAt)}</span>
                  </td>
                  <td className="px-4 py-4">
                    {req.status === "pending" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => approve.mutate({ id: req.id })}
                          disabled={approve.isPending}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={11} />
                          Aprovar
                        </button>
                        <button
                          onClick={() => setRejectId(req.id)}
                          disabled={reject.isPending}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={11} />
                          Rejeitar
                        </button>
                      </div>
                    )}
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
