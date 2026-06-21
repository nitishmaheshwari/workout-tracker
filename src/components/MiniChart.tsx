'use client';

import { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

interface MiniChartProps {
  data: { value: number; label: string }[];
}

export default function MiniChart({ data }: MiniChartProps) {
  const gradientId = useId().replace(/:/g, '');

  if (data.length < 2) return null;

  return (
    <div className="h-14">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b5998" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#3b5998" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1917',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#fff',
              padding: '6px 10px',
            }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: '#a8a29e', fontSize: '9px' }}
            labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.label || ''}
            formatter={(value: any) => [`${value}`, '']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b5998"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ fill: '#3b5998', r: 2, strokeWidth: 0 }}
            activeDot={{ r: 3.5, fill: '#3b5998', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
