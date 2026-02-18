"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface FilterState {
  lender: string;
  productType: string;
  flow: string;
}

export type DateRangePreset = "mtd" | "d1" | "last7" | "mom" | "custom";

export interface DateRangeState {
  preset: DateRangePreset;
  customFrom?: string; // YYYY-MM-DD
  customTo?: string;
  customCompare: boolean;
  customCompareFrom?: string;
  customCompareTo?: string;
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, { label: string; period: string; compare: string }> = {
  mtd: { label: "MTD vs LMTD", period: "MTD", compare: "LMTD" },
  d1: { label: "D-1 vs D-2", period: "Yesterday", compare: "Day Before" },
  last7: { label: "Last 7 Days", period: "Last 7 Days", compare: "Prior 7 Days" },
  mom: { label: "MoM", period: "Last Month", compare: "Month Before" },
  custom: { label: "Custom Range", period: "Selected", compare: "Comparison" },
};

interface FilterContextType {
  global: FilterState;
  setGlobal: (filters: Partial<FilterState>) => void;
  resetGlobal: () => void;

  useGlobalFilters: boolean;
  setUseGlobalFilters: (val: boolean) => void;

  filterPanelOpen: boolean;
  setFilterPanelOpen: (val: boolean) => void;

  // Date range
  dateRange: DateRangeState;
  setDateRange: (dr: Partial<DateRangeState>) => void;

  availableLenders: string[];
  setAvailableLenders: (v: string[]) => void;
  availableProductTypes: string[];
  setAvailableProductTypes: (v: string[]) => void;
  availableFlows: string[];
  setAvailableFlows: (v: string[]) => void;
}

const defaultFilters: FilterState = {
  lender: "All",
  productType: "All",
  flow: "All",
};

const defaultDateRange: DateRangeState = {
  preset: "mtd",
  customCompare: false,
};

const FilterContext = createContext<FilterContextType>({
  global: defaultFilters,
  setGlobal: () => {},
  resetGlobal: () => {},
  useGlobalFilters: true,
  setUseGlobalFilters: () => {},
  filterPanelOpen: false,
  setFilterPanelOpen: () => {},
  dateRange: defaultDateRange,
  setDateRange: () => {},
  availableLenders: [],
  setAvailableLenders: () => {},
  availableProductTypes: [],
  setAvailableProductTypes: () => {},
  availableFlows: [],
  setAvailableFlows: () => {},
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [global, setGlobalState] = useState<FilterState>(defaultFilters);
  const [useGlobalFilters, setUseGlobalFilters] = useState(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [dateRange, setDateRangeState] = useState<DateRangeState>(defaultDateRange);
  const [availableLenders, setAvailableLenders] = useState<string[]>([]);
  const [availableProductTypes, setAvailableProductTypes] = useState<string[]>([]);
  const [availableFlows, setAvailableFlows] = useState<string[]>([]);

  const setGlobal = useCallback((partial: Partial<FilterState>) => {
    setGlobalState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetGlobal = useCallback(() => {
    setGlobalState(defaultFilters);
  }, []);

  const setDateRange = useCallback((partial: Partial<DateRangeState>) => {
    setDateRangeState((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <FilterContext.Provider
      value={{
        global,
        setGlobal,
        resetGlobal,
        useGlobalFilters,
        setUseGlobalFilters,
        filterPanelOpen,
        setFilterPanelOpen,
        dateRange,
        setDateRange,
        availableLenders,
        setAvailableLenders,
        availableProductTypes,
        setAvailableProductTypes,
        availableFlows,
        setAvailableFlows,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  return useContext(FilterContext);
}

// Test

/**
 * Returns simulation factors for the selected date range.
 * Since live data only has MTD/LMTD, other presets apply multipliers
 * to simulate different time periods. Once live data pipelines are
 * connected, replace this with actual date-filtered queries.
 */
export function useDateRangeFactors() {
  const { dateRange } = useFilters();
  const p = dateRange.preset;

  // Factor applied to MTD data to simulate the period's volume
  // Factor applied to LMTD data to simulate the comparison volume
  const factors: Record<DateRangePreset, { periodFactor: number; compareFactor: number }> = {
    mtd: { periodFactor: 1.0, compareFactor: 1.0 },
    d1: { periodFactor: 0.045, compareFactor: 0.042 },      // ~1/22 of month
    last7: { periodFactor: 0.32, compareFactor: 0.30 },      // ~7/22 of month
    mom: { periodFactor: 1.0, compareFactor: 0.94 },         // last month baseline
    custom: { periodFactor: 1.0, compareFactor: 1.0 },
  };

  const labels = DATE_RANGE_LABELS[p];

  return {
    preset: p,
    periodLabel: labels.period,
    compareLabel: labels.compare,
    periodFactor: factors[p].periodFactor,
    compareFactor: factors[p].compareFactor,
    dateRange,
  };
}

