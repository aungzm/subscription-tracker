"use client"
import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"

// Type definitions
type CategoryMeta = {
  id: string;
  name: string;
  color: string;
};

type YearlyDataPoint = {
  year: number;
  total: number;
  [key: string]: string | number;
};

type ApiResponse = {
  yearlyData: YearlyDataPoint[];
  categories: CategoryMeta[];
};

export function YearlyTrend() {
  const [chartData, setChartData] = React.useState<YearlyDataPoint[]>([]);
  const [categories, setCategories] = React.useState<CategoryMeta[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create a chart config from the categories - we'll add the total separately
  const chartConfig = React.useMemo(() => {
    const config: Record<string, { color: string, label: string }> = {};
    
    // Add all categories from API
    categories.forEach(cat => {
      config[cat.id] = { color: cat.color, label: cat.name };
    });
    
    // Add the total line with a fixed color
    config["total"] = { color: "#ff0000", label: "Total" };
    
    return config;
  }, [categories]);

  // Fetch data from the API
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/analytics/yearly`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const data: ApiResponse = await response.json();
        
        // Format the data for the chart - convert year to string for display
        const formattedData = data.yearlyData.map(item => ({
          ...item,
          name: item.year.toString(), // Add name field for XAxis
        }));
        
        setChartData(formattedData);
        setCategories(data.categories);
      } catch (err) {
        console.error("Error fetching yearly data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Combine API categories with the total for the chart legend
  const allCategories = React.useMemo(() => {
    return [
      ...categories,
      { id: "total", name: "Total", color: "#ff0000" }
    ];
  }, [categories]);

  return (
    <div className="space-y-4">      
      <ChartContainer className="h-80 w-full max-w-full" config={chartConfig}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
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
            <p className="text-sm text-muted-foreground">No yearly data available.</p>
          </div>
        ) : (
          <LineChart 
            data={chartData} 
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
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
            <Tooltip content={(props) => <CustomTooltip {...props} categories={allCategories} />} />
            <Legend />
            
            {/* Render lines for each category */}
            {categories.map((category) => (
              <Line
                key={category.id}
                type="monotone"
                dataKey={category.id}
                name={category.name}
                stroke={category.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{
                  r: 6,
                  style: { stroke: category.color, strokeWidth: 2, fill: "#fff" },
                }}
              />
            ))}
            
            {/* Add the total line with different styling */}
            <Line
              key="total"
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="#0000ff"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{
                r: 7,
                style: { stroke: "#ff0000", strokeWidth: 2, fill: "#fff" },
              }}
              strokeDasharray="5 5" // Make total line dashed
            />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  )
}

type CustomTooltipProps = {
  active?: boolean
  label?: string | number
  payload?: readonly any[];
  categories: CategoryMeta[]
}



function CustomTooltip({
  active,
  payload,
  label,
  categories,
}: CustomTooltipProps) {
  if (active && payload && payload.length) {
    // Find the total entry in the payload
    const totalPayload = payload.find(entry => entry.dataKey === "total");
    
    // Get non-zero category entries (excluding total)
    const categoryPayloads = payload.filter(entry => 
      entry.dataKey !== "total" && entry.value !== 0
    );
    
    // Get the corresponding category metadata for existing payloads
    const relevantCategories = categories.filter(cat => 
      cat.id !== "total" && 
      categoryPayloads.some(p => p.dataKey === cat.id)
    );
    
    return (
      <div className="rounded-md border bg-background p-2 shadow-sm">
        <div className="mb-1 font-medium">{label}</div>
        
        {/* Display categories first */}
        {relevantCategories.map((cat) => {
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
                ${typeof catPayload.value === 'number' 
                  ? catPayload.value.toLocaleString() 
                  : 0}
              </span>
            </div>
          );
        })}
        
        {/* Display total as a separate section */}
        {totalPayload && (
          <div className="mt-1 border-t pt-1 text-sm font-bold flex items-center">
            <span
              className="inline-block h-2 w-2 rounded-full mr-2"
              style={{ backgroundColor: "#ff0000" }}
            />
            <span>Total:</span>
            <span className="ml-auto font-mono">
              ${typeof totalPayload.value === 'number' 
                ? totalPayload.value.toLocaleString() 
                : 0}
            </span>
          </div>
        )}
      </div>
    )
  }
  return null
}

export default YearlyTrend
