"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useDateRangeFactors } from "@/lib/filter-context";
import { ChevronRight, ChevronDown, AlertTriangle, Trophy } from "lucide-react";
import { L2AnalysisRow } from "@/lib/data";

// ─── Mock L3 failure reasons (will be replaced with real data later) ────────

const MOCK_FAILURE_REASONS: Record<string, { reason: string; pct: number }[]> = {
  BRE2_FAILURE: [
    { reason: "Income below threshold", pct: 32.5 },
    { reason: "Bureau score < 650", pct: 24.1 },
    { reason: "High existing EMI burden", pct: 18.7 },
    { reason: "Business vintage < 12 months", pct: 12.3 },
    { reason: "Other policy rejection", pct: 12.4 },
  ],
  KYC_FAILED: [
    { reason: "Name mismatch (PAN vs Aadhaar)", pct: 28.4 },
    { reason: "Photo mismatch / low quality", pct: 22.1 },
    { reason: "Aadhaar OTP timeout", pct: 19.6 },
    { reason: "Document unreadable / blurred", pct: 16.2 },
    { reason: "Address mismatch", pct: 13.7 },
  ],
  LENDER_BRE_REJECTED: [
    { reason: "Lender policy: pincode not serviceable", pct: 35.2 },
    { reason: "Lender policy: category excluded", pct: 22.8 },
    { reason: "Lender bureau model score low", pct: 20.3 },
    { reason: "Duplicate application at lender", pct: 12.1 },
    { reason: "Other lender rejection", pct: 9.6 },
  ],
  SERVICEABILITY_REJECTED: [
    { reason: "Pincode not serviceable by lender", pct: 52.3 },
    { reason: "Merchant category not eligible", pct: 28.7 },
    { reason: "State-level restriction", pct: 19.0 },
  ],
  LENDER_CREATE_APPLICATION_REJECTED: [
    { reason: "Duplicate lead at lender", pct: 38.5 },
    { reason: "KYC data mismatch with lender records", pct: 25.2 },
    { reason: "Lender daily limit reached", pct: 18.4 },
    { reason: "Internal lender policy failure", pct: 17.9 },
  ],
  KYC_REJECTED: [
    { reason: "Video KYC failed — face mismatch", pct: 31.2 },
    { reason: "CKYC record not found", pct: 26.8 },
    { reason: "PAN validation failure", pct: 22.5 },
    { reason: "Aadhaar-PAN linking failed", pct: 19.5 },
  ],
  EMANDATE_REQUIRED: [
    { reason: "User did not complete e-mandate", pct: 45.6 },
    { reason: "Bank not supported for e-mandate", pct: 28.3 },
    { reason: "e-Mandate registration timeout", pct: 16.2 },
    { reason: "Invalid bank account details", pct: 9.9 },
  ],
  LOAN_DISBURSEMENT_FAILURE: [
    { reason: "Bank account validation failed", pct: 34.1 },
    { reason: "NEFT/IMPS transfer failed", pct: 28.7 },
    { reason: "Account frozen / inactive", pct: 21.3 },
    { reason: "Daily disbursement limit reached", pct: 15.9 },
  ],
  BANK_NAME_MATCH_FAILED: [
    { reason: "Account holder name != applicant name", pct: 55.2 },
    { reason: "Joint account detected", pct: 24.8 },
    { reason: "Penny drop verification failed", pct: 20.0 },
  ],
  LOAN_APPLICATION_ON_HOLD: [
    { reason: "Pending FI (Field Investigation)", pct: 38.4 },
    { reason: "Pending additional document", pct: 27.6 },
    { reason: "Lender manual review queue", pct: 20.1 },
    { reason: "RCU check pending", pct: 13.9 },
  ],
  LOAN_QC_REJECTED: [
    { reason: "Document quality check failed", pct: 42.1 },
    { reason: "Income proof insufficient", pct: 28.5 },
    { reason: "Business proof not matching", pct: 18.2 },
    { reason: "Signature mismatch", pct: 11.2 },
  ],
};

// Terminal sub_stages (where failure reasons apply)
const TERMINAL_SUBSTAGES = new Set(Object.keys(MOCK_FAILURE_REASONS));

// ─── Types ──────────────────────────────────────────────────────────────────

interface MajorStageRow {
  major_index: number;
  major_stage: string;
  mtd_leads: number;
  lmtd_leads: number;
  mtd_conv_pct: number | null;
  lmtd_conv_pct: number | null;
  delta_pp: number | null;
  prev_major_index: number | null;
}

interface SubStageRow {
  sub_stage: string;
  mtd_leads: number;
  lmtd_leads: number;
  mtd_stuck_pct: number | null;
  lmtd_stuck_pct: number | null;
  delta_pp: number | null;
  is_terminal: boolean;
}

interface HeroConvData {
  hero_conv_pct: number;
  hero_lender: string;
}

interface FunnelStageInput {
  index: number;
  stage: string;
  leads: number;
}

interface FunnelTableProps {
  l2Data: L2AnalysisRow[];
  /** Full unfiltered l2Data for computing Hero Conv% across all lenders */
  allL2Data?: L2AnalysisRow[];
  /** Stages from the funnel CSVs (includes Bureau Pull Success, Marketplace Offer Selected, etc.) */
  funnelStages?: FunnelStageInput[];
  selectedLender: string;
  selectedProductType: string;
  selectedFlow: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FunnelTable({
  l2Data,
  allL2Data,
  funnelStages: funnelStagesInput,
  selectedLender,
  selectedProductType,
  selectedFlow,
}: FunnelTableProps) {
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [expandedSubStages, setExpandedSubStages] = useState<Set<string>>(new Set());
  const { periodLabel: pL, compareLabel: cL } = useDateRangeFactors();

  const filtered = useMemo(() => {
    return l2Data.filter((row) => {
      if (selectedLender !== "All" && row.lender !== selectedLender) return false;
      if (selectedProductType !== "All" && row.product_type !== selectedProductType) return false;
      if (selectedFlow !== "All" && row.isautoleadcreated !== selectedFlow) return false;
      return true;
    });
  }, [l2Data, selectedLender, selectedProductType, selectedFlow]);

  // Build major stage rows — merge funnelStages (from CSV) with L2 data
  // funnelStages includes ALL stages (Bureau pull success, Marketplace Offer Selected, etc.)
  // L2 data provides LMTD comparison and sub-stage drill-down
  const majorStages = useMemo(() => {
    const mtdMajor = filtered.filter(
      (r) => r.month_start === "1.MTD" && !r.sub_stage && Math.floor(r.major_index) === r.major_index
    );
    const lmtdMajor = filtered.filter(
      (r) => r.month_start === "2.LMTD" && !r.sub_stage && Math.floor(r.major_index) === r.major_index
    );

    const aggregate = (rows: L2AnalysisRow[]) => {
      const map: Record<number, { stage: string; leads: number }> = {};
      rows.forEach((r) => {
        if (r.major_index >= 1000 || r.major_index === 1) return;
        if (!map[r.major_index]) map[r.major_index] = { stage: r.original_major_stage, leads: 0 };
        map[r.major_index].leads += r.leads;
      });
      return map;
    };

    const mtdByIdx = aggregate(mtdMajor);
    const lmtdByIdx = aggregate(lmtdMajor);

    // If funnelStages provided, use it as the canonical list of stages
    // This ensures Bureau Pull Success (3), Marketplace Offer Selected (5), etc. appear
    const funnelMap: Record<number, { stage: string; leads: number }> = {};
    if (funnelStagesInput && funnelStagesInput.length > 0) {
      funnelStagesInput.forEach((fs) => {
        funnelMap[fs.index] = { stage: fs.stage, leads: fs.leads };
      });
    }

    // Merge indices from both sources
    const allIndices = new Set([
      ...Object.keys(mtdByIdx).map(Number),
      ...Object.keys(lmtdByIdx).map(Number),
      ...Object.keys(funnelMap).map(Number),
    ]);
    const indices = Array.from(allIndices).sort((a, b) => a - b);

    const rows: MajorStageRow[] = [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      // Prefer funnelStages for MTD leads (more accurate, aggregated from CSV)
      // Fall back to L2 data if not in funnelStages
      const mtd = funnelMap[idx]?.leads ?? mtdByIdx[idx]?.leads ?? 0;
      const lmtd = lmtdByIdx[idx]?.leads || 0;
      const prevIdx = i > 0 ? indices[i - 1] : null;

      let mtdConv: number | null = null;
      let lmtdConv: number | null = null;
      if (prevIdx !== null) {
        const pM = funnelMap[prevIdx]?.leads ?? mtdByIdx[prevIdx]?.leads ?? 0;
        const pL = lmtdByIdx[prevIdx]?.leads || 0;
        mtdConv = pM > 0 ? parseFloat(((mtd / pM) * 100).toFixed(2)) : null;
        lmtdConv = pL > 0 ? parseFloat(((lmtd / pL) * 100).toFixed(2)) : null;
      }

      const delta = mtdConv !== null && lmtdConv !== null ? parseFloat((mtdConv - lmtdConv).toFixed(2)) : null;

      rows.push({
        major_index: idx,
        major_stage: funnelMap[idx]?.stage || mtdByIdx[idx]?.stage || lmtdByIdx[idx]?.stage || `Stage ${idx}`,
        mtd_leads: mtd,
        lmtd_leads: lmtd,
        mtd_conv_pct: mtdConv,
        lmtd_conv_pct: lmtdConv,
        delta_pp: delta,
        prev_major_index: prevIdx,
      });
    }
    return rows;
  }, [filtered, funnelStagesInput]);

  // ─── Hero Conv% per stage (best lender, using LMTD as reference timerange) ──
  const heroConvByStage = useMemo((): Record<number, HeroConvData> => {
    const source = allL2Data || l2Data;
    if (!source || source.length === 0) return {};

    // Use LMTD (last month) as the stable reference for Hero Conv%
    const lmtdMajor = source.filter(
      (r) =>
        r.month_start === "2.LMTD" &&
        !r.sub_stage &&
        Math.floor(r.major_index) === r.major_index &&
        r.major_index < 1000 &&
        r.major_index !== 1
    );

    // Group by lender → stage
    const byLender: Record<string, Record<number, { stage: string; leads: number }>> = {};
    lmtdMajor.forEach((r) => {
      if (!byLender[r.lender]) byLender[r.lender] = {};
      if (!byLender[r.lender][r.major_index]) {
        byLender[r.lender][r.major_index] = { stage: r.original_major_stage, leads: 0 };
      }
      byLender[r.lender][r.major_index].leads += r.leads;
    });

    // For each stage pair, find which lender has the highest conv%
    const result: Record<number, HeroConvData> = {};
    const allIndices = Array.from(
      new Set(lmtdMajor.map((r) => r.major_index))
    ).sort((a, b) => a - b);

    for (let i = 1; i < allIndices.length; i++) {
      const curIdx = allIndices[i];
      const prevIdx = allIndices[i - 1];
      let bestConv = -1;
      let bestLender = "";

      Object.entries(byLender).forEach(([lender, stageMap]) => {
        const curLeads = stageMap[curIdx]?.leads || 0;
        const prevLeads = stageMap[prevIdx]?.leads || 0;
        if (prevLeads > 0) {
          const conv = (curLeads / prevLeads) * 100;
          if (conv > bestConv) {
            bestConv = conv;
            bestLender = lender;
          }
        }
      });

      if (bestConv >= 0 && bestLender) {
        result[curIdx] = { hero_conv_pct: bestConv, hero_lender: bestLender };
      }
    }
    return result;
  }, [allL2Data, l2Data]);

  // Sub_stages from previous major index
  const getSubStages = (prevMajorIndex: number): SubStageRow[] => {
    const mtdSub = filtered.filter(
      (r) => r.month_start === "1.MTD" && r.sub_stage && Math.floor(r.major_index) === prevMajorIndex && r.major_index !== prevMajorIndex
    );
    const lmtdSub = filtered.filter(
      (r) => r.month_start === "2.LMTD" && r.sub_stage && Math.floor(r.major_index) === prevMajorIndex && r.major_index !== prevMajorIndex
    );

    const mtdMap: Record<string, number> = {};
    mtdSub.forEach((r) => { if (r.sub_stage) mtdMap[r.sub_stage] = (mtdMap[r.sub_stage] || 0) + r.leads; });
    const lmtdMap: Record<string, number> = {};
    lmtdSub.forEach((r) => { if (r.sub_stage) lmtdMap[r.sub_stage] = (lmtdMap[r.sub_stage] || 0) + r.leads; });

    const mtdBase = filtered
      .filter((r) => r.month_start === "1.MTD" && !r.sub_stage && r.major_index === prevMajorIndex)
      .reduce((s, r) => s + r.leads, 0);
    const lmtdBase = filtered
      .filter((r) => r.month_start === "2.LMTD" && !r.sub_stage && r.major_index === prevMajorIndex)
      .reduce((s, r) => s + r.leads, 0);

    const allSubs = new Set([...Object.keys(mtdMap), ...Object.keys(lmtdMap)]);

    return Array.from(allSubs)
      .map((sub) => {
        const mL = mtdMap[sub] || 0;
        const lL = lmtdMap[sub] || 0;
        const mS = mtdBase > 0 ? parseFloat(((mL / mtdBase) * 100).toFixed(1)) : null;
        const lS = lmtdBase > 0 ? parseFloat(((lL / lmtdBase) * 100).toFixed(1)) : null;
        const d = mS !== null && lS !== null ? parseFloat((mS - lS).toFixed(2)) : null;
        return {
          sub_stage: sub,
          mtd_leads: mL,
          lmtd_leads: lL,
          mtd_stuck_pct: mS,
          lmtd_stuck_pct: lS,
          delta_pp: d,
          is_terminal: TERMINAL_SUBSTAGES.has(sub),
        };
      })
      .sort((a, b) => b.mtd_leads - a.mtd_leads);
  };

  const toggleStage = (index: number) => {
    const next = new Set(expandedStages);
    next.has(index) ? next.delete(index) : next.add(index);
    setExpandedStages(next);
  };

  const toggleSubStage = (key: string) => {
    const next = new Set(expandedSubStages);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSubStages(next);
  };

  const hasSubStages = (prevIdx: number | null): boolean => {
    if (prevIdx === null) return false;
    return filtered.some(
      (r) => r.sub_stage && Math.floor(r.major_index) === prevIdx && r.major_index !== prevIdx
    );
  };

  const getPrevStageName = (prevIdx: number | null): string => {
    if (prevIdx === null) return "";
    return majorStages.find((s) => s.major_index === prevIdx)?.major_stage || `Stage ${prevIdx}`;
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold w-8"></TableHead>
              <TableHead className="text-xs font-semibold">Stage</TableHead>
              <TableHead className="text-xs font-semibold text-right">{`${pL} Leads`}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{`${cL} Leads`}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{`${pL} Conv%`}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{`${cL} Conv%`}</TableHead>
              <TableHead className="text-xs font-semibold text-right">Delta (pp)</TableHead>
              {Object.keys(heroConvByStage).length > 0 && (
                <TableHead className="text-xs font-semibold text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    Hero Conv%
                  </div>
                  <div className="text-[9px] font-normal text-muted-foreground">{`${cL} basis`}</div>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {majorStages.map((stage) => {
              const canExpand = hasSubStages(stage.prev_major_index);
              const isExpanded = expandedStages.has(stage.major_index);
              const subStages = isExpanded && stage.prev_major_index !== null ? getSubStages(stage.prev_major_index) : [];
              const prevName = getPrevStageName(stage.prev_major_index);

              return (
                <>
                  {/* L1: Major Stage Row */}
                  <TableRow
                    key={`major-${stage.major_index}`}
                    className={cn(
                      "transition-colors",
                      canExpand && "cursor-pointer hover:bg-muted/40",
                      isExpanded && "bg-muted/30 border-b-0"
                    )}
                    onClick={() => canExpand && toggleStage(stage.major_index)}
                  >
                    <TableCell className="w-8 py-3">
                      {canExpand && (isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm font-medium">{stage.major_stage}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">#{stage.major_index}</span>
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-medium py-3">
                      {stage.mtd_leads.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground py-3">
                      {stage.lmtd_leads.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-medium py-3">
                      {stage.mtd_conv_pct !== null ? `${stage.mtd_conv_pct.toFixed(2)}%` : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground py-3">
                      {stage.lmtd_conv_pct !== null ? `${stage.lmtd_conv_pct.toFixed(2)}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {stage.delta_pp !== null ? (
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5",
                          stage.delta_pp > 0 ? "bg-emerald-50 text-emerald-700"
                            : stage.delta_pp < 0 ? "bg-red-50 text-red-700"
                            : "bg-gray-50 text-gray-600"
                        )}>
                          {stage.delta_pp > 0 ? "+" : ""}{stage.delta_pp.toFixed(2)} pp
                        </span>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                    {Object.keys(heroConvByStage).length > 0 && (
                      <TableCell className="text-right py-3">
                        {heroConvByStage[stage.major_index] ? (
                          <div className="text-right">
                            <span className="text-xs font-bold tabular-nums text-amber-700">
                              {heroConvByStage[stage.major_index].hero_conv_pct.toFixed(1)}%
                            </span>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <Trophy className="h-2.5 w-2.5 text-amber-500" />
                              <span className="text-[9px] font-semibold text-amber-600">
                                {heroConvByStage[stage.major_index].hero_lender}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>

                  {/* L2 header */}
                  {isExpanded && subStages.length > 0 && (
                    <TableRow key={`l2h-${stage.major_index}`} className="bg-muted/20 border-b-0">
                      <TableCell colSpan={2} className="py-1.5 pl-10">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Leads stuck at &quot;{prevName}&quot; due to:
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] text-right text-muted-foreground py-1.5">{pL}</TableCell>
                      <TableCell className="text-[10px] text-right text-muted-foreground py-1.5">{cL}</TableCell>
                      <TableCell className="text-[10px] text-right text-muted-foreground py-1.5">{`${pL} Stuck%`}</TableCell>
                      <TableCell className="text-[10px] text-right text-muted-foreground py-1.5">{`${cL} Stuck%`}</TableCell>
                      <TableCell className="text-[10px] text-right text-muted-foreground py-1.5">Delta</TableCell>
                      {Object.keys(heroConvByStage).length > 0 && (
                        <TableCell className="py-1.5" />
                      )}
                    </TableRow>
                  )}

                  {/* L2: Sub-stage Rows */}
                  {isExpanded && subStages.map((sub, subIdx) => {
                    const subKey = `${stage.major_index}-${sub.sub_stage}`;
                    const isSubExpanded = expandedSubStages.has(subKey);
                    const failureReasons = MOCK_FAILURE_REASONS[sub.sub_stage];
                    const hasL3 = sub.is_terminal && !!failureReasons;

                    return (
                      <>
                        <TableRow
                          key={`sub-${subKey}`}
                          className={cn(
                            "bg-muted/10 border-b border-dashed border-border/50",
                            subIdx === subStages.length - 1 && !isSubExpanded && "border-b-2 border-solid border-border/30",
                            hasL3 && "cursor-pointer hover:bg-muted/20"
                          )}
                          onClick={(e) => { if (hasL3) { e.stopPropagation(); toggleSubStage(subKey); } }}
                        >
                          <TableCell className="w-8 py-2 pl-6">
                            {hasL3 && (isSubExpanded
                              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="py-2 pl-10">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                              <span className="text-xs font-medium text-muted-foreground">{sub.sub_stage}</span>
                              {sub.delta_pp !== null && sub.delta_pp > 2 && (
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                              )}
                              {hasL3 && (
                                <span className="text-[9px] text-muted-foreground/60 uppercase">L3</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums py-2">
                            {sub.mtd_leads.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground py-2">
                            {sub.lmtd_leads.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums py-2">
                            {sub.mtd_stuck_pct !== null ? `${sub.mtd_stuck_pct.toFixed(1)}%` : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground py-2">
                            {sub.lmtd_stuck_pct !== null ? `${sub.lmtd_stuck_pct.toFixed(1)}%` : "-"}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            {sub.delta_pp !== null ? (
                              <span className={cn(
                                "inline-flex items-center text-[11px] font-semibold rounded-full px-1.5 py-0.5",
                                sub.delta_pp > 0 ? "bg-red-50 text-red-700"
                                  : sub.delta_pp < 0 ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-50 text-gray-600"
                              )}>
                                {sub.delta_pp > 0 ? "+" : ""}{sub.delta_pp.toFixed(2)} pp
                              </span>
                            ) : <span className="text-[11px] text-muted-foreground">-</span>}
                          </TableCell>
                          {Object.keys(heroConvByStage).length > 0 && <TableCell className="py-2" />}
                        </TableRow>

                        {/* L3: Failure Reasons */}
                        {isSubExpanded && failureReasons && (
                          <>
                            <TableRow key={`l3h-${subKey}`} className="bg-amber-50/30 border-b-0">
                              <TableCell colSpan={Object.keys(heroConvByStage).length > 0 ? 8 : 7} className="py-1 pl-16">
                                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                                  Failure / Rejection Reasons
                                </span>
                              </TableCell>
                            </TableRow>
                            {failureReasons.map((fr, frIdx) => {
                              const mtdCount = Math.round(sub.mtd_leads * (fr.pct / 100));
                              const lmtdCount = Math.round(sub.lmtd_leads * (fr.pct / 100) * (0.85 + Math.random() * 0.3));
                              const mtdPct = fr.pct;
                              // Simulate slight variation for LMTD
                              const lmtdPct = parseFloat((fr.pct + (Math.random() - 0.5) * 6).toFixed(1));
                              const frDelta = parseFloat((mtdPct - lmtdPct).toFixed(2));

                              return (
                                <TableRow
                                  key={`l3-${subKey}-${frIdx}`}
                                  className={cn(
                                    "bg-amber-50/10 border-b border-dotted border-border/30",
                                    frIdx === failureReasons.length - 1 && "border-b-2 border-solid border-border/20"
                                  )}
                                >
                                  <TableCell className="py-1.5"></TableCell>
                                  <TableCell className="py-1.5 pl-16">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-amber-400" />
                                      <span className="text-[11px] text-muted-foreground">{fr.reason}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[11px] text-right tabular-nums py-1.5">
                                    {mtdCount.toLocaleString("en-IN")}
                                  </TableCell>
                                  <TableCell className="text-[11px] text-right tabular-nums text-muted-foreground py-1.5">
                                    {lmtdCount.toLocaleString("en-IN")}
                                  </TableCell>
                                  <TableCell className="text-[11px] text-right tabular-nums py-1.5">
                                    {mtdPct.toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-[11px] text-right tabular-nums text-muted-foreground py-1.5">
                                    {lmtdPct.toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-right py-1.5">
                                    <span className={cn(
                                      "text-[10px] font-semibold",
                                      frDelta > 0 ? "text-red-600" : frDelta < 0 ? "text-emerald-600" : "text-muted-foreground"
                                    )}>
                                      {frDelta > 0 ? "+" : ""}{frDelta.toFixed(1)} pp
                                    </span>
                                  </TableCell>
                                  {Object.keys(heroConvByStage).length > 0 && <TableCell className="py-1.5" />}
                                </TableRow>
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          Conv% improved / Stuck% decreased
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          Conv% dropped / Stuck% increased
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          Stuck% +2pp or more
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold border rounded px-1 py-0 border-muted-foreground/30">L3</span>
          Click sub-stage for failure reasons
        </div>
      </div>
    </div>
  );
}
