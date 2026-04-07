import ReactECharts from 'echarts-for-react'

interface RiskGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function RiskGauge({ score, size = 'md' }: RiskGaugeProps) {
  const height = size === 'sm' ? 160 : size === 'lg' ? 280 : 220
  const radius = size === 'sm' ? 70 : size === 'lg' ? 85 : 75

  const color = score >= 70 ? '#E53E3E' : score >= 40 ? '#D69E2E' : '#38A169'

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: `${radius}%`,
        center: ['50%', '70%'],
        splitNumber: 5,
        itemStyle: { color },
        progress: {
          show: true,
          width: 12,
        },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 12 } },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { width: 2 } },
        axisLabel: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-10%'],
          fontSize: size === 'sm' ? 24 : 32,
          fontWeight: 'bold',
          formatter: (value: number) => `{score|${value.toFixed(0)}}\n{unit|/ 100}`,
          rich: {
            score: { fontSize: size === 'sm' ? 28 : 36, fontWeight: 'bold', color },
            unit: { fontSize: 14, color: '#6B7280', padding: [4, 0, 0, 0] },
          },
        },
        data: [{ value: score }],
      },
    ],
  }

  return <ReactECharts option={option} style={{ height, width: '100%' }} />
}
