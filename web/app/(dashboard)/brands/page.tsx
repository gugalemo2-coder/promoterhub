"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { Tag, RefreshCw, Plus, Pencil, X, Upload, Loader2 } from "lucide-react";
import { useState, useRef } from "react";

const PRESET_COLORS = [
  "#E53E3E", "#DD6B20", "#D69E2E", "#38A169", "#3182CE",
  "#805AD5", "#D53F8C", "#2D3748", "#0D9488", "#7C3AED",
];

type Brand = {
  id: number;
  name: string;
  description?: string | null;
  colorHex?: string | null;
  logoUrl?: string | null;
  sortOrder: number;
  status: "active" | "inactive";
};

type FormState = {
  name: string;
  description: string;
  colorHex: string;
  logoUrl: string;
  sortOrder: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  colorHex: "#3182CE",
  logoUrl: "",
  sortOrder: "0",
};

export default function BrandsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: brands, isLoading, refetch } = trpc.brandsAdmin.listAll.useQuery();

  const createMutation = trpc.brandsAdmin.create.useMutation({
    onSuccess: () => { refetch(); closeModal(); },
  });

  const updateMutation = trpc.brandsAdmin.update.useMutation({
    onSuccess: () => { refetch(); closeModal(); },
  });

  const toggleMutation = trpc.brandsAdmin.toggleStatus.useMutation({
    onSuccess: () => { refetch(); setConfirmToggleId(null); },
  });

  const uploadLogoMutation = trpc.brandsAdmin.uploadLogo.useMutation();

  const openCreate = () => {
    setEditingBrand(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      description: brand.description ?? "",
      colorHex: brand.colorHex ?? "#3182CE",
      logoUrl: brand.logoUrl ?? "",
      sortOrder: String(brand.sortOrder),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setForm(DEFAULT_FORM);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        const { url } = await uploadLogoMutation.mutateAsync({
          fileBase64: base64,
          fileType: file.type,
          fileName: file.name,
        });
        setForm((f) => ({ ...f, logoUrl: url }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      colorHex: form.colorHex as `#${string}`,
      logoUrl: form.logoUrl || undefined,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const brandToToggle = brands?.find((b) => b.id === confirmToggleId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Marcas"
        subtitle={`${brands?.length ?? 0} marca${(brands?.length ?? 0) !== 1 ? "s" : ""} cadastrada${(brands?.length ?? 0) !== 1 ? "s" : ""}`}
        icon={Tag}
        iconColor="text-purple-600"
        iconBg="bg-purple-50"
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
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Plus size={14} />
              Nova Marca
            </button>
          </div>
        }
      />

      {/* Confirm Toggle Modal */}
      {confirmToggleId !== null && brandToToggle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">
              {brandToToggle.status === "active" ? "Desativar marca" : "Ativar marca"}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Deseja {brandToToggle.status === "active" ? "desativar" : "ativar"} a marca{" "}
              <strong className="text-gray-800">{brandToToggle.name}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmToggleId(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  toggleMutation.mutate({
                    id: brandToToggle.id,
                    status: brandToToggle.status === "active" ? "inactive" : "active",
                  })
                }
                disabled={toggleMutation.isPending}
                className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50 ${
                  brandToToggle.status === "active"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {toggleMutation.isPending ? "Aguarde..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingBrand ? "Editar Marca" : "Nova Marca"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Logo preview + upload */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-100"
                  style={{ backgroundColor: form.colorHex }}
                >
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="Logo" className="w-16 h-16 object-cover" />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {form.name.charAt(0).toUpperCase() || "M"}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {uploading ? "Enviando..." : "Enviar Logo"}
                  </button>
                  {form.logoUrl && (
                    <button
                      onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                      className="mt-1 text-xs text-red-500 hover:text-red-700"
                    >
                      Remover logo
                    </button>
                  )}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Sinhá, LeitBom, Paraná..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-900"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição opcional da marca..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-900 resize-none"
                />
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor da Marca
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm((f) => ({ ...f, colorHex: color }))}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: form.colorHex === color ? "#1a1a1a" : "transparent",
                        transform: form.colorHex === color ? "scale(1.15)" : "scale(1)",
                      }}
                      title={color}
                    />
                  ))}
                  {/* Custom hex input */}
                  <div className="flex items-center gap-1.5 ml-1">
                    <div
                      className="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: form.colorHex }}
                    />
                    <input
                      type="text"
                      value={form.colorHex}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setForm((f) => ({ ...f, colorHex: v }));
                      }}
                      className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="#3182CE"
                    />
                  </div>
                </div>
              </div>

              {/* Ordem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  min={0}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">Menor número aparece primeiro</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !form.name.trim()}
                className="flex-1 px-4 py-2.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {isSaving ? "Salvando..." : editingBrand ? "Salvar Alterações" : "Criar Marca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brands Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (brands ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Tag size={28} className="text-purple-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700">Nenhuma marca cadastrada</p>
          <p className="text-sm text-gray-400">Clique em &quot;Nova Marca&quot; para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(brands ?? []).map((brand) => (
            <div
              key={brand.id}
              className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 transition-opacity ${
                brand.status === "inactive" ? "opacity-50" : ""
              }`}
            >
              {/* Brand header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: brand.colorHex ?? "#3182CE" }}
                >
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt={brand.name} className="w-12 h-12 object-cover" />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {brand.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{brand.name}</p>
                  {brand.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{brand.description}</p>
                  )}
                </div>
              </div>

              {/* Color + order */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: brand.colorHex ?? "#3182CE" }}
                  />
                  <span className="font-mono">{brand.colorHex ?? "—"}</span>
                </div>
                <span>·</span>
                <span>Ordem: {brand.sortOrder}</span>
              </div>

              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    brand.status === "active"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {brand.status === "active" ? "Ativa" : "Inativa"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                <button
                  onClick={() => openEdit(brand as Brand)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={() => setConfirmToggleId(brand.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    brand.status === "active"
                      ? "text-red-600 border border-red-100 hover:bg-red-50"
                      : "text-green-600 border border-green-100 hover:bg-green-50"
                  }`}
                >
                  {brand.status === "active" ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
