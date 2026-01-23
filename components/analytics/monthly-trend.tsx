"use client"
import * as React from "react"
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Legend, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { TooltipProps } from "recharts/types/component/Tooltip"
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Type definitions
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
  // Use the current year as default if available
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState(currentYear.toString());
  const [chartData, setChartData] = React.useState<MonthlyDataPoint[]>([]);
  const [categories, setCategories] = React.useState<CategoryMeta[]>([]);
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create a chart config from the categories
  const chartConfig = React.useMemo(() => {
    const config: Record<string, { color: string, label: string }> = {};
    categories.forEach(cat => {
      config[cat.id] = { color: cat.color, label: cat.name };
    });
    return config;
  }, [categories]);

  // Fetch data from the API when the selected year changes
  React.useEffect(() => {
    const fetchDataForYear = async (year: string) => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/analytics/monthly?year=${year}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const data: ApiResponse = await response.json();
        
        setChartData(data.monthlyData);
        setCategories(data.categories);
        setAvailableYears(data.years);
        
        // If this is the first load and our selected year isn't in the available years,
        // select the most recent year
        if (data.years.length > 0 && !data.years.includes(parseInt(year))) {
          setSelectedYear(Math.max(...data.years).toString());
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDataForYear(selectedYear);
  }, [selectedYear]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pl-4">
        <p className="text-sm text-muted-foreground">
        Your subscription spending over the years
        </p>
        {availableYears.length > 0 && (
          <Select
        value={selectedYear}
        onValueChange={setSelectedYear}
          >
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
      
      <ChartContainer className="h-80 w-full max-w-full" config={chartConfig}>
        {loading ? (
          <div className="flex h-full items-center justify-center w-full">
            <div className="text-center">
              <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available for this year.</p>
          </div>
        ) : (
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} className="h-full">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={(props) => <CustomTooltip {...props} categories={categories} />} />
            <Legend />
            {categories.map((category) => (
              <Bar
                key={category.id}
                dataKey={category.id}
                stackId="a"
                fill={category.color}
                name={category.name}
                // Add hover label
                label={{
                  position: 'top',
                  formatter: (value: any) => `$${value}`,
                  fontSize: 10,
                  fill: category.color,
                  content: (props) => {
                    const { x, y, width, value } = props;
                    return value !== undefined && Number(value) > 0 ? (
                      <text
                        x={(typeof x === 'number' && typeof width === 'number') ? x + width / 2 : 0}
                        y={(typeof y === 'number') ? y - 6 : 0}
                        fill={category.color}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight="bold"
                      >
                        ${value}
                      </text>
                    ) : null;
                  }
                }}
              />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </div>
  )
}

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  categories: CategoryMeta[];
}

function CustomTooltip({ 
  active, 
  payload, 
  label, 
  categories 
}: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border bg-background p-2 shadow-sm">
        <div className="mb-1 font-medium">{label}</div>
        {categories.map((cat) => {
          const catPayload = payload.find(p => p.dataKey === cat.id);
          
          if (!catPayload || !catPayload.value) return null;
          
          return (
            <div
              key={cat.id}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span>{cat.name}:</span>
              <span className="ml-auto font-mono">
                ${catPayload.value.toLocaleString()}
              </span>
            </div>
          );
        })}
        <div className="mt-1 border-t pt-1 text-sm font-bold">
          {/* Use optional chaining for total to satisfy the compiler */}
          Total: ${payload[0]?.payload?.total?.toLocaleString() || 0}
        </div>
      </div>
    )
  }
  return null
}

export default MonthlyTrend
