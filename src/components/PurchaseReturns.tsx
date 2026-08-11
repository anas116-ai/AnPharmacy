import { useEffect, useState } from 'react';
import { RotateCcw, Plus, Search } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatDate, formatCurrency } from '../lib/utils';
interface ReturnItem { id: string; supplier_id: number | null; supplier_name?: string; medicine_id: number | null; quantity: number; reason: string | null; refund_amount: number; returned_by: number | null; returned_by_name?: string; status?: string; reject_reason?: string | null; created_at: string; }
interface Supplier { id: number; name: string; }
interface Medicine { id: number; name: string; }

export default function PurchaseReturns() {
  const toast = useToast();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', medicine_id: '', quantity: '1', reason: '', refund_amount: '0' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { if (window.electronAPI) { const [r, s, m] = await Promise.all([window.electronAPI.listPurchaseReturns(), window.electronAPI.listSuppliers(), window.electronAPI.listStock()]); if (r.success) setItems(r.returns || []); if (s.success) setSuppliers(s.suppliers || []); if (m.success) setMedicines(m.medicines || []); } }
    catch (error) { console.error(error); } finally { setIsLoading(false); }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const result = await window.electronAPI.createPurchaseReturn({ supplier_id: parseInt(form.supplier_id) || null, medicine_id: parseInt(form.medicine_id) || null, quantity: parseInt(form.quantity) || 1, reason: form.reason || null, refund_amount: parseFloat(form.refund_amount) || 0, returned_by: 1 });
    if (result.success) { toast.success('Return Created', 'Purchase return processed.'); await loadData(); setShowDialog(false); setForm({ supplier_id: '', medicine_id: '', quantity: '1', reason: '', refund_amount: '0' }); }
    else toast.error('Error', result.error || 'Operation failed');
  };
  const filtered = items.filter(i => i.supplier_name?.toLowerCase().includes(search.toLowerCase()) || i.reason?.toLowerCase().includes(search.toLowerCase()));
  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-foreground">Purchase Returns</h2><p className="text-sm text-muted-foreground mt-1">Return medicines to suppliers</p></div>
      <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Return</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (
      <Card variant="bordered"><CardContent className="p-12 text-center"><RotateCcw className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No purchase returns</p></CardContent></Card>
    ) : (<div className="space-y-2">{filtered.map(ret => (<Card key={ret.id} variant="bordered"><CardContent className="p-4 flex items-center justify-between gap-3">
      <div><div className="flex items-center gap-2">
        <Badge variant={ret.status === 'credited' ? 'success' : ret.status === 'rejected' ? 'destructive' : ret.status === 'dispatched' ? 'info' : 'warning'} size="sm">{ret.status || 'raised'}</Badge>
        <span className="font-semibold text-sm">{ret.supplier_name || 'Unknown'}</span></div>
        <p className="text-xs text-muted-foreground mt-0.5">{ret.reason || 'No reason specified'} · {formatDate(ret.created_at)}</p>
        {ret.status === 'rejected' && ret.reject_reason && <p className="text-xs text-destructive mt-0.5">Rejected: {ret.reject_reason}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right"><p className="text-sm font-bold text-warning">{ret.quantity} units</p>{ret.refund_amount > 0 && <p className="text-xs text-muted-foreground">{formatCurrency(ret.refund_amount)}</p>}</div>
        {ret.status === 'raised' && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={async () => { await window.electronAPI.updatePurchaseReturnStatus({ id: ret.id, status: 'dispatched' }); toast.success('Dispatched', 'Return marked as dispatched.'); await loadData(); }}>Dispatch</Button>
            <Button size="sm" variant="outline" onClick={async () => { await window.electronAPI.updatePurchaseReturnStatus({ id: ret.id, status: 'credited' }); toast.success('Credited', 'Supplier credit recorded.'); await loadData(); }}>Credit</Button>
            <Button size="sm" variant="destructive" onClick={async () => { await window.electronAPI.updatePurchaseReturnStatus({ id: ret.id, status: 'rejected', rejectReason: 'Not accepted by supplier' }); toast.error('Rejected', 'Return rejected; stock restored.'); await loadData(); }}>Reject</Button>
          </div>
        )}
      </div>
    </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) setShowDialog(false); }}>
      <DialogContent><DialogHeader><DialogTitle>Create Purchase Return</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-foreground/80 mb-1">Supplier</label><Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}>{suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</Select></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-foreground/80 mb-1">Medicine</label><Select value={form.medicine_id} onValueChange={v => setForm({...form, medicine_id: v})}>{medicines.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</Select></div>
            <div><label htmlFor="pr-qty" className="block text-sm font-medium text-foreground/80 mb-1">Quantity</label><Input id="pr-qty" type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="h-11" /></div></div>
          <div><label htmlFor="pr-refund" className="block text-sm font-medium text-foreground/80 mb-1">Refund Amount (₹)</label><Input id="pr-refund" type="number" value={form.refund_amount} onChange={e => setForm({...form, refund_amount: e.target.value})} className="h-11" /></div>
          <div><label className="block text-sm font-medium text-foreground/80 mb-1">Reason</label><textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className="w-full rounded-xl border border-border bg-background/85 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button type="submit">Create Return</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}