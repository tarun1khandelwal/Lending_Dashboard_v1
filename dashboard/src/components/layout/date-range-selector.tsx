"use client";

import { useState, useRef, useEffect } from "react";
import { useFilters, DateRangePreset, DATE_RANGE_LABELS } from "@/lib/filter-context";
import { cn } from "@/lib/utils";
import { Calendar, ChevronDown, Check } from "lucide-react";

const PRESETS: { key: DateRangePreset; desc: string }[] = [
  { key: "mtd", desc: "Current month vs last month (same period)" },
  { key: "d1", desc: "Yesterday vs the day before" },
  { key: "last7", desc: "Last 7 days vs prior 7 days" },
  { key: "mom", desc: "Last full month vs month before that" },
  { key: "custom", desc: "Pick your own date range" },
];

export function DateRangeSelector() {
  const { dateRange, setDateRange } = useFilters();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const active = DATE_RANGE_LABELS[dateRange.preset];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
          open
            ? "bg-primary/5 border-primary/30 text-primary shadow-sm"
            : "bg-card border-border/60 text-foreground hover:border-border hover:shadow-sm"
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>{active.label}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Date Range</p>
          </div>

          {/* Presets */}
          <div className="p-1.5">
            {PRESETS.map((p) => {
              const isActive = dateRange.preset === p.key;
              const lbl = DATE_RANGE_LABELS[p.key];
              return (
                <button
                  key={p.key}
                  onClick={() => {
                    setDateRange({ preset: p.key });
                    if (p.key !== "custom") setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer",
                    isActive ? "bg-primary/8 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{lbl.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom date range inputs */}
          {dateRange.preset === "custom" && (
            <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/10">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Primary Range</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30"
                    value={dateRange.customFrom || ""}
                    onChange={(e) => setDateRange({ customFrom: e.target.value })}
                  />
                  <span className="text-[10px] text-muted-foreground">to</span>
                  <input
                    type="date"
                    className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30"
                    value={dateRange.customTo || ""}
                    onChange={(e) => setDateRange({ customTo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dateRange.customCompare}
                    onChange={(e) => setDateRange({ customCompare: e.target.checked })}
                    className="rounded border-border h-3.5 w-3.5 accent-primary"
                  />
                  <span className="text-[11px] font-medium">Compare with another range</span>
                </label>
              </div>

              {dateRange.customCompare && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Comparison Range</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={dateRange.customCompareFrom || ""}
                      onChange={(e) => setDateRange({ customCompareFrom: e.target.value })}
                    />
                    <span className="text-[10px] text-muted-foreground">to</span>
                    <input
                      type="date"
                      className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={dateRange.customCompareTo || ""}
                      onChange={(e) => setDateRange({ customCompareTo: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => setOpen(false)}
                className="w-full text-xs font-semibold bg-primary text-primary-foreground rounded-lg py-2 hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          )}

          <div className="px-3 py-1.5 border-t border-border bg-muted/20">
            <p className="text-[9px] text-muted-foreground text-center">Data comparison period adjusts across all tabs</p>
          </div>
        </div>
      )}
    </div>
  );
}
