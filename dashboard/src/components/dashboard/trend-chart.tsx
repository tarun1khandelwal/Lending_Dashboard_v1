"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface TrendChartProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  dataKey: string;
  xKey?: string;
  color?: string;
  type?: "area" | "bar";
  valueFormatter?: (val: number) => string;
  height?: number;
}

// Custom tooltip that shows MoM growth with month name
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, data, dataKey, xKey, valueFormatter }: any) {
  if (!active || !payload?.length) return null;

  const currentVal = payload[0]?.value;
  if (currentVal === undefined) return null;

  // Find previous month's value for MoM growth
  const currentIndex = data?.findIndex(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d: any) => d[xKey || "month"] === label
  );
  const prevEntry = currentIndex > 0 ? data[currentIndex - 1] : null;
  const prevVal = prevEntry ? prevEntry[dataKey] : null;
  const prevMonthName = prevEntry ? prevEntry[xKey || "month"] : null;
  const momGrowth =
    prevVal !== null && prevVal !== undefined && prevVal > 0
      ? ((currentVal - prevVal) / prevVal) * 100
      : null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm font-bold">
        {valueFormatter ? valueFormatter(currentVal) : currentVal}
      </p>
      {momGrowth !== null && (
        <p
          className={`text-[11px] font-semibold mt-1 ${
            momGrowth > 0
              ? "text-emerald-600"
              : momGrowth < 0
              ? "text-red-600"
              : "text-muted-foreground"
          }`}
        >
          {momGrowth > 0 ? "+" : ""}
          {momGrowth.toFixed(1)}% vs {prevMonthName}
        </p>
      )}
      {prevVal !== null && prevVal !== undefined && prevMonthName && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {prevMonthName}: {valueFormatter ? valueFormatter(prevVal) : prevVal}
        </p>
      )}
    </div>
  );
}

export function TrendChart({
  title,
  data,
  dataKey,
  xKey = "month",
  color = "hsl(220, 70%, 55%)",
  type = "area",
  valueFormatter = (v) => v.toLocaleString(),
  height = 240,
}: TrendChartProps) {
  // Compute current and prev month values for the header
  const lastVal = data.length > 0 ? data[data.length - 1]?.[dataKey] : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-1 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          {lastVal !== null && (
            <span className="text-sm font-bold tabular-nums">
              {valueFormatter(lastVal)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-2 pr-2">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`gradient-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(0, 0%, 92%)"
              vertical={false}
            />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              tickLine={false}
              axisLine={false}
              dy={5}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(0, 0%, 55%)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return v.toString();
              }}
              width={45}
            />
            <Tooltip
              content={
                <CustomTooltip
                  data={data}
                  dataKey={dataKey}
                  xKey={xKey}
                  valueFormatter={valueFormatter}
                />
              }
              cursor={{ stroke: "hsl(0, 0%, 80%)", strokeDasharray: "4 4" }}
            />
            {type === "area" ? (
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#gradient-${dataKey})`}
                dot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
              />
            ) : (
              <Bar
                dataKey={dataKey}
                fill={color}
                radius={[6, 6, 0, 0]}
                barSize={32}
                opacity={0.85}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
