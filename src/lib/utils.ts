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
    case 'expired': return 'bg-gray-500 text-white';
    case 'critical': return 'bg-red-500 text-white';
    case 'warning': return 'bg-orange-500 text-white';
    case 'safe': return 'bg-green-500 text-white';
    case 'active': return 'bg-green-500 text-white';
    case 'inactive': return 'bg-gray-400 text-white';
    default: return 'bg-gray-400 text-white';
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
    case 'admin': return 'bg-purple-100 text-purple-800';
    case 'sales': return 'bg-blue-100 text-blue-800';
    case 'purchase_mgr': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-800';
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
