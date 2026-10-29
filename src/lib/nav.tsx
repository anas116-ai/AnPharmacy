import type { ReactNode } from 'react';
import {
  LayoutDashboard, Boxes, PlusCircle, ShoppingCart,
  IndianRupee, BarChart3, Settings, ScanLine, Users,
  Database, Factory, Pill, UserRound, RotateCcw, Undo2, Warehouse,
  Truck, Wallet, Tag, BadgePercent, Receipt, Bot, FolderOpen, Calendar,
  Bell, History, FileSpreadsheet, BrainCircuit, Archive, Trash2,
} from 'lucide-react';

export const iconMap: Record<string, ReactNode> = {
  '📊': <LayoutDashboard className="w-[18px] h-[18px]" />,
  '📦': <Boxes className="w-[18px] h-[18px]" />,
  '➕': <PlusCircle className="w-[18px] h-[18px]" />,
  '🛒': <ShoppingCart className="w-[18px] h-[18px]" />,
  '💰': <IndianRupee className="w-[18px] h-[18px]" />,
  '📈': <BarChart3 className="w-[18px] h-[18px]" />,
  '⚙️': <Settings className="w-[18px] h-[18px]" />,
  '📷': <ScanLine className="w-[18px] h-[18px]" />,
  '👥': <Users className="w-[18px] h-[18px]" />,
  '🔒': <Database className="w-[18px] h-[18px]" />,
  '🏭': <Factory className="w-[18px] h-[18px]" />,
  '💊': <Pill className="w-[18px] h-[18px]" />,
  '👤': <UserRound className="w-[18px] h-[18px]" />,
  '🔄': <RotateCcw className="w-[18px] h-[18px]" />,
  '↩️': <Undo2 className="w-[18px] h-[18px]" />,
  '🏠': <Warehouse className="w-[18px] h-[18px]" />,
  '🚚': <Truck className="w-[18px] h-[18px]" />,
  '💸': <Wallet className="w-[18px] h-[18px]" />,
  '🏷️': <Tag className="w-[18px] h-[18px]" />,
  '🎯': <BadgePercent className="w-[18px] h-[18px]" />,
  '🧾': <Receipt className="w-[18px] h-[18px]" />,
  '🤖': <Bot className="w-[18px] h-[18px]" />,
  '🧠': <BrainCircuit className="w-[18px] h-[18px]" />,
  '📁': <FolderOpen className="w-[18px] h-[18px]" />,
  '📅': <Calendar className="w-[18px] h-[18px]" />,
  '🔔': <Bell className="w-[18px] h-[18px]" />,
  '📥': <Archive className="w-[18px] h-[18px]" />,
  '📋': <History className="w-[18px] h-[18px]" />,
  '🏗️': <FileSpreadsheet className="w-[18px] h-[18px]" />,
  '🗑️': <Trash2 className="w-[18px] h-[18px]" />,
};

export const GROUP_LABELS: Record<string, string> = {
  overview: 'Overview',
  stock: 'Inventory',
  sales: 'Sales & Billing',
  people: 'Partners',
  admin: 'Administration',
  insights: 'Intelligence',
  returns: 'Returns',
  operations: 'Operations',
};

export const GROUP_ORDER = ['overview', 'stock', 'sales', 'returns', 'people', 'operations', 'insights', 'admin'];

/**
 * Header group chips — one teal accent for every module so the app bar never
 * competes with page content; Administration stays neutral/muted.
 */
export interface GroupColors {
  /** text color for the group label */
  label: string;
  /** gradient stops for active pill / icon chip */
  gradient: string;
  /** solid color for the icon chip */
  solid: string;
  /** soft glow ring for active state */
  glow: string;
  /** dot used in collapsed mode */
  dot: string;
  /** colored background + border for the active nav pill */
  activeBg: string;
  activeBorder: string;
  /** shadow tint for the active pill */
  activeGlow: string;
}

/**
 * One accent across the product. The chip is a quiet teal tint on light
 * surfaces and a mint tint in dark mode; Admin is intentionally muted.
 */
const BRAND_GROUP: GroupColors = {
  label: 'text-[#123F3D]',
  gradient: 'from-[#14292E] to-[#17827A]',
  solid: 'text-[#123F3D]',
  glow: 'shadow-[#17827A]/20',
  dot: 'bg-[#17827A]',
  activeBg: 'bg-[#17827A]/10 dark:bg-[#17827A]/20',
  activeBorder: 'border-[#17827A]/25 dark:border-[#2E9C90]/25',
  activeGlow: 'shadow-[0_4px_16px_-4px_rgba(23,130,122,0.25)]',
};

const MUTED_GROUP: GroupColors = {
  label: 'text-slate-500',
  gradient: 'from-slate-700 to-slate-600',
  solid: 'text-slate-500',
  glow: 'shadow-slate-500/20',
  dot: 'bg-slate-400',
  activeBg: 'bg-slate-500/10',
  activeBorder: 'border-slate-500/25',
  activeGlow: 'shadow-[0_4px_16px_-4px_rgba(108,138,146,0.25)]',
};

export const GROUP_COLORS: Record<string, GroupColors> = {
  overview: BRAND_GROUP,
  stock: BRAND_GROUP,
  sales: BRAND_GROUP,
  returns: BRAND_GROUP,
  people: BRAND_GROUP,
  operations: BRAND_GROUP,
  insights: BRAND_GROUP,
  admin: MUTED_GROUP,
};

/** Shared default for any unknown group */
export const DEFAULT_GROUP_COLOR: GroupColors = GROUP_COLORS.overview;