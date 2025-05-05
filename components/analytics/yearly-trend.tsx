"use client"

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartTooltip } from "@/components/ui/chart"

// Mock data - would be replaced with actual data from your API
const data = [
  {
    name: "2021",
    total: 2200,
  },
  {
    name: "2022",
    total: 2400,
  },
  {
    name: "2023",
    total: 2600,
  },
  {
    name: "2024",
    total: 2800,
  },
  {
    name: "2025",
    total: 2993,
  },
]

export function YearlyTrend() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <ChartTooltip
                  title={payload[0].payload.name}
                  content={[
                    {
                      label: "Total",
                      value: `$${payload[0].value}`,
                    },
                  ]}
                />
              )
            }
            return null
          }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
