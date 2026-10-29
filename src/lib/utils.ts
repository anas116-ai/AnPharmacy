import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '₹0.00';
  return `₹${amount.toFixed(2)}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'expired': return 'bg-slate-500 text-white';
    case 'critical': return 'bg-red-500 text-white';
    case 'warning': return 'bg-amber-500 text-white';
    case 'safe': return 'bg-emerald-500 text-white';
    case 'active': return 'bg-emerald-500 text-white';
    case 'inactive': return 'bg-slate-400 text-white';
    default: return 'bg-slate-400 text-white';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'expired': return 'Expired';
    case 'critical': return 'Critical';
    case 'warning': return 'Warning';
    case 'safe': return 'Safe';
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'not_activated': return 'Not Activated';
    case 'needs_heartbeat': return 'Needs Verification';
    default: return status;
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'admin': return 'bg-[#14292E]/10 text-[#14292E] dark:bg-[#2E9C90]/15 dark:text-[#2E9C90]';
    case 'sales': return 'bg-[#EDF5F6] text-[#123F3D] dark:bg-white/10 dark:text-slate-200';
    case 'purchase_mgr': return 'bg-[#EDF5F6] text-[#123F3D] dark:bg-white/10 dark:text-slate-200';
    default: return 'bg-slate-100 text-slate-800';
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'sales': return 'Sales Rep';
    case 'purchase_mgr': return 'Purchase Manager';
    default: return role;
  }
}
