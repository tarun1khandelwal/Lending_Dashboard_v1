"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  delta?: number | null; // percentage change vs LMTD
  deltaLabel?: string;
  icon?: React.ReactNode;
}

export function KPICard({
  title,
  value,
  subtitle,
  delta,
  deltaLabel = "vs LMTD",
  icon,
}: KPICardProps) {
  const isPositive = delta !== null && delta !== undefined && delta > 0;
  const isNegative = delta !== null && delta !== undefined && delta < 0;
  const isNeutral = delta === 0 || delta === null || delta === undefined;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {icon}
            </div>
          )}
        </div>

        {delta !== null && delta !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                isPositive && "bg-emerald-50 text-emerald-700",
                isNegative && "bg-red-50 text-red-700",
                isNeutral && "bg-gray-50 text-gray-600"
              )}
            >
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              {isNeutral && <Minus className="h-3 w-3" />}
              {isPositive ? "+" : ""}
              {delta.toFixed(1)}%
            </div>
            <span className="text-[11px] text-muted-foreground">
              {deltaLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
