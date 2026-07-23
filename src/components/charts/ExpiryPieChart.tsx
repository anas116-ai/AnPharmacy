import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from '../../lib/utils';

export interface ExpiryDatum {
  name: string;
  value: number;
  color: string;
}

export interface ExpiryPieChartProps {
  data: ExpiryDatum[];
  title?: string;
  className?: string;
  height?: number;
}

const DEFAULT_COLORS = {
  expired: '#94a3b8',
  critical: '#ef4444',
  warning: '#f97316',
  safe: '#10b981',
};

function buildDefaultData(
  distribution: { expired: number; critical: number; warning: number; safe: number }
): ExpiryDatum[] {
  return [
    { name: 'Expired', value: distribution.expired, color: DEFAULT_COLORS.expired },
    { name: 'Critical', value: distribution.critical, color: DEFAULT_COLORS.critical },
    { name: 'Warning', value: distribution.warning, color: DEFAULT_COLORS.warning },
    { name: 'Safe', value: distribution.safe, color: DEFAULT_COLORS.safe },
  ];
}

export default function ExpiryPieChart({
  data,
  title = 'Expiry Distribution',
  className,
  height = 280,
}: ExpiryPieChartProps) {
  const hasData = data.some(d => d.value > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={cn('chart-glass h-full', className)}>
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-navy-50 dark:bg-navy-800/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-navy-600 dark:text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Medicines by expiry status</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        {hasData ? (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={3}
                  stroke="none"
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} (${total ? Math.round((value / total) * 100) : 0}%)`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(210, 20%, 88%)',
                    boxShadow: '0 8px 24px rgba(10, 61, 92, 0.08)',
                    fontSize: '12px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-slate-400" style={{ height }}>
            <svg className="w-10 h-10 text-slate-200 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium">No expiry data available</p>
            <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">Add medicines to see distribution</p>
          </div>
        )}
      </div>
    </div>
  );
}

export { buildDefaultData, DEFAULT_COLORS };
