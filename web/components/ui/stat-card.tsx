import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: number;
  trendLabel?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  trend,
  trendLabel,
  className,
}: StatCardProps) {
  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === undefined ? "" : trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-gray-400";

  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {TrendIcon && trend !== undefined && (
            <div className={cn("flex items-center gap-1 mt-2", trendColor)}>
              <TrendIcon size={12} />
              <span className="text-xs font-medium">
                {Math.abs(trend)}% {trendLabel ?? "vs mês anterior"}
              </span>
            </div>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3", iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}
