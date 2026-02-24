import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected" | "active" | "inactive" | "open" | "resolved" | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "Aprovada", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejeitada", className: "bg-red-100 text-red-700 border-red-200" },
  active: { label: "Ativo", className: "bg-green-100 text-green-700 border-green-200" },
  inactive: { label: "Inativo", className: "bg-gray-100 text-gray-600 border-gray-200" },
  open: { label: "Aberto", className: "bg-orange-100 text-orange-700 border-orange-200" },
  resolved: { label: "Resolvido", className: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Concluído", className: "bg-green-100 text-green-700 border-green-200" },
  in_progress: { label: "Em Andamento", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
