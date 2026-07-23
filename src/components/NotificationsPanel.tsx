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
    switch (type) { case 'critical': return 'bg-red-100 text-red-600'; case 'warning': return 'bg-amber-100 text-amber-600'; case 'success': return 'bg-emerald-100 text-emerald-600'; default: return 'bg-blue-100 text-blue-600'; }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => n.is_read === 0) : notifications;

  return (<div className="space-y-5">
    <div className="flex items-center justify-between">
      <div><h2 className="text-xl font-bold text-gray-900">Notifications</h2><p className="text-sm text-gray-500 mt-1">System notifications and alerts</p></div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setFilter('all')} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>All</button>
          <button onClick={() => setFilter('unread')} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', filter === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>Unread ({unreadCount})</button>
        </div>
        {unreadCount > 0 && <Button variant="outline" size="sm" onClick={() => user?.id && markAllAsRead(user.id)} className="gap-1"><CheckCheck className="w-4 h-4" /> Mark All Read</Button>}
      </div>
    </div>
    <Card variant="bordered">
      <CardContent className="p-0">
        {isLoading ? <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        : filtered.length === 0 ? (<div className="p-12 text-center"><Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500 font-medium">No notifications</p></div>)
        : (<div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
          {filtered.map(notification => { const Icon = getIcon(notification.type); return (
            <div key={notification.id} className={cn('p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors', !notification.is_read && 'bg-teal-50/50')}>
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', getIconBg(notification.type))}><Icon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2"><p className={cn('text-sm', notification.is_read ? 'text-gray-600' : 'font-semibold text-gray-900')}>{notification.title}</p>
                {!notification.is_read && <button onClick={() => markAsRead(notification.id)} className="p-1 rounded hover:bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-400" /></button>}</div>
                <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p><p className="text-[10px] text-gray-400 mt-1">{formatDate(notification.created_at)}</p></div>
            </div>); })}
        </div>)}
      </CardContent>
    </Card>
  </div>);
}