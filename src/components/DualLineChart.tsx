'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DualLineChartProps {
  data: { date: string; weight: number; reps: number }[];
}

export default function DualLineChart({ data }: DualLineChartProps) {
  if (data.length === 0) return null;

  if (data.length === 1) {
    return (
      <div className="h-24 flex items-center justify-center">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            <div>
              <p className="text-[18px] font-bold tabular-nums">{data[0].weight}</p>
              <p className="text-[9px] text-charcoal-muted font-medium">Weight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <div>
              <p className="text-[18px] font-bold tabular-nums">{data[0].reps}</p>
              <p className="text-[9px] text-charcoal-muted font-medium">Total Reps</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            dy={5}
          />
          <YAxis
            yAxisId="weight"
            tick={{ fontSize: 9, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            dx={-3}
          />
          <YAxis
            yAxisId="reps"
            orientation="right"
            tick={{ fontSize: 9, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            dx={3}
            hide
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1917',
              border: 'none',
              borderRadius: '10px',
              fontSize: '11px',
              color: '#fff',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
            itemStyle={{ color: '#fff', fontSize: '11px' }}
            labelStyle={{ color: '#a8a29e', fontSize: '9px', marginBottom: '4px' }}
          />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            stroke="#3b5998"
            strokeWidth={2}
            dot={{ fill: '#3b5998', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#3b5998', strokeWidth: 2, stroke: '#fff' }}
            name="Weight"
          />
          <Line
            yAxisId="reps"
            type="monotone"
            dataKey="reps"
            stroke="#4a7c59"
            strokeWidth={2}
            dot={{ fill: '#4a7c59', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#4a7c59', strokeWidth: 2, stroke: '#fff' }}
            name="Total Reps"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
