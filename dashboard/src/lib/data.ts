import Papa from "papaparse";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FunnelRow {
  product_type: string;
  isautoleadcreated: string;
  major_index: number;
  major_stage: string;
  leads: number;
  conv_pct: number | null;
}

export interface LenderFunnelRow {
  lender: string;
  product_type: string;
  isautoleadcreated: string;
  major_index: number;
  major_stage: string;
  leads: number;
  conv_pct: number | null;
}

export interface DisbursalSummaryRow {
  product_type: string;
  isautoleadcreated: string;
  lender: string;
  child_leads: number;
  disbursed: number;
  disbursal_pct: number;
}

export interface L2AnalysisRow {
  lender: string;
  month_start: string; // "1.MTD" or "2.LMTD"
  product_type: string;
  isautoleadcreated: string;
  major_index: number;
  original_major_stage: string;
  sub_stage: string | null;
  leads: number;
  stuck_pct: number | null;
}

// ─── CSV Fetching ───────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

async function fetchCSV<T>(path: string, transform: (row: Record<string, string>) => T): Promise<T[]> {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.map(transform);
}

export async function fetchCompleteFunnel(): Promise<FunnelRow[]> {
  return fetchCSV("/data/Complete_Funnel_with_Stages.csv", (row) => ({
    product_type: row["product_type"]?.trim() || "",
    isautoleadcreated: row["isautoleadcreated"]?.trim() || "",
    major_index: parseInt(row["major_index"]) || 0,
    major_stage: row["major_stage"]?.trim() || "",
    leads: parseInt(row["Leads"]?.replace(/,/g, "")) || 0,
    conv_pct: row["Conv%"] ? parseFloat(row["Conv%"]) : null,
  }));
}

export async function fetchLenderFunnel(): Promise<LenderFunnelRow[]> {
  return fetchCSV("/data/Lender_Level_Funnel_With_Stages.csv", (row) => ({
    lender: row["lender"]?.trim() || "",
    product_type: row["product_type"]?.trim() || "",
    isautoleadcreated: row["isautoleadcreated"]?.trim() || "",
    major_index: parseInt(row["major_index"]) || 0,
    major_stage: row["major_stage"]?.trim() || "",
    leads: parseInt(row["Leads"]?.replace(/,/g, "")) || 0,
    conv_pct: row["Conv. %"] ? parseFloat(row["Conv. %"]) : null,
  }));
}

export async function fetchDisbursalSummary(): Promise<DisbursalSummaryRow[]> {
  return fetchCSV("/data/Lender_Level_Disb_Summary.csv", (row) => ({
    product_type: row["product_type"]?.trim() || "",
    isautoleadcreated: row["isautoleadcreated"]?.trim() || "",
    lender: row["lender"]?.trim() || "",
    child_leads: parseInt(row["#Child_Leads_Created"]?.replace(/,/g, "")) || 0,
    disbursed: parseInt(row["#Disbursed"]?.replace(/,/g, "")) || 0,
    disbursal_pct: parseFloat(row["Disbursal %"]) || 0,
  }));
}

export async function fetchL2Analysis(): Promise<L2AnalysisRow[]> {
  return fetchCSV("/data/L2_Analysis.csv", (row) => ({
    lender: row["lender"]?.trim() || "",
    month_start: row["month_start"]?.trim() || "",
    product_type: row["product_type"]?.trim() || "",
    isautoleadcreated: row["isautoleadcreated"]?.trim() || "",
    major_index: parseFloat(row["major_index"]) || 0,
    original_major_stage: row["original_major_stage"]?.trim() || "",
    sub_stage: row["sub_stage"]?.trim() || null,
    leads: parseInt(row["Leads"]?.replace(/,/g, "")) || 0,
    stuck_pct: row["Stuck%"] ? parseFloat(row["Stuck%"]) : null,
  }));
}

// ─── Data Processing Helpers ────────────────────────────────────────────────

export function getUniqueValues<T>(data: T[], key: keyof T): string[] {
  const set = new Set<string>();
  data.forEach((row) => {
    const val = String(row[key]).trim();
    if (val) set.add(val);
  });
  return Array.from(set).sort();
}

export function formatNumber(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("en-IN");
}

export function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "-";
  return `${val.toFixed(2)}%`;
}

export function formatDelta(val: number): string {
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(2)} pp`;
}

// ─── AOP Config (hardcoded for now) ─────────────────────────────────────────

export const AOP_TARGET_CR = 500; // in Crores - configurable later

// ─── Mock monthly trend data (for Executive Summary) ────────────────────────
// Since we only have MTD snapshot, we'll generate reasonable trend data
// based on the disbursal summary. This will be replaced with real OLAP data.

export interface MonthlyTrend {
  month: string;
  disbursed_count: number;
  disbursed_amount_cr: number;
  ats_lakhs: number;
}

export function generateMonthlyTrends(disbursalData: DisbursalSummaryRow[]): MonthlyTrend[] {
  const totalDisbursed = disbursalData.reduce((sum, r) => sum + r.disbursed, 0);
  // Average ticket size assumption: ~2.5L per loan (common for merchant lending)
  const avgATS = 2.5;
  const currentAmountCr = (totalDisbursed * avgATS) / 100; // lakhs to crores

  const months = [
    "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025",
    "Jan 2026", "Feb 2026"
  ];

  // Simulate growth trend
  const growthFactors = [0.72, 0.78, 0.85, 0.90, 0.95, 1.0];

  return months.map((month, i) => {
    const factor = growthFactors[i];
    const count = Math.round(totalDisbursed * factor);
    const amount = parseFloat((currentAmountCr * factor).toFixed(2));
    return {
      month,
      disbursed_count: count,
      disbursed_amount_cr: amount,
      ats_lakhs: avgATS + (i * 0.05), // slight ATS growth
    };
  });
}
