import type { ReactNode } from 'react';
import {
  LayoutDashboard, Package, PlusCircle, ShoppingCart,
  DollarSign, BarChart3, Settings, ScanLine, Users,
  HardDrive, Factory, FlaskRound, UserPlus, RotateCcw, Undo2, Building2,
  Truck, Wallet, Tag, Target, Receipt, Bot, FolderOpen, Calendar,
  Bell, ClipboardList, Hammer, BrainCircuit, Download, Trash2,
} from 'lucide-react';

export const iconMap: Record<string, ReactNode> = {
  '📊': <LayoutDashboard className="w-[18px] h-[18px]" />,
  '📦': <Package className="w-[18px] h-[18px]" />,
  '➕': <PlusCircle className="w-[18px] h-[18px]" />,
  '🛒': <ShoppingCart className="w-[18px] h-[18px]" />,
  '💰': <DollarSign className="w-[18px] h-[18px]" />,
  '📈': <BarChart3 className="w-[18px] h-[18px]" />,
  '⚙️': <Settings className="w-[18px] h-[18px]" />,
  '📷': <ScanLine className="w-[18px] h-[18px]" />,
  '👥': <Users className="w-[18px] h-[18px]" />,
  '🔒': <HardDrive className="w-[18px] h-[18px]" />,
  '🏭': <Factory className="w-[18px] h-[18px]" />,
  '💊': <FlaskRound className="w-[18px] h-[18px]" />,
  '👤': <UserPlus className="w-[18px] h-[18px]" />,
  '🔄': <RotateCcw className="w-[18px] h-[18px]" />,
  '↩️': <Undo2 className="w-[18px] h-[18px]" />,
  '🏠': <Building2 className="w-[18px] h-[18px]" />,
  '🚚': <Truck className="w-[18px] h-[18px]" />,
  '💸': <Wallet className="w-[18px] h-[18px]" />,
  '🏷️': <Tag className="w-[18px] h-[18px]" />,
  '🎯': <Target className="w-[18px] h-[18px]" />,
  '🧾': <Receipt className="w-[18px] h-[18px]" />,
  '🤖': <Bot className="w-[18px] h-[18px]" />,
  '🧠': <BrainCircuit className="w-[18px] h-[18px]" />,
  '📁': <FolderOpen className="w-[18px] h-[18px]" />,
  '📅': <Calendar className="w-[18px] h-[18px]" />,
  '🔔': <Bell className="w-[18px] h-[18px]" />,
  '📥': <Download className="w-[18px] h-[18px]" />,
  '📋': <ClipboardList className="w-[18px] h-[18px]" />,
  '🏗️': <Hammer className="w-[18px] h-[18px]" />,
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