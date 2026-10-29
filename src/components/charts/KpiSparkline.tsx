import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '../../lib/utils';

export interface SparklinePoint {
  value: number;
}

export interface KpiSparklineProps {
  data: SparklinePoint[];
  color?: string;
  height?: number;
  className?: string;
}

const DEFAULT_COLOR = '#17827A';

export default function KpiSparkline({
  data,
  color = DEFAULT_COLOR,
  height = 40,
  className,
}: KpiSparklineProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const id = React.useId().replace(/:/g, '');

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
