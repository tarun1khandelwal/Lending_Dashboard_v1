"use client";

import { useEffect, useState } from "react";
import { useFilters, FilterState } from "@/lib/filter-context";
import {
  fetchDisbursalSummary,
  fetchL2Analysis,
  getUniqueValues,
  DisbursalSummaryRow,
  L2AnalysisRow,
} from "@/lib/data";

// Centralized data loader that also populates global filter options
export function useAppData() {
  const {
    setAvailableLenders,
    setAvailableProductTypes,
    setAvailableFlows,
  } = useFilters();

  const [disbursalData, setDisbursalData] = useState<DisbursalSummaryRow[]>([]);
  const [l2Data, setL2Data] = useState<L2AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [disb, l2] = await Promise.all([
        fetchDisbursalSummary(),
        fetchL2Analysis(),
      ]);
      setDisbursalData(disb);
      setL2Data(l2);

      // Populate filter options from data
      const lenders = new Set([
        ...getUniqueValues(disb, "lender"),
        ...getUniqueValues(l2, "lender"),
      ]);
      const products = new Set([
        ...getUniqueValues(disb, "product_type"),
        ...getUniqueValues(l2, "product_type"),
      ]);
      const flows = new Set([
        ...getUniqueValues(disb, "isautoleadcreated"),
        ...getUniqueValues(l2, "isautoleadcreated"),
      ]);

      setAvailableLenders(Array.from(lenders).sort());
      setAvailableProductTypes(Array.from(products).sort());
      setAvailableFlows(Array.from(flows).sort());

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { disbursalData, l2Data, loading };
}

// Helper: apply global filters to disbursal data
export function applyGlobalDisbursalFilter(
  data: DisbursalSummaryRow[],
  filters: FilterState
): DisbursalSummaryRow[] {
  return data.filter((r) => {
    if (filters.lender !== "All" && r.lender !== filters.lender) return false;
    if (filters.productType !== "All" && r.product_type !== filters.productType) return false;
    if (filters.flow !== "All" && r.isautoleadcreated !== filters.flow) return false;
    return true;
  });
}

// Helper: apply global filters to L2 data
export function applyGlobalL2Filter(
  data: L2AnalysisRow[],
  filters: FilterState
): L2AnalysisRow[] {
  return data.filter((r) => {
    if (filters.lender !== "All" && r.lender !== filters.lender) return false;
    if (filters.productType !== "All" && r.product_type !== filters.productType) return false;
    if (filters.flow !== "All" && r.isautoleadcreated !== filters.flow) return false;
    return true;
  });
}
