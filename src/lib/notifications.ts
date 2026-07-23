import { Medicine } from './types';
import { getDaysUntilExpiry } from './notificationUtils';

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export interface ExpiryNotificationData {
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning';
}

export function generateExpiryNotifications(medicines: Medicine[], userId: number): Array<{
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  action_url: string;
}> {
  const notifications = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const med of medicines) {
    if (!med.expiry_date) continue;
    const days = getDaysUntilExpiry(med.expiry_date);
    
    if (days < 0) {
      notifications.push({
        user_id: userId,
        title: 'Medicine Expired',
        message: `${med.name} (Batch: ${med.batch_number}) expired ${Math.abs(days)} days ago`,
        type: 'critical' as const,
        action_url: '/stock',
      });
    } else if (days <= 30) {
      notifications.push({
        user_id: userId,
        title: 'Critical Expiry Alert',
        message: `${med.name} (Batch: ${med.batch_number}) expires in ${days} days`,
        type: 'critical' as const,
        action_url: '/stock',
      });
    } else if (days <= 60) {
      notifications.push({
        user_id: userId,
        title: 'Expiry Warning',
        message: `${med.name} (Batch: ${med.batch_number}) expires in ${days} days`,
        type: 'warning' as const,
        action_url: '/stock',
      });
    } else if (days <= 90) {
      notifications.push({
        user_id: userId,
        title: 'Upcoming Expiry',
        message: `${med.name} (Batch: ${med.batch_number}) expires in ${days} days`,
        type: 'info' as const,
        action_url: '/stock',
      });
    }
  }
  return notifications;
}

export async function checkAndCreateExpiryAlerts(
  medicines: Medicine[],
  userId: number,
  addNotification: (n: { user_id: number; title: string; message: string; type: 'info' | 'warning' | 'critical' | 'success'; action_url: string }) => Promise<void>
): Promise<number> {
  const notifications = generateExpiryNotifications(medicines, userId);
  let created = 0;
  
  for (const notif of notifications) {
    try {
      await addNotification(notif);
      created++;
    } catch (err) {
      console.error('Failed to create expiry notification:', err);
    }
  }
  return created;
}