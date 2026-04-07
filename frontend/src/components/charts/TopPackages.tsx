import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TopPackagesProps {
  data: Array<{ package: string; count: number }>
}

export function TopPackages({ data }: TopPackagesProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No package data available
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="package"
          tick={{ fontSize: 12 }}
          stroke="#6B7280"
          width={100}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
          {data.map((entry, index) => {
            const ratio = entry.count / maxCount
            const color =
              ratio > 0.8
                ? 'hsl(0 84% 60%)'
                : ratio > 0.5
                  ? 'hsl(25 95% 53%)'
                  : 'hsl(187 71% 49%)'
            return <Cell key={`cell-${index}`} fill={color} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
