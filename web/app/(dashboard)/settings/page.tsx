"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { Settings, Save, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

const DEFAULT_SETTINGS = {
  weightPhotos: 30,
  weightHours: 25,
  weightVisits: 25,
  weightMaterials: 10,
  weightQuality: 10,
  notifyLowHours: true,
  notifyPhotoRejected: true,
  notifyMaterialRequest: true,
};

export default function SettingsPage() {
  const settingsQuery = trpc.settings.get.useQuery();
  const saveMutation = trpc.settings.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      settingsQuery.refetch();
    },
  });

  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        weightPhotos: settingsQuery.data.weightPhotos ?? DEFAULT_SETTINGS.weightPhotos,
        weightHours: settingsQuery.data.weightHours ?? DEFAULT_SETTINGS.weightHours,
        weightVisits: settingsQuery.data.weightVisits ?? DEFAULT_SETTINGS.weightVisits,
        weightMaterials: settingsQuery.data.weightMaterials ?? DEFAULT_SETTINGS.weightMaterials,
        weightQuality: settingsQuery.data.weightQuality ?? DEFAULT_SETTINGS.weightQuality,
        notifyLowHours: settingsQuery.data.notifyLowHours ?? DEFAULT_SETTINGS.notifyLowHours,
        notifyPhotoRejected: settingsQuery.data.notifyPhotoRejected ?? DEFAULT_SETTINGS.notifyPhotoRejected,
        notifyMaterialRequest: settingsQuery.data.notifyMaterialRequest ?? DEFAULT_SETTINGS.notifyMaterialRequest,
      });
    }
  }, [settingsQuery.data]);

  const totalWeight = form.weightPhotos + form.weightHours + form.weightVisits + form.weightMaterials + form.weightQuality;
  const weightsValid = totalWeight === 100;

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const adjustWeight = (key: keyof typeof form, delta: number) => {
    const current = form[key] as number;
    const next = Math.max(0, Math.min(100, current + delta));
    update(key, next);
  };

  const handleSave = () => {
    if (!weightsValid) return;
    saveMutation.mutate({ ...form, geoRadiusKm: "0.5" });
  };

  const scoreWeights = [
    { key: "weightPhotos" as const, label: "Fotos Aprovadas", color: "bg-purple-500" },
    { key: "weightHours" as const, label: "Horas Trabalhadas", color: "bg-green-500" },
    { key: "weightVisits" as const, label: "Visitas a PDVs", color: "bg-blue-500" },
    { key: "weightMaterials" as const, label: "Materiais Solicitados", color: "bg-orange-500" },
    { key: "weightQuality" as const, label: "Qualidade das Fotos", color: "bg-pink-500" },
  ];

  const notifications = [
    { key: "notifyLowHours" as const, label: "Horas Insuficientes", desc: "Notificar quando promotor tiver poucas horas registradas" },
    { key: "notifyPhotoRejected" as const, label: "Rejeição de Fotos", desc: "Notificar quando foto for rejeitada" },
    { key: "notifyMaterialRequest" as const, label: "Solicitação de Materiais", desc: "Notificar quando promotor solicitar material" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Configurações"
        subtitle="Score e notificações"
        icon={Settings}
        iconColor="text-gray-600"
        iconBg="bg-gray-100"
        actions={
          <button
            onClick={handleSave}
            disabled={!dirty || !weightsValid || saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </button>
        }
      />

      {settingsQuery.isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando configurações...</div>
      ) : (
        <div className="space-y-6">
          {/* Score Weights */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">Pesos do Score</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                weightsValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                Total: {totalWeight}% {weightsValid ? "✓" : "(deve ser 100%)"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Defina a importância de cada métrica no score final</p>

            {/* Visual bar */}
            <div className="flex h-2 rounded-full overflow-hidden mb-5">
              {scoreWeights.map((w) => (
                <div
                  key={w.key}
                  className={w.color}
                  style={{ width: `${form[w.key]}%`, transition: "width 0.2s" }}
                />
              ))}
            </div>

            <div className="space-y-3">
              {scoreWeights.map((w) => (
                <div key={w.key} className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${w.color}`} />
                  <span className="text-xs sm:text-sm text-gray-700 flex-1 min-w-0 truncate">{w.label}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => adjustWeight(w.key, -5)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-gray-900">{form[w.key]}%</span>
                    <button
                      onClick={() => adjustWeight(w.key, 5)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Notificações Push</h3>
            <p className="text-xs text-gray-500 mb-4">Escolha quais eventos geram notificações</p>
            <div className="space-y-4">
              {notifications.map((n) => (
                <div key={n.key} className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => update(n.key, !form[n.key])}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                      form[n.key] ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      form[n.key] ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saveMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
              ✓ Configurações salvas com sucesso!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
