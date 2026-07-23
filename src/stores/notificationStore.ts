import { create } from 'zustand';
import { Notification } from '../lib/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (userId: number) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: (userId: number) => Promise<void>;
  addNotification: (notification: any) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (userId: number) => {
    set({ isLoading: true, error: null });
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listNotifications({ user_id: userId });
        if (result.success && result.notifications) {
          const notifications = result.notifications;
          set({
            notifications,
            unreadCount: notifications.filter(n => n.is_read === 0).length,
            isLoading: false,
          });
        } else {
          set({ error: result.error || 'Failed to fetch notifications', isLoading: false });
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch notifications', isLoading: false });
    }
  },

  markAsRead: async (id: number) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.markNotificationRead({ id });
        if (result.success) {
          set(state => {
            const updated = state.notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n);
            return { notifications: updated, unreadCount: updated.filter(n => n.is_read === 0).length };
          });
        }
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async (userId: number) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.markAllNotificationsRead({ user_id: userId });
        if (result.success) {
          set(state => ({
            notifications: state.notifications.map(n => ({ ...n, is_read: 1 })),
            unreadCount: 0,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  addNotification: async (notification: any) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.createNotification(notification as any);
        if (result.success && result.notification) {
          set(state => ({
            notifications: [result.notification!, ...state.notifications],
            unreadCount: state.unreadCount + (result.notification!.is_read === 0 ? 1 : 0),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to add notification:', err);
    }
  },
}));