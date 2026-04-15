"use client";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({ score, size = 44, strokeWidth = 3 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (clampedScore / 100) * circumference;

  const color =
    clampedScore >= 80
      ? "#22c55e"
      : clampedScore >= 50
        ? "#eab308"
        : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
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
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-xs font-bold text-gray-700">
        {Math.round(clampedScore)}
      </span>
    </div>
  );
}
