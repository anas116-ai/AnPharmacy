import { useEffect, useState } from 'react';
import { Tag, Plus, Search, Trash2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../lib/utils';
interface PriceRule { id: number; medicine_id: number | null; medicine_name?: string; rule_type: string; discount_percentage: number | null; discount_amount: number | null; min_quantity: number | null; max_quantity: number | null; start_date: string | null; end_date: string | null; is_active: number; created_at: string; }
interface Medicine { id: number; name: string; }

export default function PricingRules() {
  const toast = useToast();
  const [items, setItems] = useState<PriceRule[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ medicine_id: '', rule_type: 'percentage', discount_percentage: '', discount_amount: '', min_quantity: '', max_quantity: '', start_date: '', end_date: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { if (window.electronAPI) { const [r, m] = await Promise.all([window.electronAPI.listPriceRules(), window.electronAPI.listStock()]); if (r.success) setItems(r.rules || []); if (m.success) setMedicines(m.medicines || []); } } catch (error) { console.error(error); } finally { setIsLoading(false); } };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const data = { medicine_id: parseInt(form.medicine_id) || null, rule_type: form.rule_type, discount_percentage: form.discount_percentage ? parseFloat(form.discount_percentage) : null, discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : null, min_quantity: form.min_quantity ? parseInt(form.min_quantity) : null, max_quantity: form.max_quantity ? parseInt(form.max_quantity) : null, start_date: form.start_date || null, end_date: form.end_date || null };
    const result = await window.electronAPI.createPriceRule(data);
    if (result.success) { toast.success('Rule Created', 'Pricing rule added.'); await loadData(); setShowDialog(false); setForm({ medicine_id: '', rule_type: 'percentage', discount_percentage: '', discount_amount: '', min_quantity: '', max_quantity: '', start_date: '', end_date: '' }); }
    else toast.error('Error', result.error || 'Operation failed');
  };
  const handleDelete = async (id: number) => { if (!window.electronAPI) return; const res = await window.electronAPI.deletePriceRule({ id }); if (res.success) { toast.success('Deleted', 'Rule removed.'); await loadData(); } else toast.error('Error', res.error || 'Delete failed'); };
  const filtered = items.filter(r => r.medicine_name?.toLowerCase().includes(search.toLowerCase()) || r.rule_type.toLowerCase().includes(search.toLowerCase()));
  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-foreground">Pricing Rules</h2><p className="text-sm text-muted-foreground mt-1">Manage dynamic pricing rules</p></div><Button onClick={() => setShowDialog(true)} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Rule</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (<Card variant="bordered"><CardContent className="p-12 text-center"><Tag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No pricing rules</p></CardContent></Card>)
    : (<div className="space-y-2">{filtered.map(rule => (<Card key={rule.id} variant="bordered"><CardContent className="p-4 flex items-center justify-between">
      <div><div className="flex items-center gap-2"><span className="text-xs font-semibold px-2 py-0.5 bg-accent/10 text-accent rounded-full">{rule.rule_type}</span><span className="font-semibold text-sm">{rule.medicine_name || 'All medicines'}</span></div>
        <p className="text-xs text-muted-foreground mt-0.5">{rule.discount_percentage ? `${rule.discount_percentage}% off` : rule.discount_amount ? `${formatCurrency(rule.discount_amount)} off` : '-'} · Qty: {rule.min_quantity || 0}-{rule.max_quantity || '∞'}</p></div>
      <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
    </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) setShowDialog(false); }}>
      <DialogContent><DialogHeader><DialogTitle>Add Pricing Rule</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="rule-medicine" className="block text-sm font-medium text-foreground/80 mb-1">Medicine</label><Select id="rule-medicine" value={form.medicine_id} onValueChange={v => setForm({...form, medicine_id: v})}>{medicines.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</Select></div>
            <div><label htmlFor="rule-type" className="block text-sm font-medium text-foreground/80 mb-1">Rule Type</label><Select id="rule-type" value={form.rule_type} onValueChange={v => setForm({...form, rule_type: v})}><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></Select></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="rule-discount" className="block text-sm font-medium text-foreground/80 mb-1">{form.rule_type === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}</label><Input id="rule-discount" type="number" value={form.rule_type === 'percentage' ? form.discount_percentage : form.discount_amount} onChange={e => setForm({...form, [form.rule_type === 'percentage' ? 'discount_percentage' : 'discount_amount']: e.target.value})} className="h-11" /></div>
            <div><label htmlFor="rule-min-qty" className="block text-sm font-medium text-foreground/80 mb-1">Min Qty</label><Input id="rule-min-qty" type="number" value={form.min_quantity} onChange={e => setForm({...form, min_quantity: e.target.value})} className="h-11" /></div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button type="submit">Create Rule</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}