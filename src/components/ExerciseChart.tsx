'use client';

import { useState } from 'react';
import { ExerciseHistory } from '@/types';
import { formatDateShort } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ExerciseChartProps {
  history: ExerciseHistory[];
}

type ChartType = 'weight' | 'volume' | 'reps';

export default function ExerciseChart({ history }: ExerciseChartProps) {
  const [chartType, setChartType] = useState<ChartType>('weight');

  const data = [...history].reverse().map((entry) => ({
    date: formatDateShort(entry.date),
    weight: entry.weight || 0,
    volume: entry.volume,
    reps: entry.sets.reduce((sum, s) => sum + (s.reps || 0), 0),
  }));

  const dataKey = chartType;
  const label = chartType === 'weight' ? 'Weight' : chartType === 'volume' ? 'Volume' : 'Total Reps';

  return (
    <div>
      <div className="flex gap-1.5 mb-5">
        {(['weight', 'volume', 'reps'] as ChartType[]).map((type) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              chartType === type
                ? 'bg-charcoal text-white shadow-sm'
                : 'bg-surface-100 text-charcoal-muted hover:bg-surface-200'
            }`}
          >
            {type === 'weight' ? 'Weight' : type === 'volume' ? 'Volume' : 'Reps'}
          </button>
        ))}
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b5998" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b5998" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#78716c' }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#78716c' }}
              axisLine={false}
              tickLine={false}
              dx={-5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1c1917',
                border: 'none',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#fff',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#a8a29e', fontSize: '10px', marginBottom: '2px' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#3b5998"
              strokeWidth={2.5}
              fill="url(#chartGradient)"
              dot={{ fill: '#3b5998', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#3b5998', strokeWidth: 2, stroke: '#fff' }}
              name={label}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
