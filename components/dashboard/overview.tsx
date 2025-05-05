"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartTooltip } from "@/components/ui/chart"

// Mock data - would be replaced with actual data from your API
const data = [
  {
    name: "Jan",
    total: 220,
  },
  {
    name: "Feb",
    total: 240,
  },
  {
    name: "Mar",
    total: 235,
  },
  {
    name: "Apr",
    total: 245,
  },
  {
    name: "May",
    total: 249,
  },
  {
    name: "Jun",
    total: 252,
  },
  {
    name: "Jul",
    total: 255,
  },
  {
    name: "Aug",
    total: 260,
  },
  {
    name: "Sep",
    total: 265,
  },
  {
    name: "Oct",
    total: 270,
  },
  {
    name: "Nov",
    total: 275,
  },
  {
    name: "Dec",
    total: 280,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
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
        <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  )
}
