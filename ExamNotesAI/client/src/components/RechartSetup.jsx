import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, PieChart, Pie, Cell } from "recharts";

function RechartSetUp({charts}) {
  if (!charts || charts.length === 0) return null;
  const COLORS = ["#6366f1","#22c55e", "#f59e0b", "#ef4444", "#06b6d4"]

  return (
    <div className='space-y-8 max-w-full'>
      {charts.map((chart, index) => (
        <div key={index} className='border border-gray-200 rounded-xl p-4 bg-white max-w-full break-inside-avoid print:break-inside-avoid'>

          <h4 className='font-semibold text-gray-800 mb-3'>
            {chart.title}
          </h4>

          <div className="max-w-full print:hidden" style={{ width: '100%', height: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ChartGraphic chart={chart} colors={COLORS} />
            </ResponsiveContainer>
          </div>

          <div className="print-chart-container hidden print:block">
            <ChartGraphic chart={chart} colors={COLORS} width={640} height={288} />
          </div>

        </div>
      ))}
    </div>
  )
}

function ChartGraphic({chart, colors, width, height}) {
  const dimensions = width && height ? { width, height } : {}

  if (chart.type === "bar") {
    return (
      <BarChart data={chart.data} {...dimensions}>
        <XAxis dataKey="name"/>
        <YAxis/>
        <Tooltip/>
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {chart.data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    )
  }

  if (chart.type === "line") {
    return (
      <LineChart data={chart.data} {...dimensions}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone"
          dataKey="value"
          stroke="#6366f1"
          strokeWidth={3} />
      </LineChart>
    )
  }

  return (
    <PieChart {...dimensions}>
      <Tooltip />
      <Pie data={chart.data}
        dataKey="value"
        nameKey="name"
        outerRadius={100}
        label>
        {chart.data.map((_, i) => (
          <Cell key={i} fill={colors[i % colors.length]} />
        ))}
      </Pie>
    </PieChart>
  )
}

export default RechartSetUp