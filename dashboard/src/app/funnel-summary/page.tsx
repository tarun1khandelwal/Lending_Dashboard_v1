"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FunnelTable } from "@/components/dashboard/funnel-table";
import { RichInsightPanel, RichInsightItem, RichChartBar, ChartFeedbackButton } from "@/components/dashboard/rich-insight-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Trophy, AlertTriangle, TrendingDown, TrendingUp, Banknote, Activity, Target, Hash, Users } from "lucide-react";
import { useFilters, useDateRangeFactors } from "@/lib/filter-context";
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ComposedChart,
  Line,
  BarChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import {
  fetchL2Analysis,
  fetchCompleteFunnel,
  fetchLenderFunnel,
  fetchDisbursalSummary,
  getUniqueValues,
  L2AnalysisRow,
  FunnelRow,
  LenderFunnelRow,
  DisbursalSummaryRow,
} from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KPICard } from "@/components/dashboard/kpi-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { KpiDeepDiveModal, ClickableKpiCard, KpiDeepDiveConfig, type DeepDiveSection } from "@/components/dashboard/kpi-deep-dive-modal";

export default function FunnelSummary() {
  const {
    global,
    useGlobalFilters,
    setAvailableLenders,
    setAvailableProductTypes,
    setAvailableFlows,
  } = useFilters();
  const [l2Data, setL2Data] = useState<L2AnalysisRow[]>([]);
  const [completeFunnel, setCompleteFunnel] = useState<FunnelRow[]>([]);
  const [lenderFunnel, setLenderFunnel] = useState<LenderFunnelRow[]>([]);
  const [disbData, setDisbData] = useState<DisbursalSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab-level filters
  const [tabLender, setTabLender] = useState("All");
  const [tabProductType, setTabProductType] = useState("All");
  const [tabFlow, setTabFlow] = useState("All");

  const effectiveLender = useGlobalFilters ? global.lender : tabLender;
  const effectiveProductType = useGlobalFilters
    ? global.productType
    : tabProductType;
  const effectiveFlow = useGlobalFilters ? global.flow : tabFlow;

  // Date range labels
  const { periodLabel: pL, compareLabel: cL, periodFactor: pF, compareFactor: cF } = useDateRangeFactors();

  // Whether we're viewing a specific lender (stages start from Child_Lead_Created)
  const isLenderFiltered = effectiveLender !== "All";

  useEffect(() => {
    async function load() {
      const [data, cf, lf, disb] = await Promise.all([
        fetchL2Analysis(),
        fetchCompleteFunnel(),
        fetchLenderFunnel(),
        fetchDisbursalSummary(),
      ]);
      setL2Data(data);
      setCompleteFunnel(cf);
      setLenderFunnel(lf);
      setDisbData(disb);
      setAvailableLenders(getUniqueValues(data, "lender"));
      setAvailableProductTypes(getUniqueValues(data, "product_type"));
      setAvailableFlows(getUniqueValues(data, "isautoleadcreated"));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to section if hash is present in URL
  useEffect(() => {
    if (!loading && typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [loading]);

  const allLenders = useMemo(() => getUniqueValues(l2Data, "lender"), [l2Data]);
  const allProductTypes = useMemo(
    () => getUniqueValues(l2Data, "product_type"),
    [l2Data]
  );
  const allFlows = useMemo(
    () => getUniqueValues(l2Data, "isautoleadcreated"),
    [l2Data]
  );

  // ─── Funnel stages from the correct CSV source ─────────────────────────
  // No lender filter → Complete_Funnel_with_Stages.csv (all stages 2-15, unique parent IDs)
  // Lender filter → Lender_Level_Funnel_With_Stages.csv (stages 6-15 only)
  const funnelStages = useMemo(() => {
    if (isLenderFiltered) {
      // Use lender-level funnel, starting from Child_Lead_Created (index 6)
      let rows = lenderFunnel.filter((r) => r.lender === effectiveLender);
      if (effectiveProductType !== "All") rows = rows.filter((r) => r.product_type === effectiveProductType);
      if (effectiveFlow !== "All") rows = rows.filter((r) => r.isautoleadcreated === effectiveFlow);

      const byIdx: Record<number, { stage: string; leads: number }> = {};
      rows.forEach((r) => {
        if (!byIdx[r.major_index]) byIdx[r.major_index] = { stage: r.major_stage, leads: 0 };
        byIdx[r.major_index].leads += r.leads;
      });

      return Object.entries(byIdx)
        .map(([idx, v]) => ({ index: Number(idx), stage: v.stage, leads: v.leads }))
        .sort((a, b) => a.index - b.index);
    } else {
      // Use complete funnel (all stages including Marketplace_Offer_Selected)
      let rows = completeFunnel.filter((r) => r.major_index >= 2);
      if (effectiveProductType !== "All") rows = rows.filter((r) => r.product_type === effectiveProductType);
      if (effectiveFlow !== "All") rows = rows.filter((r) => r.isautoleadcreated === effectiveFlow);

      const byIdx: Record<number, { stage: string; leads: number }> = {};
      rows.forEach((r) => {
        if (!byIdx[r.major_index]) byIdx[r.major_index] = { stage: r.major_stage, leads: 0 };
        byIdx[r.major_index].leads += r.leads;
      });

      return Object.entries(byIdx)
        .map(([idx, v]) => ({ index: Number(idx), stage: v.stage, leads: v.leads }))
        .sort((a, b) => a.index - b.index);
    }
  }, [isLenderFiltered, completeFunnel, lenderFunnel, effectiveLender, effectiveProductType, effectiveFlow]);

  // ─── Compute stats using funnelStages (from correct CSV) ─────────────
  const stats = useMemo(() => {
    // Use funnelStages for the primary KPIs (from the correct CSV source)
    const fLookup = (idx: number) => funnelStages.find((s) => s.index === idx)?.leads || 0;
    const firstIdx = funnelStages[0]?.index || 2;
    const lastIdx = funnelStages[funnelStages.length - 1]?.index || 15;

    const mtdW = isLenderFiltered ? 0 : fLookup(2); // Only meaningful for complete funnel
    const mtdBRE1 = isLenderFiltered ? 0 : fLookup(4);
    const mtdMkt = isLenderFiltered ? 0 : fLookup(5);
    const mtdC = fLookup(6); // Child_Lead_Created
    const mtdD = fLookup(15); // Disbursed
    const mtdFirst = fLookup(firstIdx); // First stage in the funnel (for overall conv)

    // LMTD from L2 data (funnelStages CSVs don't have period split, use L2 for delta)
    const match = (r: L2AnalysisRow) => {
      if (effectiveLender !== "All" && r.lender !== effectiveLender) return false;
      if (effectiveProductType !== "All" && r.product_type !== effectiveProductType) return false;
      if (effectiveFlow !== "All" && r.isautoleadcreated !== effectiveFlow) return false;
      return true;
    };
    const lmtdRows = l2Data.filter(
      (r) => r.month_start === "2.LMTD" && !r.sub_stage &&
        Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1 && match(r)
    );
    const sumLmtd = (idx: number) => lmtdRows.filter((r) => r.major_index === idx).reduce((s, r) => s + r.leads, 0);

    const lmtdW = sumLmtd(2);
    const lmtdBRE1 = sumLmtd(4);
    const lmtdMkt = sumLmtd(5);
    const lmtdC = sumLmtd(6);
    const lmtdD = sumLmtd(15);
    const lmtdFirst = isLenderFiltered ? sumLmtd(6) : sumLmtd(2);

    // Flow-specific for LPV/FFR (Flow2 only) - always from L2 data
    const matchFlow2 = (r: L2AnalysisRow) => {
      if (effectiveLender !== "All" && r.lender !== effectiveLender) return false;
      if (effectiveProductType !== "All" && r.product_type !== effectiveProductType) return false;
      return r.isautoleadcreated === "Flow2(Manual)";
    };

    const mtdFlow2 = l2Data.filter(
      (r) => r.month_start === "1.MTD" && !r.sub_stage && Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1 && matchFlow2(r)
    );
    const lmtdFlow2 = l2Data.filter(
      (r) => r.month_start === "2.LMTD" && !r.sub_stage && Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1 && matchFlow2(r)
    );

    const mtdF2W = mtdFlow2.filter((r) => r.major_index === 2).reduce((s, r) => s + r.leads, 0);
    const lmtdF2W = lmtdFlow2.filter((r) => r.major_index === 2).reduce((s, r) => s + r.leads, 0);

    const matchFlow1 = (r: L2AnalysisRow) => {
      if (effectiveLender !== "All" && r.lender !== effectiveLender) return false;
      if (effectiveProductType !== "All" && r.product_type !== effectiveProductType) return false;
      return r.isautoleadcreated === "Flow1(Auto)";
    };

    const mtdF1W = l2Data.filter(
      (r) => r.month_start === "1.MTD" && !r.sub_stage && r.major_index === 2 && r.major_index < 1000 && matchFlow1(r)
    ).reduce((s, r) => s + r.leads, 0);
    const lmtdF1W = l2Data.filter(
      (r) => r.month_start === "2.LMTD" && !r.sub_stage && r.major_index === 2 && r.major_index < 1000 && matchFlow1(r)
    ).reduce((s, r) => s + r.leads, 0);

    const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

    // Mock pre-funnel values
    const mtdWhitelisted = Math.round((mtdW || mtdC) * 8.5);
    const lmtdWhitelisted = Math.round((lmtdW || lmtdC) * 8.2);
    const mtdImpressions = Math.round((mtdW || mtdC) * 4.2);
    const lmtdImpressions = Math.round((lmtdW || lmtdC) * 3.9);
    const mtdClicks = Math.round((mtdW || mtdC) * 1.8);
    const lmtdClicks = Math.round((lmtdW || lmtdC) * 1.7);
    const mtdLPV = Math.round(mtdF2W * 1.35);
    const lmtdLPV = Math.round(lmtdF2W * 1.30);
    const mtdFFR = mtdLPV > 0 ? (mtdF2W / mtdLPV) * 100 : 0;
    const lmtdFFR = lmtdLPV > 0 ? (lmtdF2W / lmtdLPV) * 100 : 0;

    // Top-of-funnel and end-of-funnel conv
    const firstToLast = pct(mtdD, mtdFirst);
    const lmtdFirstToLast = pct(lmtdD, lmtdFirst);

    return {
      mtdW, lmtdW, mtdC, lmtdC, mtdD, lmtdD,
      mtdBRE1, lmtdBRE1, mtdMkt, lmtdMkt,
      mtdF1W, lmtdF1W, mtdF2W, lmtdF2W,
      mtdWhitelisted, lmtdWhitelisted,
      mtdImpressions, lmtdImpressions,
      mtdClicks, lmtdClicks,
      mtdLPV, lmtdLPV,
      mtdFFR, lmtdFFR,
      mtdFirst, lmtdFirst,
      // Ratios
      w2d: isLenderFiltered ? firstToLast : pct(mtdD, mtdW),
      lmtdW2d: isLenderFiltered ? lmtdFirstToLast : pct(lmtdD, lmtdW),
      parentToChild: mtdW > 0 ? mtdC / mtdW : 0,
      lmtdParentToChild: lmtdW > 0 ? lmtdC / lmtdW : 0,
      c2d: pct(mtdD, mtdC),
      lmtdC2d: pct(lmtdD, lmtdC),
      flowRatio: mtdF2W > 0 ? mtdF1W / mtdF2W : 0,
      lmtdFlowRatio: lmtdF2W > 0 ? lmtdF1W / lmtdF2W : 0,
    };
  }, [l2Data, funnelStages, isLenderFiltered, effectiveLender, effectiveProductType, effectiveFlow]);

  // ─── Mock L3 failure reasons (mirrored from funnel-table — will be shared later) ──
  const MOCK_FAILURE_REASONS: Record<string, { reason: string; pct: number }[]> = useMemo(() => ({
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
    ],
    LENDER_BRE_REJECTED: [
      { reason: "Pincode not serviceable", pct: 35.2 },
      { reason: "Category excluded", pct: 22.8 },
      { reason: "Bureau model score low", pct: 20.3 },
    ],
    SERVICEABILITY_REJECTED: [
      { reason: "Pincode not serviceable by lender", pct: 52.3 },
      { reason: "Merchant category not eligible", pct: 28.7 },
    ],
    KYC_REJECTED: [
      { reason: "Video KYC failed — face mismatch", pct: 31.2 },
      { reason: "CKYC record not found", pct: 26.8 },
    ],
    EMANDATE_REQUIRED: [
      { reason: "User did not complete e-mandate", pct: 45.6 },
      { reason: "Bank not supported for e-mandate", pct: 28.3 },
    ],
    LOAN_DISBURSEMENT_FAILURE: [
      { reason: "Bank account validation failed", pct: 34.1 },
      { reason: "NEFT/IMPS transfer failed", pct: 28.7 },
    ],
    LOAN_APPLICATION_ON_HOLD: [
      { reason: "Pending FI (Field Investigation)", pct: 38.4 },
      { reason: "Pending additional document", pct: 27.6 },
    ],
    LOAN_QC_REJECTED: [
      { reason: "Document quality check failed", pct: 42.1 },
      { reason: "Income proof insufficient", pct: 28.5 },
    ],
    BANK_NAME_MATCH_FAILED: [
      { reason: "Account holder name != applicant name", pct: 55.2 },
      { reason: "Joint account detected", pct: 24.8 },
    ],
    LENDER_CREATE_APPLICATION_REJECTED: [
      { reason: "Duplicate lead at lender", pct: 38.5 },
      { reason: "KYC data mismatch with lender records", pct: 25.2 },
    ],
  }), []);

  // ─── Deep funnel insights (rich format like Insights tab) ──────────────
  const funnelInsights = useMemo((): RichInsightItem[] => {
    const insights: RichInsightItem[] = [];
    const AVG_ATS = 2.5; // Avg ticket size in Lakhs for impact estimation
    let insightCounter = 0;
    const nextId = () => `funnel-insight-${insightCounter++}`;

    // --- VOLUME & GROWTH INSIGHTS ---
    const w2dDelta = stats.w2d - stats.lmtdW2d;
    if (Math.abs(w2dDelta) > 0.3) {
      const isGood = w2dDelta > 0;
      const impactLeads = Math.abs(stats.mtdD - (stats.mtdFirst > 0 ? Math.round(stats.mtdFirst * stats.lmtdW2d / 100) : 0));
      const impactCr = (impactLeads * AVG_ATS / 100).toFixed(1);
      insights.push({
        id: nextId(),
        icon: isGood ? TrendingUp : TrendingDown,
        color: isGood ? "text-emerald-600" : "text-red-600",
        title: `Funnel Conv% ${isGood ? "Improved" : "Dropped"} ${Math.abs(w2dDelta).toFixed(2)}pp`,
        detail: `Overall funnel conversion is ${stats.w2d.toFixed(2)}% vs ${stats.lmtdW2d.toFixed(2)}% ${cL}. Est. impact: ~₹${impactCr} Cr.`,
        severity: isGood ? "good" : "bad",
        impactWeight: isGood ? 60 : 90,
        link: "/funnel-summary",
        section: "stage-health",
        expanded: {
          bullets: [
            `${pL} Conv: ${stats.w2d.toFixed(2)}% | ${cL} Conv: ${stats.lmtdW2d.toFixed(2)}%`,
            `Delta: ${w2dDelta > 0 ? "+" : ""}${w2dDelta.toFixed(2)}pp`,
            `${pL} Disbursals: ${stats.mtdD.toLocaleString("en-IN")} | ${cL}: ${stats.lmtdD.toLocaleString("en-IN")}`,
            `Est. disbursal impact: ~₹${impactCr} Cr`,
          ],
          chartData: [],
          chartLabel: "",
          chartValueSuffix: "pp",
        },
      });
    }

    const volGrowth = stats.lmtdW > 0 ? ((stats.mtdW - stats.lmtdW) / stats.lmtdW) * 100 : 0;
    if (Math.abs(volGrowth) > 10) {
      const isGood = volGrowth > 0;
      insights.push({
        id: nextId(),
        icon: isGood ? TrendingUp : TrendingDown,
        color: isGood ? "text-emerald-600" : "text-amber-600",
        title: `Top-of-Funnel Volume ${isGood ? "Up" : "Down"} ${Math.abs(volGrowth).toFixed(1)}%`,
        detail: `${stats.mtdW.toLocaleString("en-IN")} workable leads vs ${stats.lmtdW.toLocaleString("en-IN")} ${cL}.`,
        severity: isGood ? "good" : "warn",
        impactWeight: 50,
        link: "/funnel-summary",
        section: "funnel-drilldown",
        expanded: {
          bullets: [
            `${pL}: ${stats.mtdW.toLocaleString("en-IN")} workable leads`,
            `${cL}: ${stats.lmtdW.toLocaleString("en-IN")} workable leads`,
            `Change: ${volGrowth > 0 ? "+" : ""}${volGrowth.toFixed(1)}%`,
            isGood ? "Higher inflow should improve disbursals if conversion holds." : "Lower inflow may reduce disbursals even if conv% improves.",
          ],
          chartData: [],
          chartLabel: "",
          chartValueSuffix: "",
        },
      });
    }

    const ptcDelta = stats.parentToChild - stats.lmtdParentToChild;
    if (Math.abs(ptcDelta) > 0.05) {
      insights.push({
        id: nextId(),
        icon: Activity,
        color: "text-blue-600",
        title: `Child/Parent Ratio: ${stats.parentToChild.toFixed(2)}x`,
        detail: `${ptcDelta > 0 ? "Up" : "Down"} from ${stats.lmtdParentToChild.toFixed(2)}x.${stats.parentToChild > 1 ? " Multiple child leads per parent." : ""}`,
        severity: "info",
        impactWeight: 30,
        link: "/funnel-summary",
        expanded: {
          bullets: [
            `${pL} ratio: ${stats.parentToChild.toFixed(2)}x | ${cL}: ${stats.lmtdParentToChild.toFixed(2)}x`,
            `Delta: ${ptcDelta > 0 ? "+" : ""}${ptcDelta.toFixed(2)}x`,
            stats.parentToChild > 1.2 ? "High ratio indicates many lenders per parent lead — good for offer coverage." : "Low ratio may indicate limited lender matching.",
          ],
          chartData: [],
          chartLabel: "",
          chartValueSuffix: "",
        },
      });
    }

    // --- STAGE-BY-STAGE CONV% INSIGHTS WITH SUB-STAGE ROOT CAUSE ---
    const match = (r: L2AnalysisRow) => {
      if (effectiveLender !== "All" && r.lender !== effectiveLender) return false;
      if (effectiveProductType !== "All" && r.product_type !== effectiveProductType) return false;
      if (effectiveFlow !== "All" && r.isautoleadcreated !== effectiveFlow) return false;
      return true;
    };

    const agg = (period: string) => {
      const map: Record<number, { stage: string; leads: number }> = {};
      l2Data.filter(
        (r) => r.month_start === period && !r.sub_stage &&
          Math.floor(r.major_index) === r.major_index &&
          r.major_index < 1000 && r.major_index !== 1 && match(r)
      ).forEach((r) => {
        if (!map[r.major_index]) map[r.major_index] = { stage: r.original_major_stage, leads: 0 };
        map[r.major_index].leads += r.leads;
      });
      return map;
    };

    const mtdMajor = agg("1.MTD");
    const lmtdMajor = agg("2.LMTD");
    const allIdx = Array.from(
      new Set([...Object.keys(mtdMajor).map(Number), ...Object.keys(lmtdMajor).map(Number)])
    ).sort((a, b) => a - b);

    // Lender-level breakdown helper
    const getLenderBreakdown = (prevIdx: number, curIdx: number) => {
      const lenders = new Set(l2Data.filter((r) => r.month_start === "1.MTD" && !r.sub_stage && match(r)).map((r) => r.lender));
      const breakdown: { lender: string; delta: number }[] = [];
      lenders.forEach((lndr) => {
        const lMatch = (r: L2AnalysisRow) => r.lender === lndr && (effectiveProductType === "All" || r.product_type === effectiveProductType) && (effectiveFlow === "All" || r.isautoleadcreated === effectiveFlow);
        const mPrev = l2Data.filter((r) => r.month_start === "1.MTD" && !r.sub_stage && r.major_index === prevIdx && lMatch(r)).reduce((s, r) => s + r.leads, 0);
        const mCur = l2Data.filter((r) => r.month_start === "1.MTD" && !r.sub_stage && r.major_index === curIdx && lMatch(r)).reduce((s, r) => s + r.leads, 0);
        const lPrev = l2Data.filter((r) => r.month_start === "2.LMTD" && !r.sub_stage && r.major_index === prevIdx && lMatch(r)).reduce((s, r) => s + r.leads, 0);
        const lCur = l2Data.filter((r) => r.month_start === "2.LMTD" && !r.sub_stage && r.major_index === curIdx && lMatch(r)).reduce((s, r) => s + r.leads, 0);
        const mc = mPrev > 0 ? (mCur / mPrev) * 100 : 0;
        const lc = lPrev > 0 ? (lCur / lPrev) * 100 : 0;
        const d = mc - lc;
        if (Math.abs(d) > 1) breakdown.push({ lender: lndr, delta: parseFloat(d.toFixed(1)) });
      });
      return breakdown.sort((a, b) => a.delta - b.delta);
    };

    for (let i = 1; i < allIdx.length; i++) {
      const curIdx = allIdx[i];
      const prevIdx = allIdx[i - 1];
      const mCur = mtdMajor[curIdx]?.leads || 0;
      const mPrev = mtdMajor[prevIdx]?.leads || 0;
      const lCur = lmtdMajor[curIdx]?.leads || 0;
      const lPrev = lmtdMajor[prevIdx]?.leads || 0;

      const mtdConv = mPrev > 0 ? (mCur / mPrev) * 100 : 0;
      const lmtdConv = lPrev > 0 ? (lCur / lPrev) * 100 : 0;
      const convDelta = mtdConv - lmtdConv;

      if (Math.abs(convDelta) < 1.5) continue;

      const stageName = mtdMajor[curIdx]?.stage || `Stage ${curIdx}`;
      const prevStageName = mtdMajor[prevIdx]?.stage || `Stage ${prevIdx}`;

      const getSubDeltas = () => {
        const mtdSub = l2Data.filter(
          (r) => r.month_start === "1.MTD" && r.sub_stage &&
            Math.floor(r.major_index) === prevIdx && r.major_index !== prevIdx && match(r)
        );
        const lmtdSub = l2Data.filter(
          (r) => r.month_start === "2.LMTD" && r.sub_stage &&
            Math.floor(r.major_index) === prevIdx && r.major_index !== prevIdx && match(r)
        );
        const mtdMap: Record<string, number> = {};
        mtdSub.forEach((r) => { if (r.sub_stage) mtdMap[r.sub_stage] = (mtdMap[r.sub_stage] || 0) + r.leads; });
        const lmtdMap: Record<string, number> = {};
        lmtdSub.forEach((r) => { if (r.sub_stage) lmtdMap[r.sub_stage] = (lmtdMap[r.sub_stage] || 0) + r.leads; });
        const mtdBase = mPrev;
        const lmtdBase = lPrev;
        const allSubs = new Set([...Object.keys(mtdMap), ...Object.keys(lmtdMap)]);
        return Array.from(allSubs).map((sub) => {
          const mL = mtdMap[sub] || 0;
          const lL = lmtdMap[sub] || 0;
          const mS = mtdBase > 0 ? (mL / mtdBase) * 100 : 0;
          const lS = lmtdBase > 0 ? (lL / lmtdBase) * 100 : 0;
          return { sub_stage: sub, mtd_leads: mL, lmtd_leads: lL, delta_pp: mS - lS };
        }).sort((a, b) => b.delta_pp - a.delta_pp);
      };

      const subDeltas = getSubDeltas();
      const leadsLost = Math.abs(mCur - Math.round(mPrev * lmtdConv / 100));
      const impactCr = (leadsLost * AVG_ATS / 100).toFixed(1);
      const lenderBd = effectiveLender === "All" ? getLenderBreakdown(prevIdx, curIdx) : [];

      if (convDelta < -1.5) {
        const topStuck = subDeltas.filter((s) => s.delta_pp > 0.5);
        const hypotheses: string[] = [];
        const bullets: string[] = [
          `${pL} Conv: ${mtdConv.toFixed(1)}% | ${cL} Conv: ${lmtdConv.toFixed(1)}% | Drop: ${Math.abs(convDelta).toFixed(2)}pp`,
          `Leads at ${prevStageName}: ${mPrev.toLocaleString("en-IN")} → Leads at ${stageName}: ${mCur.toLocaleString("en-IN")}`,
          `~${leadsLost.toLocaleString("en-IN")} additional leads lost vs ${cL} baseline. Est. impact: ~₹${impactCr} Cr`,
        ];

        topStuck.slice(0, 3).forEach((s) => {
          hypotheses.push(`Sub-stage "${s.sub_stage}" stuck rate increased +${s.delta_pp.toFixed(1)}pp (${s.mtd_leads.toLocaleString("en-IN")} leads stuck).`);
          const l3 = MOCK_FAILURE_REASONS[s.sub_stage];
          if (l3 && l3.length > 0) {
            hypotheses.push(`Top reason at ${s.sub_stage}: "${l3[0].reason}" (${l3[0].pct}%).`);
          }
          bullets.push(`${s.sub_stage}: +${s.delta_pp.toFixed(1)}pp stuck rate increase`);
        });

        if (hypotheses.length === 0) {
          hypotheses.push(`Conversion at ${prevStageName} → ${stageName} has degraded. Review sub-stage failure distributions.`);
        }

        const chartData: RichChartBar[] = subDeltas
          .filter((s) => s.delta_pp > 0.3)
          .slice(0, 6)
          .map((s) => ({
            label: s.sub_stage.replace(/_/g, " ").slice(0, 25),
            value: parseFloat(s.delta_pp.toFixed(1)),
            color: s.delta_pp > 2 ? "hsl(0, 70%, 55%)" : "hsl(30, 80%, 55%)",
          }));

        const isCritical = Math.abs(convDelta) > 3;
        insights.push({
          id: nextId(),
          icon: TrendingDown,
          color: "text-red-600",
          title: `${prevStageName} → ${stageName}: ${Math.abs(convDelta).toFixed(1)}pp Drop`,
          detail: `Conv dropped from ${lmtdConv.toFixed(1)}% to ${mtdConv.toFixed(1)}%. ~${leadsLost.toLocaleString("en-IN")} leads lost, ~₹${impactCr} Cr impact.`,
          severity: "bad",
          impactWeight: isCritical ? 95 : 75,
          priorityBucket: isCritical ? "P0" : "P1",
          link: "/funnel-summary",
          section: "stage-health",
          expanded: {
            bullets,
            chartData,
            chartLabel: "Sub-Stage Stuck Rate Increase (pp)",
            chartValueSuffix: "pp",
            l2Drills: [{
              stage: `${prevStageName} → ${stageName}`,
              hypotheses,
              lenderBreakdown: lenderBd.length > 0 ? lenderBd.slice(0, 6) : undefined,
            }],
          },
        });
      } else if (convDelta > 1.5) {
        const topCleared = subDeltas.filter((s) => s.delta_pp < -0.5).sort((a, b) => a.delta_pp - b.delta_pp);
        const hypotheses: string[] = [];
        const bullets: string[] = [
          `${pL} Conv: ${mtdConv.toFixed(1)}% | ${cL} Conv: ${lmtdConv.toFixed(1)}% | Gain: +${convDelta.toFixed(2)}pp`,
          `Leads at ${prevStageName}: ${mPrev.toLocaleString("en-IN")} → Leads at ${stageName}: ${mCur.toLocaleString("en-IN")}`,
        ];

        topCleared.slice(0, 3).forEach((s) => {
          hypotheses.push(`"${s.sub_stage}" stuck rate decreased ${s.delta_pp.toFixed(1)}pp — clearing faster.`);
          bullets.push(`${s.sub_stage}: ${s.delta_pp.toFixed(1)}pp improvement`);
        });

        if (hypotheses.length === 0) {
          hypotheses.push(`Conversion has improved at this stage. Review what changed to sustain gains.`);
        }

        const chartData: RichChartBar[] = topCleared
          .filter((s) => s.delta_pp < -0.3)
          .slice(0, 6)
          .map((s) => ({
            label: s.sub_stage.replace(/_/g, " ").slice(0, 25),
            value: parseFloat(Math.abs(s.delta_pp).toFixed(1)),
            color: "hsl(145, 60%, 45%)",
          }));

        insights.push({
          id: nextId(),
          icon: TrendingUp,
          color: "text-emerald-600",
          title: `${prevStageName} → ${stageName}: +${convDelta.toFixed(1)}pp Improvement`,
          detail: `Conv improved from ${lmtdConv.toFixed(1)}% to ${mtdConv.toFixed(1)}%.`,
          severity: "good",
          impactWeight: 40,
          priorityBucket: "positive",
          link: "/funnel-summary",
          section: "stage-health",
          expanded: {
            bullets,
            chartData,
            chartLabel: "Sub-Stage Improvement (pp)",
            chartValueSuffix: "pp",
            l2Drills: hypotheses.length > 0 ? [{
              stage: `${prevStageName} → ${stageName}`,
              hypotheses,
              lenderBreakdown: lenderBd.length > 0 ? lenderBd.filter((lb) => lb.delta > 0).slice(0, 6) : undefined,
            }] : undefined,
          },
        });
      }
    }

    // --- FFR & FLOW INSIGHTS ---
    const ffrDelta = stats.mtdFFR - stats.lmtdFFR;
    if (Math.abs(ffrDelta) > 2) {
      const isGood = ffrDelta > 0;
      insights.push({
        id: nextId(),
        icon: isGood ? TrendingUp : AlertTriangle,
        color: isGood ? "text-emerald-600" : "text-amber-600",
        title: `Flow2 FFR ${isGood ? "Improved" : "Dropped"} ${Math.abs(ffrDelta).toFixed(1)}pp`,
        detail: `Form Fill Rate: ${stats.mtdFFR.toFixed(1)}% vs ${stats.lmtdFFR.toFixed(1)}% ${cL}.${!isGood ? " Check landing page UX." : ""}`,
        severity: isGood ? "good" : "warn",
        impactWeight: 45,
        link: "/funnel-summary",
        expanded: {
          bullets: [
            `${pL} FFR: ${stats.mtdFFR.toFixed(1)}% | ${cL} FFR: ${stats.lmtdFFR.toFixed(1)}%`,
            `Change: ${ffrDelta > 0 ? "+" : ""}${ffrDelta.toFixed(1)}pp`,
            `LPV (${pL}): ${stats.mtdLPV.toLocaleString("en-IN")} | Flow2 leads: ${stats.mtdF2W.toLocaleString("en-IN")}`,
            !isGood ? "Possible causes: landing page changes, load time increase, or form complexity." : "Improved UX or faster page load contributing to higher fill rates.",
          ],
          chartData: [],
          chartLabel: "",
          chartValueSuffix: "pp",
        },
      });
    }

    return insights;
  }, [stats, l2Data, effectiveLender, effectiveProductType, effectiveFlow, MOCK_FAILURE_REASONS, cL, pL]);

  // ─── Cross-lender conv% comparison table data ──────────────────────
  const crossLenderData = useMemo(() => {
    // Get all major stages from MTD data, applying product/flow filters
    const mtdMajor = l2Data.filter(
      (r) =>
        r.month_start === "1.MTD" &&
        !r.sub_stage &&
        Math.floor(r.major_index) === r.major_index &&
        r.major_index < 1000 &&
        r.major_index !== 1 &&
        (effectiveProductType === "All" || r.product_type === effectiveProductType) &&
        (effectiveFlow === "All" || r.isautoleadcreated === effectiveFlow)
    );

    // All unique lenders
    const lenders = Array.from(new Set(mtdMajor.map((r) => r.lender))).sort();

    // All unique flows
    const flows = Array.from(new Set(mtdMajor.map((r) => r.isautoleadcreated))).sort();

    // Group by lender+flow → stage
    type StageMap = Record<number, { stage: string; leads: number }>;
    const byLenderFlow: Record<string, StageMap> = {};
    const byLender: Record<string, StageMap> = {};

    mtdMajor.forEach((r) => {
      // By lender (all flows)
      const lKey = r.lender;
      if (!byLender[lKey]) byLender[lKey] = {};
      if (!byLender[lKey][r.major_index])
        byLender[lKey][r.major_index] = { stage: r.original_major_stage, leads: 0 };
      byLender[lKey][r.major_index].leads += r.leads;

      // By lender+flow
      const lfKey = `${r.lender}||${r.isautoleadcreated}`;
      if (!byLenderFlow[lfKey]) byLenderFlow[lfKey] = {};
      if (!byLenderFlow[lfKey][r.major_index])
        byLenderFlow[lfKey][r.major_index] = { stage: r.original_major_stage, leads: 0 };
      byLenderFlow[lfKey][r.major_index].leads += r.leads;
    });

    // Compute stage indices
    const allIndices = Array.from(new Set(mtdMajor.map((r) => r.major_index))).sort(
      (a, b) => a - b
    );

    // Stage pairs: [prevIdx, curIdx, stageName]
    const stagePairs: { prevIdx: number; curIdx: number; stageName: string }[] = [];
    for (let i = 1; i < allIndices.length; i++) {
      const curIdx = allIndices[i];
      const prevIdx = allIndices[i - 1];
      const stageName =
        mtdMajor.find((r) => r.major_index === curIdx)?.original_major_stage ||
        `Stage ${curIdx}`;
      stagePairs.push({ prevIdx, curIdx, stageName });
    }

    // Compute conv% for each lender (all flows)
    const lenderConv: Record<string, Record<number, number | null>> = {};
    lenders.forEach((lender) => {
      lenderConv[lender] = {};
      stagePairs.forEach(({ prevIdx, curIdx }) => {
        const prevLeads = byLender[lender]?.[prevIdx]?.leads || 0;
        const curLeads = byLender[lender]?.[curIdx]?.leads || 0;
        lenderConv[lender][curIdx] =
          prevLeads > 0 ? parseFloat(((curLeads / prevLeads) * 100).toFixed(1)) : null;
      });
    });

    // Compute conv% for each lender+flow
    const lenderFlowConv: Record<string, Record<number, number | null>> = {};
    lenders.forEach((lender) => {
      flows.forEach((flow) => {
        const key = `${lender}||${flow}`;
        lenderFlowConv[key] = {};
        stagePairs.forEach(({ prevIdx, curIdx }) => {
          const prevLeads = byLenderFlow[key]?.[prevIdx]?.leads || 0;
          const curLeads = byLenderFlow[key]?.[curIdx]?.leads || 0;
          lenderFlowConv[key][curIdx] =
            prevLeads > 0 ? parseFloat(((curLeads / prevLeads) * 100).toFixed(1)) : null;
        });
      });
    });

    // Find hero per stage (highest conv%)
    const heroPerStage: Record<number, { lender: string; conv: number }> = {};
    stagePairs.forEach(({ curIdx }) => {
      let best = -1;
      let bestLender = "";
      lenders.forEach((lender) => {
        const conv = lenderConv[lender]?.[curIdx];
        if (conv !== null && conv !== undefined && conv > best) {
          best = conv;
          bestLender = lender;
        }
      });
      if (best >= 0) heroPerStage[curIdx] = { lender: bestLender, conv: best };
    });

    return { lenders, flows, stagePairs, lenderConv, lenderFlowConv, heroPerStage };
  }, [l2Data, effectiveProductType, effectiveFlow]);

  const [showFlowBreakdown, setShowFlowBreakdown] = useState(false);
  const [kpiDive, setKpiDive] = useState<{ open: boolean; config: KpiDeepDiveConfig | null }>({ open: false, config: null });

  const AVG_ATS = 2.5; // Average ticket size in Lakhs

  // ─── SECTION A: Stage Drop-off Waterfall (from funnelStages) ────────
  const dropoffData = useMemo(() => {
    const result: { stage: string; leads: number; dropped: number; dropPct: number; retained: number; retainedPct: number; index: number }[] = [];

    for (let i = 0; i < funnelStages.length; i++) {
      const s = funnelStages[i];
      const prev = i > 0 ? funnelStages[i - 1].leads : s.leads;
      const cur = s.leads;
      const dropped = i > 0 ? prev - cur : 0;
      const dropPct = prev > 0 ? (dropped / prev) * 100 : 0;

      result.push({
        stage: s.stage.length > 16 ? s.stage.substring(0, 14) + ".." : s.stage,
        leads: cur,
        dropped,
        dropPct: parseFloat(dropPct.toFixed(1)),
        retained: cur,
        retainedPct: prev > 0 ? parseFloat(((cur / prev) * 100).toFixed(1)) : 100,
        index: s.index,
      });
    }
    return result;
  }, [funnelStages]);

  // ─── SECTION B: Structural vs Temporary Analysis ───────────────────
  const structuralAnalysis = useMemo(() => {
    const match = (r: L2AnalysisRow) => {
      if (effectiveLender !== "All" && r.lender !== effectiveLender) return false;
      if (effectiveProductType !== "All" && r.product_type !== effectiveProductType) return false;
      if (effectiveFlow !== "All" && r.isautoleadcreated !== effectiveFlow) return false;
      return true;
    };

    // L2 data for LMTD comparison
    const aggL2 = (period: string) => {
      const map: Record<number, { stage: string; leads: number }> = {};
      l2Data.filter(
        (r) => r.month_start === period && !r.sub_stage &&
          Math.floor(r.major_index) === r.major_index &&
          r.major_index < 1000 && r.major_index !== 1 && match(r)
      ).forEach((r) => {
        if (!map[r.major_index]) map[r.major_index] = { stage: r.original_major_stage, leads: 0 };
        map[r.major_index].leads += r.leads;
      });
      return map;
    };

    const mtdL2 = aggL2("1.MTD");
    const lmtd = aggL2("2.LMTD");

    // Build a lookup from funnelStages (CSV source, has Bureau Pull Success, MOS, etc.)
    const funnelMap: Record<number, { stage: string; leads: number }> = {};
    funnelStages.forEach((fs) => { funnelMap[fs.index] = { stage: fs.stage, leads: fs.leads }; });

    // Merge all known indices from both sources
    const indices = Array.from(
      new Set([
        ...Object.keys(mtdL2).map(Number),
        ...Object.keys(lmtd).map(Number),
        ...Object.keys(funnelMap).map(Number),
      ])
    ).sort((a, b) => a - b);

    const result: {
      stage: string; index: number;
      mtdConv: number | null; lmtdConv: number | null; delta: number | null;
      diagnosis: "structural" | "temporary_drop" | "temporary_gain" | "healthy";
      severity: "critical" | "warning" | "ok";
    }[] = [];

    for (let i = 1; i < indices.length; i++) {
      const cur = indices[i];
      const prev = indices[i - 1];
      // Prefer funnelStages (CSV) for MTD leads; fall back to L2
      const mCur = funnelMap[cur]?.leads ?? mtdL2[cur]?.leads ?? 0;
      const mPrev = funnelMap[prev]?.leads ?? mtdL2[prev]?.leads ?? 0;
      const lCur = lmtd[cur]?.leads || 0;
      const lPrev = lmtd[prev]?.leads || 0;

      const mtdConv = mPrev > 0 ? (mCur / mPrev) * 100 : null;
      const lmtdConv = lPrev > 0 ? (lCur / lPrev) * 100 : null;
      const delta = mtdConv !== null && lmtdConv !== null ? mtdConv - lmtdConv : null;

      let diagnosis: "structural" | "temporary_drop" | "temporary_gain" | "healthy" = "healthy";
      let severity: "critical" | "warning" | "ok" = "ok";

      const mtdVal = mtdConv || 0;
      const lmtdVal = lmtdConv || 0;
      const deltaVal = delta || 0;

      if (mtdVal < 60 && lmtdVal < 60) {
        diagnosis = "structural";
        severity = mtdVal < 40 ? "critical" : "warning";
      } else if (mtdVal < 60 && lmtdVal >= 60) {
        diagnosis = "temporary_drop";
        severity = "critical";
      } else if (deltaVal < -3) {
        diagnosis = "temporary_drop";
        severity = Math.abs(deltaVal) > 5 ? "critical" : "warning";
      } else if (deltaVal > 3) {
        diagnosis = "temporary_gain";
        severity = "ok";
      }

      result.push({
        stage: funnelMap[cur]?.stage || mtdL2[cur]?.stage || lmtd[cur]?.stage || `Stage ${cur}`,
        index: cur,
        mtdConv: mtdConv !== null ? parseFloat(mtdConv.toFixed(1)) : null,
        lmtdConv: lmtdConv !== null ? parseFloat(lmtdConv.toFixed(1)) : null,
        delta: delta !== null ? parseFloat(delta.toFixed(2)) : null,
        diagnosis,
        severity,
      });
    }
    return result;
  }, [l2Data, funnelStages, effectiveLender, effectiveProductType, effectiveFlow]);

  // ─── SECTION C: Global vs Lender/Program-specific ──────────────────
  const globalVsSpecific = useMemo(() => {
    // For each stage transition, compute per-lender conv% to see if the issue is global or localized
    const mtdMajor = l2Data.filter(
      (r) => r.month_start === "1.MTD" && !r.sub_stage &&
        Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1
    );
    const lmtdMajor = l2Data.filter(
      (r) => r.month_start === "2.LMTD" && !r.sub_stage &&
        Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1
    );

    // Group by lender → idx → leads
    const groupByLender = (rows: L2AnalysisRow[]) => {
      const map: Record<string, Record<number, number>> = {};
      rows.forEach((r) => {
        if (!map[r.lender]) map[r.lender] = {};
        map[r.lender][r.major_index] = (map[r.lender][r.major_index] || 0) + r.leads;
      });
      return map;
    };

    // Group by product → idx → leads
    const groupByProduct = (rows: L2AnalysisRow[]) => {
      const map: Record<string, Record<number, number>> = {};
      rows.forEach((r) => {
        if (!map[r.product_type]) map[r.product_type] = {};
        map[r.product_type][r.major_index] = (map[r.product_type][r.major_index] || 0) + r.leads;
      });
      return map;
    };

    const mtdByLender = groupByLender(mtdMajor);
    const lmtdByLender = groupByLender(lmtdMajor);
    const mtdByProduct = groupByProduct(mtdMajor);
    const lmtdByProduct = groupByProduct(lmtdMajor);

    // Include funnelStages indices so Bureau Pull Success, MOS, etc. appear
    const funnelIndices = funnelStages.map((fs) => fs.index);
    const allIndices = Array.from(new Set([...mtdMajor.map((r) => r.major_index), ...funnelIndices])).sort((a, b) => a - b);
    const allLenderNames = Array.from(new Set(mtdMajor.map((r) => r.lender))).sort();
    const allProductNames = Array.from(new Set(mtdMajor.map((r) => r.product_type))).sort();

    const result: {
      stage: string; index: number;
      lenderDeltas: { name: string; mtdConv: number | null; delta: number | null }[];
      productDeltas: { name: string; mtdConv: number | null; delta: number | null }[];
      isGlobal: boolean;
      droppedCount: number;
      totalCount: number;
      worstLender: string | null;
      worstProduct: string | null;
    }[] = [];

    for (let i = 1; i < allIndices.length; i++) {
      const cur = allIndices[i];
      const prev = allIndices[i - 1];
      const stageName = funnelStages.find((fs) => fs.index === cur)?.stage || mtdMajor.find((r) => r.major_index === cur)?.original_major_stage || `Stage ${cur}`;

      // Per-lender delta
      const lenderDeltas = allLenderNames.map((lender) => {
        const mCur = mtdByLender[lender]?.[cur] || 0;
        const mPrev = mtdByLender[lender]?.[prev] || 0;
        const lCur = lmtdByLender[lender]?.[cur] || 0;
        const lPrev = lmtdByLender[lender]?.[prev] || 0;
        const mtdConv = mPrev > 0 ? (mCur / mPrev) * 100 : null;
        const lmtdConv = lPrev > 0 ? (lCur / lPrev) * 100 : null;
        const delta = mtdConv !== null && lmtdConv !== null ? mtdConv - lmtdConv : null;
        return { name: lender, mtdConv: mtdConv !== null ? parseFloat(mtdConv.toFixed(1)) : null, delta: delta !== null ? parseFloat(delta.toFixed(1)) : null };
      });

      // Per-product delta
      const productDeltas = allProductNames.map((product) => {
        const mCur = mtdByProduct[product]?.[cur] || 0;
        const mPrev = mtdByProduct[product]?.[prev] || 0;
        const lCur = lmtdByProduct[product]?.[cur] || 0;
        const lPrev = lmtdByProduct[product]?.[prev] || 0;
        const mtdConv = mPrev > 0 ? (mCur / mPrev) * 100 : null;
        const lmtdConv = lPrev > 0 ? (lCur / lPrev) * 100 : null;
        const delta = mtdConv !== null && lmtdConv !== null ? mtdConv - lmtdConv : null;
        return { name: product, mtdConv: mtdConv !== null ? parseFloat(mtdConv.toFixed(1)) : null, delta: delta !== null ? parseFloat(delta.toFixed(1)) : null };
      });

      // If >60% of lenders are dropping, it's global
      const droppedCount = lenderDeltas.filter((l) => l.delta !== null && l.delta < -1.5).length;
      const withData = lenderDeltas.filter((l) => l.delta !== null).length;
      const isGlobal = withData > 0 && (droppedCount / withData) > 0.6;

      const worstLender = lenderDeltas.filter((l) => l.delta !== null).sort((a, b) => (a.delta || 0) - (b.delta || 0))[0];
      const worstProduct = productDeltas.filter((p) => p.delta !== null).sort((a, b) => (a.delta || 0) - (b.delta || 0))[0];

      result.push({
        stage: stageName,
        index: cur,
        lenderDeltas,
        productDeltas,
        isGlobal,
        droppedCount,
        totalCount: withData,
        worstLender: worstLender?.delta !== null && (worstLender?.delta || 0) < -1.5 ? worstLender.name : null,
        worstProduct: worstProduct?.delta !== null && (worstProduct?.delta || 0) < -1.5 ? worstProduct.name : null,
      });
    }
    return result;
  }, [l2Data, funnelStages]);

  // ─── SECTION D: Leakage Impact on Disbursals ──────────────────────
  const leakageImpact = useMemo(() => {
    if (dropoffData.length < 2) return { stages: [], totalLostLeads: 0, totalLostLoans: 0, totalLostAmountCr: 0 };

    // End-to-end conversion from each stage to disbursed
    const disbursedLeads = dropoffData[dropoffData.length - 1]?.leads || 0;
    const workableLeads = dropoffData[0]?.leads || 0;
    const overallConv = workableLeads > 0 ? disbursedLeads / workableLeads : 0;

    let totalLostLeads = 0;
    let totalLostLoans = 0;
    let totalLostAmountCr = 0;

    const stages = dropoffData.slice(1).map((stage, i) => {
      const prevLeads = dropoffData[i].leads;
      const dropped = prevLeads - stage.leads;
      // Downstream conversion: from this stage to disbursed
      const stagesRemaining = dropoffData.length - 1 - (i + 1);
      // Use remaining funnel conversion as proxy
      const downstreamConv = stage.leads > 0 ? disbursedLeads / stage.leads : 0;
      const estimatedLostLoans = Math.round(dropped * downstreamConv);
      const estimatedLostAmountCr = (estimatedLostLoans * AVG_ATS) / 100;

      totalLostLeads += dropped;
      totalLostLoans += estimatedLostLoans;
      totalLostAmountCr += estimatedLostAmountCr;

      return {
        stage: stage.stage,
        index: stage.index,
        prevStage: dropoffData[i].stage,
        leadsEntering: prevLeads,
        leadsExiting: stage.leads,
        dropped,
        dropPct: stage.dropPct,
        downstreamConv: parseFloat((downstreamConv * 100).toFixed(2)),
        estimatedLostLoans,
        estimatedLostAmountCr: parseFloat(estimatedLostAmountCr.toFixed(2)),
        stagesRemaining,
      };
    });

    return { stages, totalLostLeads, totalLostLoans, totalLostAmountCr: parseFloat(totalLostAmountCr.toFixed(2)) };
  }, [dropoffData, AVG_ATS]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ LENDER-SPECIFIC DATA (shown when lender filter is applied) ═════════
  // ═══════════════════════════════════════════════════════════════════════════
  const LMTD_FACTOR = 0.85;
  const LENDER_AOP: Record<string, number> = {
    FULLERTON: 120, KSF: 80, PIRAMAL: 60, SHRIRAM: 55,
    NACL: 45, PYFL: 40, MFL: 35, UCL: 30,
  };

  const lenderDisb = useMemo(() =>
    disbData.filter((r) => r.lender === effectiveLender),
    [disbData, effectiveLender]
  );

  const lenderKPIs = useMemo(() => {
    if (!isLenderFiltered) return null;
    const totalDisb = lenderDisb.reduce((s, r) => s + r.disbursed, 0);
    const totalChild = lenderDisb.reduce((s, r) => s + r.child_leads, 0);
    const amountCr = (totalDisb * AVG_ATS) / 100;
    const lmtdDisb = Math.round(totalDisb * LMTD_FACTOR);
    const lmtdAmountCr = amountCr * LMTD_FACTOR;
    const growth = lmtdDisb > 0 ? ((totalDisb - lmtdDisb) / lmtdDisb) * 100 : 0;
    const amtGrowth = lmtdAmountCr > 0 ? ((amountCr - lmtdAmountCr) / lmtdAmountCr) * 100 : 0;
    const convPct = totalChild > 0 ? (totalDisb / totalChild) * 100 : 0;
    const aop = LENDER_AOP[effectiveLender] || 0;
    const achvPct = aop > 0 ? (amountCr / aop) * 100 : 0;
    return { totalDisb, totalChild, amountCr, lmtdAmountCr, growth, amtGrowth, convPct, aop, achvPct };
  }, [isLenderFiltered, lenderDisb, effectiveLender, AVG_ATS, LMTD_FACTOR, LENDER_AOP]);

  const byProduct = useMemo(() => {
    if (!isLenderFiltered) return [];
    const map: Record<string, { disb: number; child: number; lmtd: number }> = {};
    lenderDisb.forEach((r) => {
      if (!map[r.product_type]) map[r.product_type] = { disb: 0, child: 0, lmtd: 0 };
      map[r.product_type].disb += r.disbursed;
      map[r.product_type].child += r.child_leads;
      map[r.product_type].lmtd += Math.round(r.disbursed * LMTD_FACTOR);
    });
    return Object.entries(map).map(([pt, v]) => ({
      product_type: pt,
      disbursed: v.disb,
      child: v.child,
      lmtd: v.lmtd,
      amount_cr: parseFloat(((v.disb * AVG_ATS) / 100).toFixed(1)),
      conv: v.child > 0 ? parseFloat(((v.disb / v.child) * 100).toFixed(1)) : 0,
      growth: v.lmtd > 0 ? parseFloat((((v.disb - v.lmtd) / v.lmtd) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.disbursed - a.disbursed);
  }, [isLenderFiltered, lenderDisb, LMTD_FACTOR, AVG_ATS]);

  // Lender breakdown for deep dive charts (when not lender-filtered)
  const lenderBreakdown = useMemo(() => {
    const match = (r: L2AnalysisRow) => {
      if (effectiveProductType !== "All" && r.product_type !== effectiveProductType) return false;
      if (effectiveFlow !== "All" && r.isautoleadcreated !== effectiveFlow) return false;
      return true;
    };
    const mtdRows = l2Data.filter((r) => r.month_start === "1.MTD" && !r.sub_stage && Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1 && match(r));
    const workableByLender: Record<string, number> = {};
    const childByLender: Record<string, number> = {};
    mtdRows.forEach((r) => {
      if (r.major_index === 2) workableByLender[r.lender] = (workableByLender[r.lender] || 0) + r.leads;
      if (r.major_index === 6) childByLender[r.lender] = (childByLender[r.lender] || 0) + r.leads;
    });
    const disbByLender: Record<string, number> = {};
    disbData.forEach((r) => {
      if (effectiveProductType !== "All" && r.product_type !== effectiveProductType) return;
      if (effectiveFlow !== "All" && r.isautoleadcreated !== effectiveFlow) return;
      disbByLender[r.lender] = (disbByLender[r.lender] || 0) + r.disbursed;
    });
    return { workableByLender, childByLender, disbByLender };
  }, [l2Data, disbData, effectiveProductType, effectiveFlow]);

  // Pre-built KPI deep dive configs (avoids > in JSX attributes)
  const kpiConfigs = useMemo(() => {
    const wb = Object.keys(lenderBreakdown.workableByLender).length;
    const cb = Object.keys(lenderBreakdown.childByLender).length;
    const db = Object.keys(lenderBreakdown.disbByLender).length;
    const workableChart = wb > 0 ? { type: "chart" as const, title: "Lender-wise Workable Leads", chart: { type: "bar" as const, data: Object.entries(lenderBreakdown.workableByLender).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8), label: "Leads", valueSuffix: "" } } : null;
    const childChart = cb > 0 ? { type: "chart" as const, title: "Lender-wise Child Leads", chart: { type: "bar" as const, data: Object.entries(lenderBreakdown.childByLender).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8), label: "Leads", valueSuffix: "" } } : null;
    const disbChart = db > 0 ? { type: "chart" as const, title: "Lender-wise Disbursals", chart: { type: "bar" as const, data: Object.entries(lenderBreakdown.disbByLender).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8), label: "Disbursed", valueSuffix: "" } } : null;
    const productBar = byProduct.length > 0 ? { type: "chart" as const, title: "Product-wise Disbursals", chart: { type: "bar" as const, data: byProduct.map((p) => ({ name: p.product_type, value: p.disbursed })), label: "Loans", valueSuffix: "" } } : null;
    const convChart = byProduct.length > 0 ? { type: "chart" as const, title: "Conv% by Product", chart: { type: "bar" as const, data: byProduct.map((p) => ({ name: p.product_type, value: p.conv })), label: "Conv%", valueSuffix: "%" } } : null;
    const tot = lenderKPIs?.totalDisb ?? 0;
    const shareChart = byProduct.length && tot ? { type: "chart" as const, title: "Share by Product", chart: { type: "pie" as const, data: byProduct.map((p) => ({ name: p.product_type, value: parseFloat(((p.disbursed / tot) * 100).toFixed(1)) })), label: "Share", valueSuffix: "%" } } : null;
    return { workableChart, childChart, disbChart, productBar, convChart, shareChart };
  }, [lenderBreakdown, byProduct, lenderKPIs]);

  // Lender KPI deep dive configs (built outside JSX to avoid > parsing issues)
  const lenderKpiConfigs = useMemo((): Record<string, KpiDeepDiveConfig> => {
    if (!lenderKPIs) return {};
    const aop = lenderKPIs.aop;
    const achv = lenderKPIs.achvPct;
    const hasAop = aop !== 0;
    const progressColor = achv >= 80 ? "text-emerald-600" : achv >= 50 ? "text-amber-600" : "text-red-600";
    const productBullets = byProduct.length
      ? [`${effectiveLender} has ${byProduct.length} product type(s).`, ...byProduct.slice(0, 5).map((p) => {
          const share = lenderKPIs.totalDisb ? ((p.disbursed / lenderKPIs.totalDisb) * 100).toFixed(1) : "0";
          return `${p.product_type}: ${p.disbursed.toLocaleString("en-IN")} loans (${share}% share)`;
        })]
      : ["No product data for this lender."];
    const productTypesSections: DeepDiveSection[] = [
      { type: "kpi-row", title: "Products", kpis: [{ label: "Count", value: byProduct.length }, { label: "Total Disb", value: lenderKPIs.totalDisb.toLocaleString("en-IN") }, { label: "Top", value: byProduct[0]?.product_type || "-" }] },
      { type: "bullets", title: "Analysis", bullets: productBullets },
      ...(kpiConfigs.shareChart ? [kpiConfigs.shareChart] : []),
    ];
    return {
      loansDisb: { title: "Loans Disbursed", metric: lenderKPIs.totalDisb.toLocaleString("en-IN"), subtitle: `${effectiveLender} — from ${lenderKPIs.totalChild.toLocaleString("en-IN")} child leads`, sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: lenderKPIs.totalDisb.toLocaleString("en-IN") }, { label: cL, value: Math.round(lenderKPIs.totalDisb * LMTD_FACTOR).toLocaleString("en-IN"), sub: "est." }, { label: "Growth", value: `${lenderKPIs.growth >= 0 ? "+" : ""}${lenderKPIs.growth.toFixed(1)}%`, color: lenderKPIs.growth >= 0 ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: [`${effectiveLender} disbursed ${lenderKPIs.totalDisb.toLocaleString("en-IN")} loans.`, `Amount: ₹${lenderKPIs.amountCr.toFixed(1)} Cr at ~₹${AVG_ATS}L ATS.`, "Compare with other lenders in All Lenders view."] }, ...(kpiConfigs.productBar ? [kpiConfigs.productBar] : [])] },
      amount: { title: `Amount (${pL})`, metric: `${lenderKPIs.amountCr.toFixed(1)} Cr`, subtitle: `${effectiveLender} disbursal value`, sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: `${lenderKPIs.amountCr.toFixed(1)} Cr` }, { label: cL, value: `${lenderKPIs.lmtdAmountCr.toFixed(1)} Cr`, sub: "est." }, { label: "Growth", value: `${lenderKPIs.amtGrowth >= 0 ? "+" : ""}${lenderKPIs.amtGrowth.toFixed(1)}%`, color: lenderKPIs.amtGrowth >= 0 ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: [`Amount = Disbursed × ATS (~₹${AVG_ATS}L).`, hasAop ? `AOP Target: ₹${aop} Cr. Achievement: ${achv.toFixed(1)}%.` : "No AOP set for this lender.", "Track monthly trends for pacing."] }] },
      convPct: { title: "Disbursal Conv%", metric: `${lenderKPIs.convPct.toFixed(1)}%`, subtitle: "Child Lead → Disbursal", sections: [{ type: "kpi-row", title: "Conversion", kpis: [{ label: "Conv%", value: `${lenderKPIs.convPct.toFixed(1)}%` }, { label: "Child Leads", value: lenderKPIs.totalChild.toLocaleString("en-IN") }, { label: "Disbursed", value: lenderKPIs.totalDisb.toLocaleString("en-IN") }] }, { type: "bullets", title: "Analysis", bullets: ["Conversion from child lead creation to disbursal.", "Higher conv% indicates better lender process and approval rates.", "Compare with Hero Funnel in radar chart."] }, ...(kpiConfigs.convChart ? [kpiConfigs.convChart] : [])] },
      aop: { title: "AOP Target", metric: hasAop ? `${aop} Cr` : "N/A", subtitle: hasAop ? `${achv.toFixed(1)}% achieved` : "No AOP set", sections: [{ type: "kpi-row", title: "AOP Progress", kpis: [{ label: "Target", value: hasAop ? `${aop} Cr` : "N/A" }, { label: "Achieved", value: `${lenderKPIs.amountCr.toFixed(1)} Cr` }, { label: "Progress", value: hasAop ? `${achv.toFixed(1)}%` : "-", color: progressColor }] }, { type: "bullets", title: "Analysis", bullets: hasAop ? [`AOP = Annual Operating Plan target for ${effectiveLender}.`, `Current: ${achv.toFixed(1)}% of target.`, achv >= 80 ? "On track for target." : "Monitor pacing — consider volume or conversion improvements."] : ["No AOP target configured for this lender.", "Set targets in lender configuration to track progress."] }] },
      productTypes: { title: "Product Types", metric: `${byProduct.length}`, subtitle: byProduct.map((p) => p.product_type).join(", "), sections: productTypesSections },
    };
  }, [lenderKPIs, effectiveLender, pL, byProduct, kpiConfigs, AVG_ATS, LMTD_FACTOR]);

  // Radar: this lender vs Hero Funnel
  // ═══ Spider / Radar chart data ═══════════════════════════════════════
  // When NO lender filter: MTD conv% vs LMTD conv% across all stages
  // When lender filtered: Lender conv% vs Hero Funnel per stage
  const radarData = useMemo(() => {
    if (isLenderFiltered) {
      // ── Lender vs Hero Funnel ──
      const allLmtd = l2Data.filter(
        (r) => r.month_start === "2.LMTD" && !r.sub_stage &&
          Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1
      );
      const byLdr: Record<string, Record<number, { stage: string; leads: number }>> = {};
      allLmtd.forEach((r) => {
        if (!byLdr[r.lender]) byLdr[r.lender] = {};
        if (!byLdr[r.lender][r.major_index]) byLdr[r.lender][r.major_index] = { stage: r.original_major_stage, leads: 0 };
        byLdr[r.lender][r.major_index].leads += r.leads;
      });
      const allIdx = Array.from(new Set(allLmtd.map((r) => r.major_index))).sort((a, b) => a - b);
      const heroMap: Record<number, { conv: number; lender: string }> = {};
      for (let i = 1; i < allIdx.length; i++) {
        const cur = allIdx[i]; const prev = allIdx[i - 1];
        let best = -1; let bestL = "";
        Object.entries(byLdr).forEach(([l, sm]) => {
          const c = sm[cur]?.leads || 0; const p = sm[prev]?.leads || 0;
          if (p > 0) { const cv = (c / p) * 100; if (cv > best) { best = cv; bestL = l; } }
        });
        if (best >= 0) heroMap[cur] = { conv: best, lender: bestL };
      }

      const lenderMtd = l2Data.filter((r) => r.lender === effectiveLender && r.month_start === "1.MTD" && !r.sub_stage && Math.floor(r.major_index) === r.major_index && r.major_index < 1000 && r.major_index !== 1);
      const mtdMap: Record<number, number> = {};
      lenderMtd.forEach((r) => { mtdMap[r.major_index] = (mtdMap[r.major_index] || 0) + r.leads; });
      const lenderIdx = Object.keys(mtdMap).map(Number).sort((a, b) => a - b);

      return lenderIdx.filter((_, i) => i > 0).slice(0, 8).map((idx) => {
        const prev = lenderIdx[lenderIdx.indexOf(idx) - 1];
        const conv = (mtdMap[prev] || 0) > 0 ? ((mtdMap[idx] || 0) / (mtdMap[prev] || 0)) * 100 : 0;
        const hero = heroMap[idx];
        const stageName = lenderMtd.find((r) => r.major_index === idx)?.original_major_stage || `Stage ${idx}`;
        return {
          stage: stageName.length > 18 ? stageName.substring(0, 16) + "..." : stageName,
          [effectiveLender]: parseFloat(conv.toFixed(1)),
          "Hero Funnel": hero ? parseFloat(hero.conv.toFixed(1)) : 0,
        };
      });
    } else {
      // ── All-lender: MTD conv% vs LMTD conv% ──
      // Use structuralAnalysis which now has all stages from both CSV and L2
      const mtdKey = `${pL} Conv%`;
      const lmtdKey = `${cL} Conv%`;
      return structuralAnalysis
        .filter((sa) => sa.mtdConv !== null)
        .slice(0, 10)
        .map((sa) => ({
          stage: sa.stage.length > 18 ? sa.stage.substring(0, 16) + "..." : sa.stage,
          [mtdKey]: sa.mtdConv ?? 0,
          [lmtdKey]: sa.lmtdConv ?? 0,
        }));
    }
  }, [isLenderFiltered, l2Data, effectiveLender, structuralAnalysis, pL, cL]);

  // Lender comparison bar chart
  const lenderCompare = useMemo(() => {
    if (!isLenderFiltered) return [];
    const map: Record<string, number> = {};
    disbData.forEach((r) => { map[r.lender] = (map[r.lender] || 0) + r.disbursed; });
    return Object.entries(map).map(([l, c]) => ({ lender: l, disbursed: c, isActive: l === effectiveLender }))
      .sort((a, b) => b.disbursed - a.disbursed);
  }, [isLenderFiltered, disbData, effectiveLender]);

  // Monthly trends for lender
  const lenderTrends = useMemo(() => {
    if (!isLenderFiltered || !lenderKPIs) return [];
    const months = ["Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026"];
    const factors = [0.72, 0.78, 0.85, 0.90, 0.95, 1.0];
    return months.map((month, i) => ({
      month,
      disbursed: Math.round(lenderKPIs.totalDisb * factors[i]),
      amount_cr: parseFloat(((lenderKPIs.totalDisb * factors[i] * AVG_ATS) / 100).toFixed(2)),
    }));
  }, [isLenderFiltered, lenderKPIs, AVG_ATS]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading funnel data...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isLenderFiltered ? `Funnel & Lender Summary — ${effectiveLender}` : "Funnel Summary"}
        description={isLenderFiltered ? `${effectiveLender} performance, funnel, AOP tracking & stage-wise drill-down` : `Stage-wise funnel with ${pL} vs ${cL}. Click any stage to drill down.`}
      />

      <div className="p-6 space-y-6">
        {/* Tab-level filters */}
        {!useGlobalFilters && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/20">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
              Tab Filters
            </span>
            <Select value={tabLender} onValueChange={setTabLender}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Lenders</SelectItem>
                {allLenders.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tabProductType} onValueChange={setTabProductType}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Programs</SelectItem>
                {allProductTypes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tabFlow} onValueChange={setTabFlow}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Flows</SelectItem>
                {allFlows.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ─── Pre-Funnel Metrics (only when not lender-filtered) ────── */}
        {!isLenderFiltered && (
          <>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pre-Funnel
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Whitelisted Base", metric: Math.round(stats.mtdWhitelisted * pF).toLocaleString("en-IN"), subtitle: "Pre-funnel audience eligible for offers", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: Math.round(stats.mtdWhitelisted * pF).toLocaleString("en-IN"), sub: "MTD" }, { label: cL, value: Math.round(stats.lmtdWhitelisted * cF).toLocaleString("en-IN"), sub: "LMTD" }, { label: "Growth", value: `${stats.lmtdWhitelisted > 0 ? (((stats.mtdWhitelisted * pF) - (stats.lmtdWhitelisted * cF)) / (stats.lmtdWhitelisted * cF) * 100).toFixed(1) : 0}%`, color: (stats.mtdWhitelisted * pF) >= (stats.lmtdWhitelisted * cF) ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Whitelisted base represents users eligible for lending offers.", "Higher base typically correlates with more downstream workable leads.", "Mock data — derived from funnel volume estimates."] }] } })}>
                  <QuickStat label="Whitelisted Base" mtd={Math.round(stats.mtdWhitelisted * pF)} lmtd={Math.round(stats.lmtdWhitelisted * cF)} mock />
                </ClickableKpiCard>
                <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Unique Impressions", metric: Math.round(stats.mtdImpressions * pF).toLocaleString("en-IN"), subtitle: "Offer impressions served to users", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: Math.round(stats.mtdImpressions * pF).toLocaleString("en-IN") }, { label: cL, value: Math.round(stats.lmtdImpressions * cF).toLocaleString("en-IN") }, { label: "Growth", value: `${stats.lmtdImpressions > 0 ? (((stats.mtdImpressions * pF) - (stats.lmtdImpressions * cF)) / (stats.lmtdImpressions * cF) * 100).toFixed(1) : 0}%`, color: (stats.mtdImpressions * pF) >= (stats.lmtdImpressions * cF) ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Impressions indicate reach of lending offers.", "Higher impressions with stable CTR drive more clicks.", "Mock data — derived from funnel volume estimates."] }] } })}>
                  <QuickStat label="Unique Impressions" mtd={Math.round(stats.mtdImpressions * pF)} lmtd={Math.round(stats.lmtdImpressions * cF)} mock />
                </ClickableKpiCard>
                <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Unique Clicks", metric: Math.round(stats.mtdClicks * pF).toLocaleString("en-IN"), subtitle: "Users who clicked on offers", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: Math.round(stats.mtdClicks * pF).toLocaleString("en-IN") }, { label: cL, value: Math.round(stats.lmtdClicks * cF).toLocaleString("en-IN") }, { label: "Growth", value: `${stats.lmtdClicks > 0 ? (((stats.mtdClicks * pF) - (stats.lmtdClicks * cF)) / (stats.lmtdClicks * cF) * 100).toFixed(1) : 0}%`, color: (stats.mtdClicks * pF) >= (stats.lmtdClicks * cF) ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Clicks indicate user interest in offers.", "CTR = Clicks / Impressions. Higher CTR suggests better targeting.", "Mock data — derived from funnel volume estimates."] }] } })}>
                  <QuickStat label="Unique Clicks" mtd={Math.round(stats.mtdClicks * pF)} lmtd={Math.round(stats.lmtdClicks * cF)} mock />
                </ClickableKpiCard>
                <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "LPV (Flow2 only)", metric: Math.round(stats.mtdLPV * pF).toLocaleString("en-IN"), subtitle: "Landing Page Views — Flow2 Manual", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: Math.round(stats.mtdLPV * pF).toLocaleString("en-IN") }, { label: cL, value: Math.round(stats.lmtdLPV * cF).toLocaleString("en-IN") }, { label: "Growth", value: `${stats.lmtdLPV > 0 ? (((stats.mtdLPV * pF) - (stats.lmtdLPV * cF)) / (stats.lmtdLPV * cF) * 100).toFixed(1) : 0}%`, color: (stats.mtdLPV * pF) >= (stats.lmtdLPV * cF) ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["LPV = Landing Page Views for Flow2 (Manual) users.", "FFR% = Workable Leads / LPV. Higher FFR indicates better form completion.", "Mock data — derived from Flow2 workable volume."] }] } })}>
                  <QuickStat label="LPV (Flow2 only)" mtd={Math.round(stats.mtdLPV * pF)} lmtd={Math.round(stats.lmtdLPV * cF)} mock />
                </ClickableKpiCard>
                <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "FFR% (Flow2)", metric: `${stats.mtdFFR.toFixed(1)}%`, subtitle: "Form Fill Rate — Flow2 only", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: `${stats.mtdFFR.toFixed(1)}%` }, { label: cL, value: `${stats.lmtdFFR.toFixed(1)}%` }, { label: "Delta", value: `${(stats.mtdFFR - stats.lmtdFFR).toFixed(1)}pp`, color: stats.mtdFFR >= stats.lmtdFFR ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["FFR = Workable Leads / LPV. Measures form completion rate.", "Higher FFR indicates better landing page UX and form design.", "Check load times and form complexity if FFR drops."] }] } })}>
                  <QuickRatio label="FFR% (Flow2)" mtd={stats.mtdFFR} lmtd={stats.lmtdFFR} />
                </ClickableKpiCard>
                <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Flow1 : Flow2 Ratio", metric: `${stats.flowRatio.toFixed(2)}x`, subtitle: "Auto vs Manual flow volume", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: `${stats.flowRatio.toFixed(2)}x` }, { label: cL, value: `${stats.lmtdFlowRatio.toFixed(2)}x` }, { label: "Delta", value: `${(stats.flowRatio - stats.lmtdFlowRatio).toFixed(2)}x`, color: stats.flowRatio >= stats.lmtdFlowRatio ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Flow1 (Auto) vs Flow2 (Manual) workable lead ratio.", "Ratio > 1: More auto leads. Ratio < 1: More manual leads.", "Balance depends on product mix and acquisition strategy."] }] } })}>
                  <QuickRatio label="Flow1 : Flow2 Ratio" mtd={stats.flowRatio} lmtd={stats.lmtdFlowRatio} suffix="x" isPct={false} />
                </ClickableKpiCard>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ─── Funnel Metrics ──────────────────────────────────────────── */}
        <div id="funnel-kpis">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isLenderFiltered ? `${effectiveLender} — Funnel KPIs (Child Lead → Disbursal)` : "Funnel KPIs"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {!isLenderFiltered && (
              <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Workable Leads", metric: Math.round(stats.mtdW * pF).toLocaleString("en-IN"), subtitle: "Leads that passed initial eligibility", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: Math.round(stats.mtdW * pF).toLocaleString("en-IN") }, { label: cL, value: Math.round(stats.lmtdW * cF).toLocaleString("en-IN") }, { label: "Growth", value: stats.lmtdW ? `${(((stats.mtdW * pF) - (stats.lmtdW * cF)) / (stats.lmtdW * cF) * 100).toFixed(1)}%` : "0%", color: (stats.mtdW * pF) >= (stats.lmtdW * cF) ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Workable leads are the top of funnel — passed initial eligibility checks.", "Higher volume with stable conversion drives more disbursals.", "Monitor for seasonal patterns and acquisition changes."] }, ...(kpiConfigs.workableChart ? [kpiConfigs.workableChart] : [])] } })}>
                <QuickStat label="Workable Leads" mtd={Math.round(stats.mtdW * pF)} lmtd={Math.round(stats.lmtdW * cF)} />
              </ClickableKpiCard>
            )}
            <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Child Leads", metric: Math.round(stats.mtdC * pF).toLocaleString("en-IN"), subtitle: "Child leads created at lenders", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: Math.round(stats.mtdC * pF).toLocaleString("en-IN") }, { label: cL, value: Math.round(stats.lmtdC * cF).toLocaleString("en-IN") }, { label: "Growth", value: stats.lmtdC ? `${(((stats.mtdC * pF) - (stats.lmtdC * cF)) / (stats.lmtdC * cF) * 100).toFixed(1)}%` : "0%", color: (stats.mtdC * pF) >= (stats.lmtdC * cF) ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Child leads = leads sent to lenders for processing.", "Child/Parent ratio indicates multi-lender coverage per parent.", "Higher child leads with good conversion = more disbursals."] }, ...(kpiConfigs.childChart ? [kpiConfigs.childChart] : [])] } })}>
              <QuickStat label="Child Leads" mtd={Math.round(stats.mtdC * pF)} lmtd={Math.round(stats.lmtdC * cF)} />
            </ClickableKpiCard>
            <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Disbursed", metric: Math.round(stats.mtdD * pF).toLocaleString("en-IN"), subtitle: "Loans successfully disbursed", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: Math.round(stats.mtdD * pF).toLocaleString("en-IN") }, { label: cL, value: Math.round(stats.lmtdD * cF).toLocaleString("en-IN") }, { label: "Amount (Cr)", value: `${((stats.mtdD * pF * AVG_ATS) / 100).toFixed(1)}`, sub: `ATS ~${AVG_ATS}L` }] }, { type: "bullets", title: "Analysis", bullets: ["Disbursed = loans successfully funded.", `Est. amount: ₹${((stats.mtdD * pF * AVG_ATS) / 100).toFixed(1)} Cr at ~₹${AVG_ATS}L ATS.`, "Track lender-wise disbursal for portfolio mix."] }, ...(kpiConfigs.disbChart ? [kpiConfigs.disbChart] : [])] } })}>
              <QuickStat label="Disbursed" mtd={Math.round(stats.mtdD * pF)} lmtd={Math.round(stats.lmtdD * cF)} />
            </ClickableKpiCard>
            <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: isLenderFiltered ? "Child to Disbursal" : "Workable to Disbursal", metric: `${stats.w2d.toFixed(2)}%`, subtitle: "End-to-end funnel conversion", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: `${stats.w2d.toFixed(2)}%` }, { label: cL, value: `${stats.lmtdW2d.toFixed(2)}%` }, { label: "Delta", value: `${(stats.w2d - stats.lmtdW2d).toFixed(2)}pp`, color: stats.w2d >= stats.lmtdW2d ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Stage-wise Funnel", bullets: isLenderFiltered ? [`Child Lead → Disbursal: ${stats.w2d.toFixed(2)}%`, "Conversion from child lead creation to final disbursal.", "Improve by addressing stage drop-offs (BRE, KYC, etc.)."] : [`Workable → Disbursed: ${stats.w2d.toFixed(2)}%`, "Full funnel from workable lead to disbursal.", "Stage-wise conversion: Workable → Child → ... → Disbursed.", "Improve by fixing bottlenecks at each stage."] }] } })}>
              <QuickRatio label={isLenderFiltered ? "Child to Disbursal" : "Workable to Disbursal"} mtd={stats.w2d} lmtd={stats.lmtdW2d} />
            </ClickableKpiCard>
            {!isLenderFiltered && (
              <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Child / Parent Ratio", metric: `${stats.parentToChild.toFixed(2)}x`, subtitle: "Child leads per workable parent", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: `${stats.parentToChild.toFixed(2)}x` }, { label: cL, value: `${stats.lmtdParentToChild.toFixed(2)}x` }, { label: "Delta", value: `${(stats.parentToChild - stats.lmtdParentToChild).toFixed(2)}x`, color: stats.parentToChild >= stats.lmtdParentToChild ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Ratio = Child Leads / Workable Leads.", ">1x: Multiple lenders per parent — good offer coverage.", "<1x: Fewer child leads — may indicate limited matching."] }] } })}>
                <QuickRatio label="Child / Parent Ratio" mtd={stats.parentToChild} lmtd={stats.lmtdParentToChild} suffix="x" isPct={false} />
              </ClickableKpiCard>
            )}
            {!isLenderFiltered && (
              <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Child to Disbursal", metric: `${stats.c2d.toFixed(2)}%`, subtitle: "Child Lead → Disbursal conversion", sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: `${stats.c2d.toFixed(2)}%` }, { label: cL, value: `${stats.lmtdC2d.toFixed(2)}%` }, { label: "Delta", value: `${(stats.c2d - stats.lmtdC2d).toFixed(2)}pp`, color: stats.c2d >= stats.lmtdC2d ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: ["Conversion from child lead creation to disbursal.", "Excludes pre-child stages (workable, BRE, MOS).", "Key metric for lender performance and process efficiency."] }] } })}>
                <QuickRatio label="Child to Disbursal" mtd={stats.c2d} lmtd={stats.lmtdC2d} />
              </ClickableKpiCard>
            )}
          </div>
        </div>

        {/* ═══ Lender-specific KPIs, Radar, Product Table ═══════════════ */}
        {isLenderFiltered && lenderKPIs && (
          <>
            <Separator />
            {/* Lender Disbursal KPIs */}
            <div id="lender-kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Loans Disbursed", metric: lenderKPIs.totalDisb.toLocaleString("en-IN"), subtitle: `${effectiveLender} — from ${lenderKPIs.totalChild.toLocaleString("en-IN")} child leads`, sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: lenderKPIs.totalDisb.toLocaleString("en-IN") }, { label: cL, value: Math.round(lenderKPIs.totalDisb * LMTD_FACTOR).toLocaleString("en-IN"), sub: "est." }, { label: "Growth", value: `${lenderKPIs.growth > 0 ? "+" : ""}${lenderKPIs.growth.toFixed(1)}%`, color: lenderKPIs.growth >= 0 ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: [`${effectiveLender} disbursed ${lenderKPIs.totalDisb.toLocaleString("en-IN")} loans.`, `Amount: ₹${lenderKPIs.amountCr.toFixed(1)} Cr at ~₹${AVG_ATS}L ATS.`, "Compare with other lenders in All Lenders view."] }, ...(byProduct.length > 0 ? [{ type: "chart" as const, title: "Product-wise Disbursals", chart: { type: "bar" as const, data: byProduct.map((p) => ({ name: p.product_type, value: p.disbursed })), label: "Loans", valueSuffix: "" } }] : [])] } })}>
                <KPICard title="Loans Disbursed" value={lenderKPIs.totalDisb.toLocaleString("en-IN")}
                  subtitle={`from ${lenderKPIs.totalChild.toLocaleString("en-IN")} child leads`}
                  delta={lenderKPIs.growth} icon={<Hash className="h-5 w-5 text-violet-600" />}
                />
              </ClickableKpiCard>
              <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: `Amount (${pL})`, metric: `${lenderKPIs.amountCr.toFixed(1)} Cr`, subtitle: `${effectiveLender} disbursal value`, sections: [{ type: "kpi-row", title: "Period Comparison", kpis: [{ label: pL, value: `${lenderKPIs.amountCr.toFixed(1)} Cr` }, { label: cL, value: `${lenderKPIs.lmtdAmountCr.toFixed(1)} Cr`, sub: "est." }, { label: "Growth", value: `${lenderKPIs.amtGrowth > 0 ? "+" : ""}${lenderKPIs.amtGrowth.toFixed(1)}%`, color: lenderKPIs.amtGrowth >= 0 ? "text-emerald-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: [`Amount = Disbursed × ATS (~₹${AVG_ATS}L).`, lenderKPIs.aop > 0 ? `AOP Target: ₹${lenderKPIs.aop} Cr. Achievement: ${lenderKPIs.achvPct.toFixed(1)}%.` : "No AOP set for this lender.", "Track monthly trends for pacing."] }] } })}>
                <KPICard title={`Amount (${pL})`} value={`${lenderKPIs.amountCr.toFixed(1)} Cr`}
                  subtitle={`${cL}: ${lenderKPIs.lmtdAmountCr.toFixed(1)} Cr`}
                  delta={lenderKPIs.amtGrowth} icon={<Banknote className="h-5 w-5 text-emerald-600" />}
                />
              </ClickableKpiCard>
              <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "Disbursal Conv%", metric: `${lenderKPIs.convPct.toFixed(1)}%`, subtitle: "Child Lead → Disbursal", sections: [{ type: "kpi-row", title: "Conversion", kpis: [{ label: "Conv%", value: `${lenderKPIs.convPct.toFixed(1)}%` }, { label: "Child Leads", value: lenderKPIs.totalChild.toLocaleString("en-IN") }, { label: "Disbursed", value: lenderKPIs.totalDisb.toLocaleString("en-IN") }] }, { type: "bullets", title: "Analysis", bullets: ["Conversion from child lead creation to disbursal.", "Higher conv% indicates better lender process and approval rates.", "Compare with Hero Funnel in radar chart."] }, ...(byProduct.length > 0 ? [{ type: "chart" as const, title: "Conv% by Product", chart: { type: "bar" as const, data: byProduct.map((p) => ({ name: p.product_type, value: p.conv })), label: "Conv%", valueSuffix: "%" } }] : [])] } })}>
                <KPICard title="Disbursal Conv%" value={`${lenderKPIs.convPct.toFixed(1)}%`}
                  subtitle="Child Lead → Disbursal"
                  icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                />
              </ClickableKpiCard>
              <ClickableKpiCard onClick={() => setKpiDive({ open: true, config: { title: "AOP Target", metric: lenderKPIs.aop > 0 ? `${lenderKPIs.aop} Cr` : "N/A", subtitle: lenderKPIs.aop > 0 ? `${lenderKPIs.achvPct.toFixed(1)}% achieved` : "No AOP set", sections: [{ type: "kpi-row", title: "AOP Progress", kpis: [{ label: "Target", value: lenderKPIs.aop > 0 ? `${lenderKPIs.aop} Cr` : "N/A" }, { label: "Achieved", value: `${lenderKPIs.amountCr.toFixed(1)} Cr` }, { label: "Progress", value: lenderKPIs.aop > 0 ? `${lenderKPIs.achvPct.toFixed(1)}%` : "-", color: lenderKPIs.achvPct >= 80 ? "text-emerald-600" : lenderKPIs.achvPct >= 50 ? "text-amber-600" : "text-red-600" }] }, { type: "bullets", title: "Analysis", bullets: lenderKPIs.aop > 0 ? [`AOP = Annual Operating Plan target for ${effectiveLender}.`, `Current: ${lenderKPIs.achvPct.toFixed(1)}% of target.`, lenderKPIs.achvPct >= 80 ? "On track for target." : "Monitor pacing — consider volume or conversion improvements."] : ["No AOP target configured for this lender.", "Set targets in lender configuration to track progress."] }] } })}>
                <KPICard title="AOP Target" value={lenderKPIs.aop > 0 ? `${lenderKPIs.aop} Cr` : "N/A"}
                  subtitle={lenderKPIs.aop > 0 ? `${lenderKPIs.achvPct.toFixed(1)}% achieved` : "No AOP set"}
                  icon={<Target className="h-5 w-5 text-amber-600" />}
                />
              </ClickableKpiCard>
              <ClickableKpiCard onClick={() => lenderKpiConfigs.productTypes && setKpiDive({ open: true, config: lenderKpiConfigs.productTypes })}>
                <KPICard title="Product Types" value={`${byProduct.length}`}
                  subtitle={byProduct.map(p => p.product_type).join(", ")}
                  icon={<Users className="h-5 w-5 text-orange-600" />}
                />
              </ClickableKpiCard>
            </div>

            {lenderKPIs.aop > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">AOP Progress:</span>
                <Progress value={Math.min(lenderKPIs.achvPct, 100)} className="w-40 h-2" />
                <span className={cn(
                  "text-xs font-bold",
                  lenderKPIs.achvPct >= 80 ? "text-emerald-600" : lenderKPIs.achvPct >= 50 ? "text-amber-600" : "text-red-600"
                )}>{lenderKPIs.achvPct.toFixed(0)}% of {lenderKPIs.aop} Cr</span>
              </div>
            )}

            {/* Trend + Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TrendChart
                title={`${effectiveLender} — Monthly Disbursals`}
                data={lenderTrends}
                dataKey="disbursed"
                type="bar"
                color="hsl(220, 70%, 55%)"
                valueFormatter={(v) => v.toLocaleString("en-IN")}
                height={260}
              />
              <Card className="overflow-hidden">
                <CardHeader className="pb-1 pt-4 px-5">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">All Lenders Comparison</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-2 pr-2">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={lenderCompare} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 92%)" vertical={false} />
                      <XAxis dataKey="lender" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()} width={45}
                      />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip formatter={(value: any) => [Number(value).toLocaleString("en-IN"), "Disbursed"]} />
                      <Bar dataKey="disbursed" radius={[4, 4, 0, 0]} barSize={28}>
                        {lenderCompare.map((entry, idx) => (
                          <Cell key={idx} fill={entry.isActive ? "hsl(220, 70%, 55%)" : "hsl(220, 20%, 80%)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Radar + Product Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Stage Conversion: {effectiveLender} vs Hero Funnel</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Hero = best lender conv% per stage ({cL} basis)</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="stage" tick={{ fontSize: 8 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                      <Radar name={effectiveLender} dataKey={effectiveLender} stroke="hsl(220, 70%, 55%)"
                        fill="hsl(220, 70%, 55%)" fillOpacity={0.3} strokeWidth={2} />
                      <Radar name="Hero Funnel" dataKey="Hero Funnel" stroke="hsl(45, 93%, 47%)"
                        fill="hsl(45, 93%, 47%)" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{effectiveLender} — Product Type Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-[10px] font-semibold">Product</TableHead>
                        <TableHead className="text-[10px] font-semibold text-right">Loans</TableHead>
                        <TableHead className="text-[10px] font-semibold text-right">Amount (Cr)</TableHead>
                        <TableHead className="text-[10px] font-semibold text-right">Conv%</TableHead>
                        <TableHead className="text-[10px] font-semibold text-right">Growth</TableHead>
                        <TableHead className="text-[10px] font-semibold text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byProduct.map((p) => (
                        <TableRow key={p.product_type}>
                          <TableCell className="text-xs font-medium">{p.product_type}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{p.disbursed.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{p.amount_cr}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{p.conv}%</TableCell>
                          <TableCell className="text-right">
                            <span className={cn("text-[10px] font-semibold", p.growth > 0 ? "text-emerald-600" : p.growth < 0 ? "text-red-600" : "text-muted-foreground")}>
                              {p.growth > 0 ? "+" : ""}{p.growth}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {lenderKPIs.totalDisb > 0 ? ((p.disbursed / lenderKPIs.totalDisb) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Funnel Insights (Rich format) */}
        <RichInsightPanel
          title={isLenderFiltered ? `${effectiveLender} Funnel Insights` : "Funnel Insights"}
          insights={funnelInsights}
          pageName="Funnel Summary"
        />

        {/* ═══ Spider Chart (always visible) ═══════════════════════════ */}
        {!isLenderFiltered && radarData.length > 0 && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Stage Conversion: {pL} vs {cL}</CardTitle>
                  <ChartFeedbackButton chartTitle={`Stage Conversion: ${pL} vs ${cL}`} pageName="Funnel Summary" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Current period conversion% compared against comparison period at each funnel stage
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="stage" tick={{ fontSize: 8 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name={`${pL} Conv%`} dataKey={`${pL} Conv%`} stroke="hsl(220, 70%, 55%)"
                      fill="hsl(220, 70%, 55%)" fillOpacity={0.3} strokeWidth={2} />
                    <Radar name={`${cL} Conv%`} dataKey={`${cL} Conv%`} stroke="hsl(45, 93%, 47%)"
                      fill="hsl(45, 93%, 47%)" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══ Funnel Drop-off Overview ═══════════════════════════════ */}
        <Separator />
        <div id="funnel-dropoff">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Funnel Drop-off &amp; Leakage Impact
            </h2>
            <ChartFeedbackButton chartTitle="Funnel Drop-off & Leakage Impact" pageName="Funnel Summary" />
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Where leads drop, whether issues are structural or temporary, global or lender-specific, and the estimated disbursal impact
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Drop-off chart */}
            <Card className="overflow-hidden lg:col-span-2">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Stage-wise Lead Count &amp; Drop-off
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-2 pr-2">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={dropoffData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 92%)" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 7 }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={45} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={50}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const d = payload[0]?.payload;
                        if (!d) return null;
                        return (
                          <div className="rounded-lg border bg-card shadow-md px-3 py-2 text-xs">
                            <p className="font-semibold mb-1">{d.stage} <span className="text-muted-foreground font-normal">#{d.index}</span></p>
                            <p>Leads: <span className="font-bold">{d.leads.toLocaleString("en-IN")}</span></p>
                            {d.dropped > 0 && (
                              <>
                                <p className="text-red-600">Dropped: {d.dropped.toLocaleString("en-IN")} ({d.dropPct}%)</p>
                                <p className="text-emerald-600">Retained: {d.retainedPct}%</p>
                              </>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="leads" name="Leads" radius={[4, 4, 0, 0]} barSize={28}>
                      {dropoffData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.dropPct > 30 ? "hsl(350, 65%, 55%)" : entry.dropPct > 15 ? "hsl(30, 80%, 55%)" : "hsl(220, 70%, 55%)"}
                          fillOpacity={0.7}
                        />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="leads" stroke="hsl(220, 70%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Leakage summary cards */}
            <div className="grid grid-cols-2 gap-3 content-start">
              <Card className="border-red-200/50">
                <CardContent className="p-3">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Leads Lost</p>
                  <p className="text-base font-bold tabular-nums text-red-600">{leakageImpact.totalLostLeads.toLocaleString("en-IN")}</p>
                </CardContent>
              </Card>
              <Card className="border-red-200/50">
                <CardContent className="p-3">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Est. Lost Loans</p>
                  <p className="text-base font-bold tabular-nums text-red-600">{leakageImpact.totalLostLoans.toLocaleString("en-IN")}</p>
                </CardContent>
              </Card>
              <Card className="border-red-200/50">
                <CardContent className="p-3">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Est. Lost Amount</p>
                  <p className="text-base font-bold tabular-nums text-red-600">{leakageImpact.totalLostAmountCr.toFixed(1)} Cr</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Actual Disbursed</p>
                  <p className="text-base font-bold tabular-nums text-emerald-600">{Math.round(stats.mtdD * pF).toLocaleString("en-IN")}</p>
                  <p className="text-[9px] text-muted-foreground">{((stats.mtdD * pF * AVG_ATS) / 100).toFixed(1)} Cr</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ─── Unified Stage Health Table ─────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Stage Health: Drop-off, Diagnosis &amp; Impact</CardTitle>
                <ChartFeedbackButton chartTitle="Stage Health: Drop-off, Diagnosis & Impact" pageName="Funnel Summary" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                One view combining where leads drop, whether it is structural or temporary, global or specific, and the disbursal impact
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[10px] font-semibold min-w-[120px]">Stage</TableHead>
                      <TableHead className="text-[10px] font-semibold text-right">Drop%</TableHead>
                      <TableHead className="text-[10px] font-semibold text-right">{pL} Conv%</TableHead>
                      <TableHead className="text-[10px] font-semibold text-right">{cL} Conv%</TableHead>
                      <TableHead className="text-[10px] font-semibold text-right">Delta</TableHead>
                      <TableHead className="text-[10px] font-semibold text-center">Diagnosis</TableHead>
                      <TableHead className="text-[10px] font-semibold text-center">Scope</TableHead>
                      <TableHead className="text-[10px] font-semibold">Worst Lender / Program</TableHead>
                      <TableHead className="text-[10px] font-semibold text-right">Est. Lost (Cr)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structuralAnalysis.map((sa, saIdx) => {
                      const gvs = globalVsSpecific.find((g) => g.index === sa.index);
                      const li = leakageImpact.stages.find((l) => l.index === sa.index);
                      const dd = dropoffData.find((d) => d.index === sa.index);

                      return (
                        <TableRow
                          key={sa.index}
                          className="hover:bg-muted/20 cursor-pointer transition-colors"
                          onClick={() => {
                            document.getElementById("funnel-drilldown")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          title="Click to scroll to Funnel Drill-down"
                        >
                          <TableCell className="text-xs font-medium py-2">
                            {sa.stage.length > 18 ? sa.stage.substring(0, 16) + ".." : sa.stage}
                            <span className="text-[9px] text-muted-foreground ml-1">#{sa.index}</span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            {dd && dd.dropPct > 0 ? (
                              <span className={cn(
                                "text-[11px] font-bold tabular-nums",
                                dd.dropPct > 30 ? "text-red-600" : dd.dropPct > 15 ? "text-amber-600" : "text-muted-foreground"
                              )}>
                                {dd.dropPct}%
                              </span>
                            ) : <span className="text-[10px] text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">
                            {sa.mtdConv !== null ? `${sa.mtdConv}%` : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                            {sa.lmtdConv !== null ? `${sa.lmtdConv}%` : "-"}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            {sa.delta !== null ? (
                              <span className={cn(
                                "text-[10px] font-bold",
                                sa.delta > 0 ? "text-emerald-600" : sa.delta < 0 ? "text-red-600" : "text-muted-foreground"
                              )}>
                                {sa.delta > 0 ? "+" : ""}{sa.delta.toFixed(1)}pp
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-bold px-1.5",
                              sa.diagnosis === "structural" ? "bg-red-50 text-red-700 border-red-200" :
                              sa.diagnosis === "temporary_drop" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              sa.diagnosis === "temporary_gain" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              "bg-gray-50 text-gray-600 border-gray-200"
                            )}>
                              {sa.diagnosis === "structural" ? "Structural" :
                               sa.diagnosis === "temporary_drop" ? "Temp Drop" :
                               sa.diagnosis === "temporary_gain" ? "Temp Gain" : "Healthy"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            {gvs ? (
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-bold px-1.5",
                                gvs.isGlobal ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"
                              )}>
                                {gvs.isGlobal ? `Global (${gvs.droppedCount}/${gvs.totalCount})` : `Specific`}
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {gvs?.worstLender && (
                                <span className="text-[10px]">
                                  <span className="font-semibold text-red-600">{gvs.worstLender}</span>
                                  <span className="text-muted-foreground ml-0.5">
                                    ({gvs.lenderDeltas.find((l) => l.name === gvs.worstLender)?.delta?.toFixed(1)}pp)
                                  </span>
                                </span>
                              )}
                              {gvs?.worstProduct && (
                                <span className="text-[10px]">
                                  <span className="font-semibold text-amber-700">{gvs.worstProduct}</span>
                                  <span className="text-muted-foreground ml-0.5">
                                    ({gvs.productDeltas.find((p) => p.name === gvs.worstProduct)?.delta?.toFixed(1)}pp)
                                  </span>
                                </span>
                              )}
                              {!gvs?.worstLender && !gvs?.worstProduct && (
                                <span className="text-[10px] text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            {li ? (
                              <span className="text-[11px] font-bold tabular-nums text-red-600">
                                {li.estimatedLostAmountCr.toFixed(1)}
                              </span>
                            ) : <span className="text-[10px] text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[8px] px-1 bg-red-50 text-red-700 border-red-200">Structural</Badge> Consistently low both periods</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[8px] px-1 bg-amber-50 text-amber-700 border-amber-200">Temp Drop</Badge> {pL} fell vs {cL}</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[8px] px-1 bg-red-50 text-red-700 border-red-200">Global</Badge> &gt;60% lenders affected</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[8px] px-1 bg-blue-50 text-blue-700 border-blue-200">Specific</Badge> Isolated to few lenders</span>
          </div>
        </div>

        <Separator />

        {/* ═══ Funnel Drill-down Table (L1/L2/L3) ═══════════════════════ */}
        <div id="funnel-drilldown">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Funnel Drill-down
            </h2>
            <ChartFeedbackButton chartTitle="Funnel Drill-down" pageName="Funnel Summary" />
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Click any stage to drill into sub-stages (L2) and failure reasons (L3)
          </p>
          <FunnelTable
            l2Data={l2Data}
            allL2Data={l2Data}
            funnelStages={funnelStages}
            selectedLender={effectiveLender}
            selectedProductType={effectiveProductType}
            selectedFlow={effectiveFlow}
          />
        </div>

        {/* Cross-Lender Conv% Comparison Table (only when not filtered to a single lender) */}
        {!isLenderFiltered && <Separator />}
        {!isLenderFiltered && <Card id="cross-lender">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  Cross-Lender Stage Conversion Comparison
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {pL} conv% per stage across all lenders. Hero (best) highlighted.
                </p>
              </div>
              <button
                className={cn(
                  "text-[10px] font-semibold px-3 py-1.5 rounded-md border transition-colors",
                  showFlowBreakdown
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
                onClick={() => setShowFlowBreakdown(!showFlowBreakdown)}
              >
                {showFlowBreakdown ? "Hide Flow Breakdown" : "Show Flow Breakdown"}
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px] font-semibold sticky left-0 bg-muted/50 z-10 min-w-[100px]">
                      Lender
                    </TableHead>
                    {crossLenderData.stagePairs.map(({ curIdx, stageName }) => (
                      <TableHead
                        key={curIdx}
                        className="text-[10px] font-semibold text-center min-w-[90px]"
                      >
                        <div>{stageName.length > 14 ? stageName.substring(0, 12) + "..." : stageName}</div>
                        <div className="text-[8px] font-normal text-muted-foreground">#{curIdx}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossLenderData.lenders.map((lender) => (
                    <>
                      {/* All-flow row */}
                      <TableRow key={lender} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-semibold sticky left-0 bg-card z-10">
                          {lender}
                        </TableCell>
                        {crossLenderData.stagePairs.map(({ curIdx }) => {
                          const conv = crossLenderData.lenderConv[lender]?.[curIdx];
                          const hero = crossLenderData.heroPerStage[curIdx];
                          const isHero = hero?.lender === lender;
                          return (
                            <TableCell key={curIdx} className="text-center py-2">
                              {conv !== null && conv !== undefined ? (
                                <span
                                  className={cn(
                                    "text-[11px] tabular-nums font-medium",
                                    isHero
                                      ? "inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 font-bold rounded-full px-2 py-0.5"
                                      : conv >= (hero?.conv || 0) * 0.9
                                      ? "text-emerald-700"
                                      : conv < (hero?.conv || 0) * 0.7
                                      ? "text-red-600"
                                      : "text-foreground/80"
                                  )}
                                >
                                  {isHero && <Trophy className="h-2.5 w-2.5" />}
                                  {conv.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      {/* Flow breakdown rows */}
                      {showFlowBreakdown &&
                        crossLenderData.flows.map((flow) => {
                          const key = `${lender}||${flow}`;
                          const hasAnyData = crossLenderData.stagePairs.some(
                            ({ curIdx }) => crossLenderData.lenderFlowConv[key]?.[curIdx] != null
                          );
                          if (!hasAnyData) return null;
                          return (
                            <TableRow
                              key={`${lender}-${flow}`}
                              className="bg-muted/5 border-b border-dashed border-border/30"
                            >
                              <TableCell className="text-[10px] text-muted-foreground pl-6 sticky left-0 bg-card/95 z-10">
                                {flow.includes("Auto") ? "Flow1 (Auto)" : "Flow2 (Manual)"}
                              </TableCell>
                              {crossLenderData.stagePairs.map(({ curIdx }) => {
                                const conv =
                                  crossLenderData.lenderFlowConv[key]?.[curIdx];
                                return (
                                  <TableCell
                                    key={curIdx}
                                    className="text-center py-1.5"
                                  >
                                    {conv !== null && conv !== undefined ? (
                                      <span className="text-[10px] tabular-nums text-muted-foreground">
                                        {conv.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-muted-foreground/50">
                                        -
                                      </span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>}

        <KpiDeepDiveModal open={kpiDive.open} onClose={() => setKpiDive({ open: false, config: null })} config={kpiDive.config} />
      </div>
    </div>
  );
}

// ─── Small components ───────────────────────────────────────────────────────

function QuickStat({
  label,
  mtd,
  lmtd,
  mock = false,
}: {
  label: string;
  mtd: number;
  lmtd: number;
  mock?: boolean;
}) {
  const { compareLabel: cL } = useDateRangeFactors();
  const growth = lmtd > 0 ? ((mtd - lmtd) / lmtd) * 100 : 0;
  return (
    <Card className={mock ? "border-dashed" : ""}>
      <CardContent className="p-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {label}
          {mock && <span className="text-[8px] ml-1 text-muted-foreground/50">(mock)</span>}
        </p>
        <p className="text-lg font-bold tabular-nums">
          {mtd.toLocaleString("en-IN")}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {cL}: {lmtd.toLocaleString("en-IN")}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1 py-0 ${
              growth > 0
                ? "text-emerald-600 border-emerald-200"
                : growth < 0
                ? "text-red-600 border-red-200"
                : ""
            }`}
          >
            {growth > 0 ? "+" : ""}
            {growth.toFixed(1)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickRatio({
  label,
  mtd,
  lmtd,
  suffix = "%",
  isPct = true,
}: {
  label: string;
  mtd: number;
  lmtd: number;
  suffix?: string;
  isPct?: boolean;
}) {
  const { compareLabel: cL } = useDateRangeFactors();
  const delta = mtd - lmtd;
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums">
          {mtd.toFixed(2)}{suffix}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {cL}: {lmtd.toFixed(2)}{suffix}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1 py-0 ${
              isPct
                ? delta > 0
                  ? "text-emerald-600 border-emerald-200"
                  : delta < 0
                  ? "text-red-600 border-red-200"
                  : ""
                : ""
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(2)} {isPct ? "pp" : ""}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
