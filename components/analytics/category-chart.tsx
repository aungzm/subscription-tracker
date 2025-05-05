"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartTooltip } from "@/components/ui/chart"

// Mock data - would be replaced with actual data from your API
const data = [
  { name: "Entertainment", value: 120, color: "#f43f5e" },
  { name: "Productivity", value: 80, color: "#3b82f6" },
  { name: "Shopping", value: 40, color: "#f97316" },
  { name: "Utilities", value: 30, color: "#eab308" },
  { name: "Education", value: 20, color: "#a855f7" },
]

export function CategoryChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <ChartTooltip
                  title={payload[0].name}
                  content={[
                    {
                      label: "Amount",
                      value: `$${payload[0].value}`,
                    },
                  ]}
                />
              )
            }
            return null
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
