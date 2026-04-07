import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TrendLineProps {
  data: Array<{ date: string; critical: number; high: number; medium: number; low: number }>
}

const COLORS = {
  critical: 'hsl(0 84% 60%)',
  high: 'hsl(25 95% 53%)',
  medium: 'hsl(45 93% 47%)',
  low: 'hsl(187 71% 49%)',
}

export function TrendLine({ data }: TrendLineProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No trend data available
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.critical} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.critical} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.high} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.high} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Area
          type="monotone"
          dataKey="critical"
          name="Critical"
          stroke={COLORS.critical}
          fillOpacity={1}
          fill="url(#gradCritical)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="high"
          name="High"
          stroke={COLORS.high}
          fillOpacity={1}
          fill="url(#gradHigh)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="medium"
          name="Medium"
          stroke={COLORS.medium}
          fill="none"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="low"
          name="Low"
          stroke={COLORS.low}
          fill="none"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
