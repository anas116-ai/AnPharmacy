import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../../lib/utils';

export interface StockBar {
  name: string;
  quantity: number;
  status?: 'expired' | 'critical' | 'warning' | 'safe';
}

export interface StockBarChartProps {
  data: StockBar[];
  title?: string;
  className?: string;
  height?: number;
  maxBars?: number;
}

const STATUS_COLOR: Record<string, string> = {
  expired: '#8FADB4',
  critical: '#ef4444',
  warning: '#F59E0B',
  safe: '#17827A',
};

export default function StockBarChart({
  data,
  title = 'Stock Levels',
  className,
  height = 320,
  maxBars = 12,
}: StockBarChartProps) {
  const hasData = data.length > 0;
  const displayData = data.slice(0, maxBars);

  return (
    <div className={cn('chart-glass h-full', className)}>
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-navy-50 dark:bg-navy-800/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-navy-600 dark:text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {data.length > maxBars && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                (top {maxBars} of {data.length})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">
        {hasData ? (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayData}
                margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF5F6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#8FADB4' }}
                  tickLine={false}
                  axisLine={{ stroke: '#DCEAEC' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8FADB4' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(23,130,122,0.06)' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(192, 24%, 90%)',
                    boxShadow: '0 8px 24px rgba(20, 41, 46, 0.08)',
                    fontSize: '12px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                  }}
                  formatter={(value: number) => [`${value} units`, 'Quantity']}
                />
                <Bar dataKey="quantity" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {displayData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.status ? STATUS_COLOR[entry.status] : '#17827A'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center text-slate-400"
            style={{ height }}
          >
            <svg className="w-10 h-10 text-slate-200 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm font-medium">No stock data available</p>
            <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">Add medicines to see stock levels</p>
          </div>
        )}
      </div>
    </div>
  );
}
