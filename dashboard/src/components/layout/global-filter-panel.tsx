"use client";

import { useFilters } from "@/lib/filter-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function InlineFilters() {
  const {
    global,
    setGlobal,
    resetGlobal,
    useGlobalFilters,
    setUseGlobalFilters,
    availableLenders,
    availableProductTypes,
    availableFlows,
  } = useFilters();

  const activeCount = [global.lender, global.productType, global.flow].filter(
    (v) => v !== "All"
  ).length;

  return (
    <div className="flex items-center gap-1.5">
      {/* Global toggle */}
      <button
        onClick={() => setUseGlobalFilters(!useGlobalFilters)}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold border transition-colors cursor-pointer shrink-0",
          useGlobalFilters
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-border/60 bg-muted/30 text-muted-foreground"
        )}
        title={useGlobalFilters ? "Global filters active — click to disable" : "Global filters off — click to enable"}
      >
        <Globe className="h-3 w-3" />
        {useGlobalFilters ? "Global" : "Off"}
      </button>

      <div className="w-px h-4 bg-border/60" />

      <Select
        value={global.lender}
        onValueChange={(v) => setGlobal({ lender: v })}
      >
        <SelectTrigger
          className={cn(
            "h-7 text-[11px] font-medium border rounded-md px-2 min-w-[100px] max-w-[140px]",
            global.lender !== "All"
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border/60 text-muted-foreground"
          )}
        >
          <SelectValue placeholder="All Lenders" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Lenders</SelectItem>
          {availableLenders.map((l) => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={global.productType}
        onValueChange={(v) => setGlobal({ productType: v })}
      >
        <SelectTrigger
          className={cn(
            "h-7 text-[11px] font-medium border rounded-md px-2 min-w-[90px] max-w-[120px]",
            global.productType !== "All"
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border/60 text-muted-foreground"
          )}
        >
          <SelectValue placeholder="All Programs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Programs</SelectItem>
          {availableProductTypes.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={global.flow}
        onValueChange={(v) => setGlobal({ flow: v })}
      >
        <SelectTrigger
          className={cn(
            "h-7 text-[11px] font-medium border rounded-md px-2 min-w-[90px] max-w-[130px]",
            global.flow !== "All"
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border/60 text-muted-foreground"
          )}
        >
          <SelectValue placeholder="All Flows" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Flows</SelectItem>
          {availableFlows.map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <button
          onClick={resetGlobal}
          className="flex items-center justify-center h-6 w-6 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer"
          title="Reset all filters"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
