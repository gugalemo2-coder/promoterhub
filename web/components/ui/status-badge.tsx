"use client";

interface StatusBadgeProps {
  status: "active" | "inactive" | "open" | "resolved" | "pending";
}

const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active:   { label: "Ativo",     bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  inactive: { label: "Inativo",   bg: "bg-gray-50",   text: "text-gray-600",   dot: "bg-gray-400" },
  open:     { label: "Aberto",    bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
  resolved: { label: "Resolvido", bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  pending:  { label: "Pendente",  bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status] ?? config.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
