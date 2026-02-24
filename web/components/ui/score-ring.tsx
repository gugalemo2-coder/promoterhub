import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function ScoreRing({ score, size = 56, strokeWidth = 5, className, showLabel = true }: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  const color =
    progress >= 80 ? "#16a34a" :
    progress >= 60 ? "#ca8a04" :
    progress >= 40 ? "#ea580c" :
    "#dc2626";

  const bgColor =
    progress >= 80 ? "#dcfce7" :
    progress >= 60 ? "#fef9c3" :
    progress >= 40 ? "#ffedd5" :
    "#fee2e2";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span
          className="absolute text-xs font-bold"
          style={{ color }}
        >
          {Math.round(progress)}
        </span>
      )}
    </div>
  );
}
