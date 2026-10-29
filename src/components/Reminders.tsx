import { useEffect, useState } from 'react';
import { Calendar, Plus, Search, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatDate, cn } from '../lib/utils';

interface Reminder { id: number; title: string; description: string | null; reminder_type: string; reminder_date: string; is_recurring: number; recurrence_pattern: string | null; is_completed: number; created_by: number | null; created_by_name?: string; created_at: string; }

export default function Reminders() {
  const toast = useToast();
  const [items, setItems] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ title: '', description: '', reminder_type: 'task', reminder_date: '', is_recurring: false, recurrence_pattern: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { if (window.electronAPI) { const res = await window.electronAPI.listReminders(); if (res.success) setItems(res.reminders || []); } } catch (error) { console.error(error); } finally { setIsLoading(false); } };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const data = { ...form, is_recurring: form.is_recurring, created_by: 1 };
    const result = editing ? await window.electronAPI.updateReminder({ ...data, id: editing.id }) : await window.electronAPI.createReminder(data);
    if (result.success) { toast.success(editing ? 'Updated' : 'Created', `Reminder ${form.title}`); await loadData(); setShowDialog(false); setEditing(null); setForm({ title: '', description: '', reminder_type: 'task', reminder_date: '', is_recurring: false, recurrence_pattern: '' }); }
    else toast.error('Error', result.error || 'Operation failed');
  };
  const handleDelete = async (id: number) => { if (!window.electronAPI) return; const res = await window.electronAPI.deleteReminder(id); if (res.success) { toast.success('Deleted', 'Reminder removed.'); await loadData(); } else toast.error('Error', res.error || 'Delete failed'); };
  const toggleComplete = async (reminder: Reminder) => { if (!window.electronAPI) return; const res = await window.electronAPI.updateReminder({ id: reminder.id, title: reminder.title, reminder_type: reminder.reminder_type, reminder_date: reminder.reminder_date, is_completed: reminder.is_completed ? 0 : 1 }); if (res.success) { toast.success(reminder.is_completed ? 'Reopened' : 'Completed', `"${reminder.title}"`); await loadData(); } };
  const filtered = items.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.reminder_type.toLowerCase().includes(search.toLowerCase()));

  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-foreground">Reminders</h2><p className="text-sm text-muted-foreground mt-1">Calendar and task reminders</p></div>
      <Button onClick={() => { setEditing(null); setForm({ title: '', description: '', reminder_type: 'task', reminder_date: new Date().toISOString().split('T')[0], is_recurring: false, recurrence_pattern: '' }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Reminder</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reminders..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (<Card variant="bordered"><CardContent className="p-12 text-center"><Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No reminders</p></CardContent></Card>)
    : (<div className="space-y-2">{filtered.map(reminder => (<Card key={reminder.id} variant="bordered" className={cn(reminder.is_completed && 'opacity-60')}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => toggleComplete(reminder)} className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors', reminder.is_completed ? 'bg-success-light border-emerald-500' : 'border-border hover:border-accent')}>{reminder.is_completed && <CheckCircle2 className="w-4 h-4 text-white" />}</button>
          <div className="min-w-0"><div className="flex items-center gap-2"><span className={cn('font-semibold text-sm', reminder.is_completed ? 'line-through text-muted-foreground/60' : 'text-foreground')}>{reminder.title}</span>
            <Badge variant={reminder.reminder_type === 'urgent' ? 'critical' : 'outline-teal'} size="sm">{reminder.reminder_type}</Badge></div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(reminder.reminder_date)}{reminder.is_recurring ? ` · Recurring (${reminder.recurrence_pattern || 'daily'})` : ''}</p></div></div>
        <div className="flex gap-1 flex-shrink-0"><button onClick={() => { setEditing(reminder); setForm({ title: reminder.title, description: reminder.description || '', reminder_type: reminder.reminder_type, reminder_date: reminder.reminder_date, is_recurring: !!reminder.is_recurring, recurrence_pattern: reminder.recurrence_pattern || '' }); setShowDialog(true); }} className="p-1.5 rounded hover:bg-slate-100"><Edit className="w-3.5 h-3.5 text-muted-foreground/60" /></button>
          <button onClick={() => handleDelete(reminder.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div>
      </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
      <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Reminder</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="reminder-title" className="block text-sm font-medium text-foreground/80 mb-1">Title *</label><Input id="reminder-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="h-11" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-foreground/80 mb-1">Type</label><Select value={form.reminder_type} onValueChange={v => setForm({...form, reminder_type: v})}><SelectItem value="task">Task</SelectItem><SelectItem value="meeting">Meeting</SelectItem><SelectItem value="followup">Follow-up</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="other">Other</SelectItem></Select></div>
            <div><label htmlFor="reminder-date" className="block text-sm font-medium text-foreground/80 mb-1">Date *</label><Input id="reminder-date" type="date" value={form.reminder_date} onChange={e => setForm({...form, reminder_date: e.target.value})} required className="h-11" /></div></div>
          <div className="flex items-center gap-3"><input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} className="w-4 h-4 rounded border-border text-accent" /><label htmlFor="recurring" className="text-sm text-foreground/80">Recurring</label>
            {form.is_recurring && <select value={form.recurrence_pattern} onChange={e => setForm({...form, recurrence_pattern: e.target.value})} className="h-10 rounded-xl border border-border bg-background/85 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>}</div>
          <div><label className="block text-sm font-medium text-foreground/80 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full rounded-xl border border-border bg-background/85 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={!form.title.trim() || !form.reminder_date}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}