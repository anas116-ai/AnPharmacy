import { useEffect, useState } from 'react';
import { Target, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../lib/utils';
interface Scheme { id: number; name: string; description: string | null; discount_type: string; discount_value: number; min_purchase_amount: number | null; applicable_to: string | null; start_date: string | null; end_date: string | null; requires_approval: number; is_active: number; created_at: string; }
export default function DiscountSchemes() {
  const toast = useToast(); const [items, setItems] = useState<Scheme[]>([]); const [isLoading, setIsLoading] = useState(true); const [search, setSearch] = useState(''); const [showDialog, setShowDialog] = useState(false); const [editing, setEditing] = useState<Scheme | null>(null);
  const [form, setForm] = useState({ name: '', description: '', discount_type: 'percentage', discount_value: '', min_purchase_amount: '', applicable_to: '', start_date: '', end_date: '', requires_approval: false });
  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { if (window.electronAPI) { const res = await window.electronAPI.listDiscountSchemes(); if (res.success) setItems(res.schemes || []); } } catch (error) { console.error(error); } finally { setIsLoading(false); } };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const data = { ...form, discount_value: parseFloat(form.discount_value) || 0, min_purchase_amount: form.min_purchase_amount ? parseFloat(form.min_purchase_amount) : null, is_active: editing?.is_active ?? 1 };
    const result = editing ? await window.electronAPI.updateDiscountScheme({ ...data, id: editing.id }) : await window.electronAPI.createDiscountScheme(data);
    if (result.success) { toast.success(editing ? 'Updated' : 'Created', `Scheme ${form.name}`); await loadData(); setShowDialog(false); setEditing(null); setForm({ name: '', description: '', discount_type: 'percentage', discount_value: '', min_purchase_amount: '', applicable_to: '', start_date: '', end_date: '', requires_approval: false }); }
    else toast.error('Error', result.error || 'Operation failed');
  };
  const handleDelete = async (id: number) => { if (!window.electronAPI) return; const res = await window.electronAPI.deleteDiscountScheme({ id }); if (res.success) { toast.success('Deleted', 'Scheme removed.'); await loadData(); } else toast.error('Error', res.error || 'Delete failed'); };
  const filtered = items.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-foreground">Discount Schemes</h2><p className="text-sm text-muted-foreground mt-1">Manage discount programs</p></div>
      <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', discount_type: 'percentage', discount_value: '', min_purchase_amount: '', applicable_to: '', start_date: '', end_date: '', requires_approval: false }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Scheme</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schemes..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (<Card variant="bordered"><CardContent className="p-12 text-center"><Target className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No discount schemes</p></CardContent></Card>)
    : (<div className="space-y-2">{filtered.map(scheme => (<Card key={scheme.id} variant="bordered"><CardContent className="p-4 flex items-center justify-between">
      <div><div className="flex items-center gap-2"><span className="font-semibold text-sm">{scheme.name}</span>{scheme.is_active ? <Badge variant="safe" size="sm">Active</Badge> : <Badge variant="expired" size="sm">Inactive</Badge>}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{scheme.discount_type === 'percentage' ? `${scheme.discount_value}% off` : `${formatCurrency(scheme.discount_value)} off`}{scheme.min_purchase_amount && ` · Min: ${formatCurrency(scheme.min_purchase_amount)}`}</p>
        {scheme.description && <p className="text-xs text-muted-foreground/60 mt-0.5">{scheme.description}</p>}</div>
      <div className="flex gap-1"><button onClick={() => { setEditing(scheme); setForm({ name: scheme.name, description: scheme.description || '', discount_type: scheme.discount_type, discount_value: String(scheme.discount_value), min_purchase_amount: String(scheme.min_purchase_amount || ''), applicable_to: scheme.applicable_to || '', start_date: scheme.start_date || '', end_date: scheme.end_date || '', requires_approval: !!scheme.requires_approval }); setShowDialog(true); }} className="p-1.5 rounded hover:bg-slate-100"><Edit className="w-3.5 h-3.5 text-muted-foreground/60" /></button>
        <button onClick={() => handleDelete(scheme.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div>
    </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
      <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Discount Scheme</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="scheme-name" className="block text-sm font-medium text-foreground/80 mb-1">Name *</label><Input id="scheme-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-11" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-foreground/80 mb-1">Type</label><Select value={form.discount_type} onValueChange={v => setForm({...form, discount_type: v})}><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></Select></div>
            <div><label htmlFor="scheme-value" className="block text-sm font-medium text-foreground/80 mb-1">Value *</label><Input id="scheme-value" type="number" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} required className="h-11" /></div></div>
          <div><label className="block text-sm font-medium text-foreground/80 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full rounded-xl border border-border bg-background/85 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={!form.name.trim() || !form.discount_value}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}