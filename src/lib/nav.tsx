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
 * Aurora group theming — each nav group carries its own accent color so the
 * sidebar reads as a colorful, scannable system map.
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

export const GROUP_COLORS: Record<string, GroupColors> = {
  overview: {
    label: 'text-emerald-300',
    gradient: 'from-emerald-500 via-teal-500 to-emerald-400',
    solid: 'text-emerald-400',
    glow: 'shadow-emerald-500/30',
    dot: 'bg-emerald-400',
    activeBg: 'bg-gradient-to-r from-emerald-500/25 to-teal-500/10',
    activeBorder: 'border-emerald-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(16,185,129,0.7)]',
  },
  stock: {
    label: 'text-teal-300',
    gradient: 'from-teal-500 via-cyan-500 to-teal-400',
    solid: 'text-teal-400',
    glow: 'shadow-teal-500/30',
    dot: 'bg-teal-400',
    activeBg: 'bg-gradient-to-r from-teal-500/25 to-cyan-500/10',
    activeBorder: 'border-teal-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(20,184,166,0.7)]',
  },
  sales: {
    label: 'text-sky-300',
    gradient: 'from-sky-500 via-blue-500 to-sky-400',
    solid: 'text-sky-400',
    glow: 'shadow-sky-500/30',
    dot: 'bg-sky-400',
    activeBg: 'bg-gradient-to-r from-sky-500/25 to-blue-500/10',
    activeBorder: 'border-sky-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(14,165,233,0.7)]',
  },
  returns: {
    label: 'text-amber-300',
    gradient: 'from-amber-500 via-orange-500 to-amber-400',
    solid: 'text-amber-400',
    glow: 'shadow-amber-500/30',
    dot: 'bg-amber-400',
    activeBg: 'bg-gradient-to-r from-amber-500/25 to-orange-500/10',
    activeBorder: 'border-amber-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(245,158,11,0.7)]',
  },
  people: {
    label: 'text-violet-300',
    gradient: 'from-violet-500 via-purple-500 to-violet-400',
    solid: 'text-violet-400',
    glow: 'shadow-violet-500/30',
    dot: 'bg-violet-400',
    activeBg: 'bg-gradient-to-r from-violet-500/25 to-purple-500/10',
    activeBorder: 'border-violet-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(139,92,246,0.7)]',
  },
  operations: {
    label: 'text-cyan-300',
    gradient: 'from-cyan-500 via-sky-500 to-cyan-400',
    solid: 'text-cyan-400',
    glow: 'shadow-cyan-500/30',
    dot: 'bg-cyan-400',
    activeBg: 'bg-gradient-to-r from-cyan-500/25 to-sky-500/10',
    activeBorder: 'border-cyan-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(6,182,212,0.7)]',
  },
  insights: {
    label: 'text-indigo-300',
    gradient: 'from-indigo-500 via-violet-500 to-indigo-400',
    solid: 'text-indigo-400',
    glow: 'shadow-indigo-500/30',
    dot: 'bg-indigo-400',
    activeBg: 'bg-gradient-to-r from-indigo-500/25 to-violet-500/10',
    activeBorder: 'border-indigo-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(99,102,241,0.7)]',
  },
  admin: {
    label: 'text-slate-300',
    gradient: 'from-slate-500 via-slate-400 to-slate-500',
    solid: 'text-slate-400',
    glow: 'shadow-slate-500/30',
    dot: 'bg-slate-400',
    activeBg: 'bg-gradient-to-r from-slate-500/25 to-slate-400/10',
    activeBorder: 'border-slate-400/40',
    activeGlow: 'shadow-[0_8px_24px_-10px_rgba(148,163,184,0.6)]',
  },
};

/** Shared default for any unknown group */
export const DEFAULT_GROUP_COLOR: GroupColors = GROUP_COLORS.overview;