"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Insight {
  type: "positive" | "negative" | "warning" | "info";
  category?: string;
  text: string;
}

const typeConfig = {
  positive: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  negative: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
};

export function AutoInsights({ title, insights }: { title: string; insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {insights.map((insight, i) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 px-3 py-2 rounded-lg border text-xs leading-relaxed",
                config.bg, config.border
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.color)} />
              <div>
                {insight.category && (
                  <span className="font-semibold text-muted-foreground mr-1.5">[{insight.category}]</span>
                )}
                <span className="text-foreground">{insight.text}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface LenderData {
  label: string;
  disbursed_count?: number;
  lmtd_disbursed_count?: number;
  mtd?: number;
  lmtd?: number;
}

interface ExecutiveInsightInput {
  totalDisbursed: number;
  lmtdDisbursed: number;
  achievedCr: number;
  aopCr: number;
  projectedCr: number;
  byLender: LenderData[];
}

export function generateExecutiveInsights(input: ExecutiveInsightInput): Insight[] {
  const insights: Insight[] = [];
  const { totalDisbursed, lmtdDisbursed, achievedCr, aopCr, projectedCr, byLender: rawByLender } = input;
  const byLender = rawByLender.map((l) => ({
    label: l.label,
    mtd: l.mtd ?? l.disbursed_count ?? 0,
    lmtd: l.lmtd ?? l.lmtd_disbursed_count ?? 0,
  }));

  // Volume trend
  const volumeGrowth = lmtdDisbursed > 0 ? ((totalDisbursed - lmtdDisbursed) / lmtdDisbursed) * 100 : 0;
  if (volumeGrowth > 5) {
    insights.push({
      type: "positive",
      category: "Volume",
      text: `Disbursals are up ${volumeGrowth.toFixed(1)}% vs LMTD (${totalDisbursed.toLocaleString("en-IN")} vs ${lmtdDisbursed.toLocaleString("en-IN")}).`,
    });
  } else if (volumeGrowth < -5) {
    insights.push({
      type: "negative",
      category: "Volume",
      text: `Disbursals are down ${Math.abs(volumeGrowth).toFixed(1)}% vs LMTD (${totalDisbursed.toLocaleString("en-IN")} vs ${lmtdDisbursed.toLocaleString("en-IN")}).`,
    });
  }

  // AOP pacing
  const aopPacing = aopCr > 0 ? (achievedCr / (aopCr / 12)) * 100 : 0;
  if (aopPacing >= 100) {
    insights.push({
      type: "positive",
      category: "AOP",
      text: `On track for AOP — ${achievedCr.toFixed(1)} Cr achieved (${aopPacing.toFixed(0)}% of monthly target).`,
    });
  } else if (aopPacing >= 80) {
    insights.push({
      type: "warning",
      category: "AOP",
      text: `Slightly behind AOP — ${achievedCr.toFixed(1)} Cr achieved (${aopPacing.toFixed(0)}% of monthly target). Projected: ${projectedCr.toFixed(1)} Cr.`,
    });
  } else {
    insights.push({
      type: "negative",
      category: "AOP",
      text: `Behind AOP — only ${achievedCr.toFixed(1)} Cr achieved (${aopPacing.toFixed(0)}% of monthly target). Projected: ${projectedCr.toFixed(1)} Cr.`,
    });
  }

  // Top and bottom lenders
  const sorted = [...byLender].sort((a, b) => b.mtd - a.mtd);
  if (sorted.length > 0) {
    const top = sorted[0];
    insights.push({
      type: "info",
      category: "Lender",
      text: `Top contributor: ${top.label} with ${top.mtd.toLocaleString("en-IN")} disbursals.`,
    });
  }

  // Declining lenders
  const declining = byLender.filter((l) => l.lmtd > 0 && ((l.mtd - l.lmtd) / l.lmtd) * 100 < -15);
  if (declining.length > 0) {
    insights.push({
      type: "warning",
      category: "Lender",
      text: `${declining.length} lender(s) declining >15% vs LMTD: ${declining.map((l) => l.label.split(" / ")[0]).join(", ")}.`,
    });
  }

  return insights;
}
