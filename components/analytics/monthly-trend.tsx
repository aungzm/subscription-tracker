"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CategoryMeta = {
  id: string;
  name: string;
  color: string;
};

type MonthlyDataPoint = {
  name: string;
  total: number;
  [key: string]: string | number;
};

type ApiResponse = {
  years: number[];
  monthlyData: MonthlyDataPoint[];
  categories: CategoryMeta[];
};

export function MonthlyTrend() {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = React.useState(
    currentYear.toString()
  );
  const [chartData, setChartData] = React.useState<MonthlyDataPoint[]>([]);
  const [categories, setCategories] = React.useState<CategoryMeta[]>([]);
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const chartConfig = React.useMemo(() => {
    const config: Record<string, { color: string; label: string }> = {};
    categories.forEach((cat) => {
      config[cat.id] = { color: cat.color, label: cat.name };
    });
    return config;
  }, [categories]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/analytics/monthly?year=${selectedYear}`
        );
        if (!res.ok) throw new Error("Fetch failed");

        const data: ApiResponse = await res.json();

        setChartData(data.monthlyData);
        setCategories(data.categories);
        setAvailableYears(data.years);

        if (
          data.years.length &&
          !data.years.includes(Number(selectedYear))
        ) {
          setSelectedYear(Math.max(...data.years).toString());
        }
      } catch (e) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pl-4">
        <p className="text-sm text-muted-foreground">
          Your subscription spending over the years
        </p>

        {availableYears.length > 0 && (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ChartContainer className="h-80 w-full" config={chartConfig}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            Loading…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-destructive">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            No data
          </div>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => `$${v}`} />
            <Tooltip
              content={(props) => (
                <CustomTooltip {...props} categories={categories} />
              )}
            />
            <Legend />
            {categories.map((cat) => (
              <Bar
                key={cat.id}
                dataKey={cat.id}
                stackId="a"
                fill={cat.color}
                name={cat.name}
              />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </div>
  );
}

function CustomTooltip(props: {
  active?: boolean;
  payload?: readonly any[];
  label?: string;
  categories: CategoryMeta[];
}) {
  const { active, payload, label, categories } = props;

  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-background p-2 shadow-sm">
      <div className="mb-1 font-medium">{label}</div>

      {categories.map((cat) => {
        const entry = payload.find((p) => p.dataKey === cat.id);
        if (!entry?.value) return null;

        return (
          <div key={cat.id} className="flex gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span>{cat.name}</span>
            <span className="ml-auto font-mono">
              ${Number(entry.value).toLocaleString()}
            </span>
          </div>
        );
      })}

      <div className="mt-1 border-t pt-1 text-sm font-bold">
        Total: $
        {payload[0]?.payload?.total
          ? payload[0].payload.total.toLocaleString()
          : 0}
      </div>
    </div>
  );
}

export default MonthlyTrend;