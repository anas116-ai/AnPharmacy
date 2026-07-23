import { Medicine } from './types';

export function getDaysUntilExpiry(expiryDate: string | null): number {
  if (!expiryDate) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

export function getExpiryStatus(daysRemaining: number): 'expired' | 'critical' | 'warning' | 'safe' {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'critical';
  if (daysRemaining <= 90) return 'warning';
  return 'safe';
}

export interface ExpiryNotificationData {
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  action_url: string | null;
}

export function generateExpiryNotifications(
  medicines: Medicine[],
  userId: number
): ExpiryNotificationData[] {
  const notifications: ExpiryNotificationData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const med of medicines) {
    if (!med.expiry_date) continue;

    const expiryDate = new Date(med.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      notifications.push({
        user_id: userId,
        title: 'Medicine Expired',
        message: `${med.name} (Batch: ${med.batch_number}) expired ${Math.abs(daysRemaining)} days ago`,
        type: 'critical',
        action_url: `/stock?search=${encodeURIComponent(med.name)}`,
      });
    } else if (daysRemaining <= 30) {
      notifications.push({
        user_id: userId,
        title: 'Medicine Expiring Soon (Critical)',
        message: `${med.name} (Batch: ${med.batch_number}) expires in ${daysRemaining} days`,
        type: 'critical',
        action_url: `/stock?search=${encodeURIComponent(med.name)}`,
      });
    } else if (daysRemaining <= 60) {
      notifications.push({
        user_id: userId,
        title: 'Medicine Expiring Soon (Warning)',
        message: `${med.name} (Batch: ${med.batch_number}) expires in ${daysRemaining} days`,
        type: 'warning',
        action_url: `/stock?search=${encodeURIComponent(med.name)}`,
      });
    } else if (daysRemaining <= 90) {
      notifications.push({
        user_id: userId,
        title: 'Medicine Expiring Within 90 Days',
        message: `${med.name} (Batch: ${med.batch_number}) expires in ${daysRemaining} days`,
        type: 'info',
        action_url: `/stock?search=${encodeURIComponent(med.name)}`,
      });
    }
  }

  return notifications;
}

export async function checkAndCreateExpiryAlerts(
  medicines: Medicine[],
  userId: number,
  addNotification: (data: ExpiryNotificationData) => Promise<void>
): Promise<void> {
  const notifications = generateExpiryNotifications(medicines, userId);

  for (const notif of notifications) {
    try {
      await addNotification(notif);
    } catch (error) {
      console.error('Failed to create expiry notification:', error);
    }
  }
}