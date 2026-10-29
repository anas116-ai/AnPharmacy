import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { formatTimeAgo } from '../lib/notificationUtils';
import { cn } from '../lib/utils';

const typeAccent: Record<string, string> = {
  info: 'bg-accent/100',
  warning: 'bg-warning-light',
  critical: 'bg-destructive/100',
  success: 'bg-success-light',
};

export default function NotificationBell() {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const userId = user?.id;

  useEffect(() => {
    if (userId != null) {
      fetchNotifications(userId);
    }
  }, [userId, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => setOpen((prev) => !prev);

  const handleNotificationClick = useCallback(
    async (id: number, actionUrl: string | null) => {
      await markAsRead(id);
      if (actionUrl) {
        window.location.hash = actionUrl.startsWith('#') ? actionUrl : `#${actionUrl}`;
      }
      setOpen(false);
    },
    [markAsRead]
  );

  const handleMarkAll = useCallback(async () => {
    if (userId != null) {
      await markAllAsRead(userId);
    }
  }, [userId, markAllAsRead]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          'relative w-10 h-10 flex items-center justify-center rounded-2xl',
          'bg-background/70 dark:bg-muted/40/70 backdrop-blur-xl border border-border dark:border-border',
          'text-muted-foreground dark:text-muted-foreground hover:text-accent dark:hover:text-accent',
          'hover:border-accent/40 dark:hover:border-accent/40 shadow-sm hover:shadow-md transition-all duration-200'
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold leading-none text-white bg-gradient-to-br from-[#123F3D] to-[#14292E] rounded-full shadow-lg shadow-[#14292E]/30 ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 mt-3 w-80 sm:w-96 z-50',
            'bg-background/85 dark:bg-muted/40/80 backdrop-blur-xl',
            'border border-border dark:border-border rounded-2xl shadow-lg dark:shadow-slate-900/50',
            'animate-fade-in-up overflow-hidden'
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-xs font-medium text-accent dark:text-accent">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0}
              className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-xl',
                'transition-colors duration-200',
                unreadCount === 0
                  ? 'text-muted-foreground/60 dark:text-muted-foreground cursor-not-allowed'
                  : 'text-accent dark:text-accent hover:bg-accent/10 dark:hover:bg-accent/10'
              )}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 px-4 py-10 text-sm text-destructive dark:text-destructive/80">
                <X className="w-4 h-4" />
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="w-14 h-14 mb-3 bg-accent/10 dark:bg-accent/40 rounded-2xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  You're all caught up
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No notifications to show right now.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.map((n) => {
                  const isRead = n.is_read === 1;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleNotificationClick(n.id, n.action_url)}
                        className={cn(
                          'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-200',
                          'hover:bg-muted/50/80 dark:hover:bg-slate-700/50',
                          !isRead && 'bg-accent/10/60 dark:bg-accent/10'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 w-2 h-2 rounded-full flex-shrink-0',
                            typeAccent[n.type] || 'bg-slate-400'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm truncate',
                                isRead
                                  ? 'text-muted-foreground dark:text-muted-foreground'
                                  : 'text-slate-900 dark:text-slate-50 font-semibold'
                              )}
                            >
                              {n.title}
                            </p>
                            {!isRead && (
                              <span className="text-[10px] font-bold text-accent dark:text-accent flex-shrink-0">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {formatTimeAgo(n.created_at)}
                            </span>
                            {!isRead && (
                              <span className="flex items-center gap-1 text-[11px] text-accent dark:text-accent">
                                <Check className="w-3 h-3" />
                                Mark read
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
