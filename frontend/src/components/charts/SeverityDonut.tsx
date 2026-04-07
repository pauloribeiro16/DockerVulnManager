import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface SeverityDonutProps {
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

const COLORS = {
  CRITICAL: 'hsl(0 84% 60%)',
  HIGH: 'hsl(25 95% 53%)',
  MEDIUM: 'hsl(45 93% 47%)',
  LOW: 'hsl(187 71% 49%)',
  INFO: 'hsl(215 14% 34%)',
}

export function SeverityDonut({ critical, high, medium, low, info }: SeverityDonutProps) {
  const data = [
    { name: 'Critical', value: critical, color: COLORS.CRITICAL },
    { name: 'High', value: high, color: COLORS.HIGH },
    { name: 'Medium', value: medium, color: COLORS.MEDIUM },
    { name: 'Low', value: low, color: COLORS.LOW },
    { name: 'Info', value: info, color: COLORS.INFO },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No vulnerabilities found
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
