import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SalesPoint {
  date: string;
  sales: number;
  revenue: number;
}

export interface SalesTrendChartProps {
  data: SalesPoint[];
  title?: string;
  className?: string;
  height?: number;
  showRevenue?: boolean;
}

export default function SalesTrendChart({
  data,
  title = 'Sales Trend',
  className,
  height = 300,
  showRevenue = true,
}: SalesTrendChartProps) {
  const hasData = data.length > 0;

  return (
    <div className={cn('chart-glass', className)}>
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-50 dark:bg-navy-800/50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-navy-600 dark:text-navy-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Monthly performance overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-[#17827A]" />
              <span className="text-slate-500 dark:text-slate-400">Sales</span>
            </div>
            {showRevenue && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-[#17827A]" />
                <span className="text-slate-500 dark:text-slate-400">Revenue</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">
        {hasData ? (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  {/* Premium animated gradient for sales area */}
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#17827A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#17827A" stopOpacity={0} />
                  </linearGradient>
                  {/* Gradient for revenue line */}
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#123F3D" stopOpacity={1} />
                    <stop offset="100%" stopColor="#17827A" stopOpacity={1} />
                  </linearGradient>
                  {/* Subtle grid pattern */}
                  <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="0.5" fill="#DCEAEC" />
                  </pattern>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#DCEAEC" 
                  vertical={false} 
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8FADB4' }}
                  tickLine={false}
                  axisLine={{ stroke: '#DCEAEC' }}
                  dy={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8FADB4' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(192, 24%, 90%)',
                    boxShadow: '0 8px 24px rgba(20, 41, 46, 0.08)',
                    fontSize: '12px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'sales' ? `${value} units` : `₹${value.toLocaleString()}`,
                    name === 'sales' ? 'Sales' : 'Revenue',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#17827A"
                  strokeWidth={2.5}
                  fill="url(#salesGradient)"
                  dot={false}
                  activeDot={{ 
                    r: 5, 
                    fill: '#17827A', 
                    stroke: '#fff', 
                    strokeWidth: 2,
                    style: { filter: 'drop-shadow(0 2px 4px rgba(23, 130, 122, 0.3))' }
                  }}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {showRevenue && (
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="url(#revenueGradient)"
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    strokeDasharray="5 3"
                    activeDot={{ 
                      r: 5, 
                      fill: '#123F3D', 
                      stroke: '#fff', 
                      strokeWidth: 2,
                      style: { filter: 'drop-shadow(0 2px 4px rgba(27, 106, 138, 0.3))' }
                    }}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-slate-400" style={{ height }}>
            <TrendingUp className="w-10 h-10 text-slate-200 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium">No sales data available</p>
            <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">Sales will appear here once recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
