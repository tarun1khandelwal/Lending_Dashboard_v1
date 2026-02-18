"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface BreakdownRow {
  label: string;
  disbursed_count: number;
  lmtd_disbursed_count: number;
  amount_cr: number;
  lmtd_amount_cr: number;
  ats_lakhs: number;
  lmtd_ats_lakhs: number;
  aop_cr?: number;
}

type SortKey =
  | "label"
  | "disbursed_count"
  | "lmtd_disbursed_count"
  | "amount_cr"
  | "lmtd_amount_cr"
  | "ats_lakhs"
  | "lmtd_ats_lakhs"
  | "count_growth"
  | "amount_growth"
  | "ats_growth"
  | "aop_cr"
  | "aop_pct";

interface BreakdownTableProps {
  title: string;
  data: BreakdownRow[];
  showAOP?: boolean;
}

function growthPct(current: number, lmtd: number): number | null {
  if (lmtd === 0) return null;
  return ((current - lmtd) / lmtd) * 100;
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-[10px] text-muted-foreground">-</span>;
  return (
    <span
      className={cn(
        "text-[10px] font-semibold tabular-nums",
        value > 0
          ? "text-emerald-600"
          : value < 0
          ? "text-red-600"
          : "text-muted-foreground"
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function BreakdownTable({
  title,
  data,
  showAOP = false,
}: BreakdownTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("amount_cr");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const getSortVal = (row: BreakdownRow, key: SortKey): number => {
    switch (key) {
      case "disbursed_count": return row.disbursed_count;
      case "lmtd_disbursed_count": return row.lmtd_disbursed_count;
      case "amount_cr": return row.amount_cr;
      case "lmtd_amount_cr": return row.lmtd_amount_cr;
      case "ats_lakhs": return row.ats_lakhs;
      case "lmtd_ats_lakhs": return row.lmtd_ats_lakhs;
      case "count_growth": return growthPct(row.disbursed_count, row.lmtd_disbursed_count) ?? -999;
      case "amount_growth": return growthPct(row.amount_cr, row.lmtd_amount_cr) ?? -999;
      case "ats_growth": return growthPct(row.ats_lakhs, row.lmtd_ats_lakhs) ?? -999;
      case "aop_cr": return row.aop_cr ?? 0;
      case "aop_pct": return row.aop_cr ? (row.amount_cr / row.aop_cr) * 100 : 0;
      default: return 0;
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (sortKey === "label") {
      return sortAsc
        ? a.label.localeCompare(b.label)
        : b.label.localeCompare(a.label);
    }
    const aVal = getSortVal(a, sortKey);
    const bVal = getSortVal(b, sortKey);
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />;
    return sortAsc ? (
      <ArrowUp className="h-2.5 w-2.5" />
    ) : (
      <ArrowDown className="h-2.5 w-2.5" />
    );
  };

  const SortHead = ({
    col,
    children,
    align = "right",
  }: {
    col: SortKey;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => (
    <TableHead
      className="text-[10px] font-semibold cursor-pointer select-none hover:text-foreground transition-colors px-2"
      onClick={() => handleSort(col)}
    >
      <div
        className={cn(
          "flex items-center gap-0.5",
          align === "right" ? "justify-end" : "justify-start"
        )}
      >
        {children}
        <SortIcon col={col} />
      </div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[450px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortHead col="label" align="left">Name</SortHead>
                {/* Loans columns */}
                <TableHead className="text-[9px] font-bold text-center px-0 border-l border-border/50" colSpan={3}>
                  LOANS
                </TableHead>
                {/* Amount columns */}
                <TableHead className="text-[9px] font-bold text-center px-0 border-l border-border/50" colSpan={3}>
                  AMOUNT (Cr)
                </TableHead>
                {/* ATS columns */}
                <TableHead className="text-[9px] font-bold text-center px-0 border-l border-border/50" colSpan={3}>
                  ATS (L)
                </TableHead>
                {showAOP && (
                  <TableHead className="text-[9px] font-bold text-center px-0 border-l border-border/50" colSpan={2}>
                    AOP
                  </TableHead>
                )}
              </TableRow>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[10px] font-medium px-2"></TableHead>
                {/* Loans sub-headers */}
                <SortHead col="disbursed_count">MTD</SortHead>
                <SortHead col="lmtd_disbursed_count">LMTD</SortHead>
                <SortHead col="count_growth">Gr%</SortHead>
                {/* Amount sub-headers */}
                <SortHead col="amount_cr">MTD</SortHead>
                <SortHead col="lmtd_amount_cr">LMTD</SortHead>
                <SortHead col="amount_growth">Gr%</SortHead>
                {/* ATS sub-headers */}
                <SortHead col="ats_lakhs">MTD</SortHead>
                <SortHead col="lmtd_ats_lakhs">LMTD</SortHead>
                <SortHead col="ats_growth">Gr%</SortHead>
                {showAOP && (
                  <>
                    <SortHead col="aop_cr">Target</SortHead>
                    <SortHead col="aop_pct">Achv%</SortHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, i) => {
                const cG = growthPct(row.disbursed_count, row.lmtd_disbursed_count);
                const aG = growthPct(row.amount_cr, row.lmtd_amount_cr);
                const tG = growthPct(row.ats_lakhs, row.lmtd_ats_lakhs);
                const aopPct =
                  row.aop_cr && row.aop_cr > 0
                    ? (row.amount_cr / row.aop_cr) * 100
                    : null;

                return (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium py-2 px-2">
                      {row.label}
                    </TableCell>
                    {/* Loans */}
                    <TableCell className="text-xs text-right tabular-nums py-1.5 px-2 font-medium">
                      {row.disbursed_count.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-[11px] text-right tabular-nums py-1.5 px-2 text-muted-foreground">
                      {row.lmtd_disbursed_count.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right py-1.5 px-2">
                      <GrowthBadge value={cG} />
                    </TableCell>
                    {/* Amount */}
                    <TableCell className="text-xs text-right tabular-nums py-1.5 px-2 font-medium">
                      {row.amount_cr.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-[11px] text-right tabular-nums py-1.5 px-2 text-muted-foreground">
                      {row.lmtd_amount_cr.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right py-1.5 px-2">
                      <GrowthBadge value={aG} />
                    </TableCell>
                    {/* ATS */}
                    <TableCell className="text-xs text-right tabular-nums py-1.5 px-2 font-medium">
                      {row.ats_lakhs.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-[11px] text-right tabular-nums py-1.5 px-2 text-muted-foreground">
                      {row.lmtd_ats_lakhs.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right py-1.5 px-2">
                      <GrowthBadge value={tG} />
                    </TableCell>
                    {/* AOP */}
                    {showAOP && (
                      <>
                        <TableCell className="text-xs text-right tabular-nums py-1.5 px-2">
                          {row.aop_cr ? row.aop_cr.toFixed(1) : "-"}
                        </TableCell>
                        <TableCell className="text-right py-1.5 px-2">
                          {aopPct !== null ? (
                            <span
                              className={cn(
                                "text-[11px] font-bold tabular-nums",
                                aopPct >= 80
                                  ? "text-emerald-600"
                                  : aopPct >= 50
                                  ? "text-amber-600"
                                  : "text-red-600"
                              )}
                            >
                              {aopPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
