import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';
import { formatDate } from '../lib/utils';

export default function NotificationsPanel() {
  const { user } = useAuthStore();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => { if (user?.id) fetchNotifications(user.id); }, [user?.id]);

  const getIcon = (type: string) => {
    switch (type) { case 'critical': return AlertTriangle; case 'warning': return AlertTriangle; case 'success': return CheckCircle; default: return Info; }
  };
  const getIconBg = (type: string) => {
    switch (type) { case 'critical': return 'bg-destructive/10 text-destructive'; case 'warning': return 'bg-warning-light text-warning'; case 'success': return 'bg-success-light text-success'; default: return 'bg-info-light text-info'; }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => n.is_read === 0) : notifications;

  return (<div className="space-y-5">
    <div className="flex items-center justify-between">
      <div><h2 className="text-xl font-bold text-foreground">Notifications</h2><p className="text-sm text-muted-foreground mt-1">System notifications and alerts</p></div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setFilter('all')} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', filter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground/80')}>All</button>
          <button onClick={() => setFilter('unread')} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', filter === 'unread' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground/80')}>Unread ({unreadCount})</button>
        </div>
        {unreadCount > 0 && <Button variant="outline" size="sm" onClick={() => user?.id && markAllAsRead(user.id)} className="gap-1"><CheckCheck className="w-4 h-4" /> Mark All Read</Button>}
      </div>
    </div>
    <Card variant="bordered">
      <CardContent className="p-0">
        {isLoading ? <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        : filtered.length === 0 ? (<div className="p-12 text-center"><Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground font-medium">No notifications</p></div>)
        : (<div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {filtered.map(notification => { const Icon = getIcon(notification.type); return (
            <div key={notification.id} className={cn('p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors', !notification.is_read && 'bg-accent/10/50')}>
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', getIconBg(notification.type))}><Icon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2"><p className={cn('text-sm', notification.is_read ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{notification.title}</p>
                {!notification.is_read && <button onClick={() => markAsRead(notification.id)} className="p-1 rounded hover:bg-slate-200 flex-shrink-0"><X className="w-3 h-3 text-muted-foreground/60" /></button>}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p><p className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(notification.created_at)}</p></div>
            </div>); })}
        </div>)}
      </CardContent>
    </Card>
  </div>);
}