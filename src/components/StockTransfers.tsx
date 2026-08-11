import { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, Search } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/utils';
interface Transfer { id: string; from_warehouse_id: number | null; to_warehouse_id: number | null; from_warehouse?: string; to_warehouse?: string; medicine_id: number | null; medicine_name?: string; quantity: number; status: string; transferred_by_name?: string; created_at: string; }
interface Warehouse { id: number; name: string; }
interface Medicine { id: number; name: string; }

export default function StockTransfers() {
  const toast = useToast();
  const [items, setItems] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', medicine_id: '', quantity: '1', notes: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { if (window.electronAPI) { const [t, w, m] = await Promise.all([window.electronAPI.listStockTransfers(), window.electronAPI.listWarehouses(), window.electronAPI.listStock()]); if (t.success) setItems(t.transfers || []); if (w.success) setWarehouses(w.warehouses || []); if (m.success) setMedicines(m.medicines || []); } }
    catch (error) { console.error(error); } finally { setIsLoading(false); }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const result = await window.electronAPI.createStockTransfer({ from_warehouse_id: parseInt(form.from_warehouse_id), to_warehouse_id: parseInt(form.to_warehouse_id), medicine_id: parseInt(form.medicine_id), quantity: parseInt(form.quantity) || 1, notes: form.notes || null, transferred_by: 1 });
    if (result.success) { toast.success('Transfer Created', 'Stock transfer initiated.'); await loadData(); setShowDialog(false); setForm({ from_warehouse_id: '', to_warehouse_id: '', medicine_id: '', quantity: '1', notes: '' }); }
    else toast.error('Error', result.error || 'Operation failed');
  };
  const handleReceive = async (id: string) => { if (!window.electronAPI) return; const res = await window.electronAPI.receiveStockTransfer({ id: id as any }); if (res.success) { toast.success('Completed', 'Transfer received.'); await loadData(); } else toast.error('Error', res.error || 'Failed'); };
  const filtered = items.filter(t => t.from_warehouse?.toLowerCase().includes(search.toLowerCase()) || t.to_warehouse?.toLowerCase().includes(search.toLowerCase()) || t.medicine_name?.toLowerCase().includes(search.toLowerCase()));
  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-foreground">Stock Transfers</h2><p className="text-sm text-muted-foreground mt-1">Transfer stock between warehouses</p></div>
      <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Transfer</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transfers..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (<Card variant="bordered"><CardContent className="p-12 text-center"><ArrowLeftRight className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No transfers</p></CardContent></Card>)
    : (<div className="space-y-2">{filtered.map(t => (<Card key={t.id} variant="bordered"><CardContent className="p-4 flex items-center justify-between">
      <div><div className="flex items-center gap-2"><Badge variant={t.status === 'completed' ? 'safe' : 'warning'} size="sm">{t.status}</Badge><span className="font-semibold text-sm">{t.from_warehouse || '?'} → {t.to_warehouse || '?'}</span></div><p className="text-xs text-muted-foreground mt-0.5">{t.medicine_name} · {t.quantity} units · {formatDate(t.created_at)}</p></div>
      {t.status === 'pending' && <Button size="sm" onClick={() => handleReceive(t.id)} className="text-xs">Receive</Button>}
    </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) setShowDialog(false); }}>
      <DialogContent><DialogHeader><DialogTitle>Create Stock Transfer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-foreground/80 mb-1">From Warehouse</label><Select value={form.from_warehouse_id} onValueChange={v => setForm({...form, from_warehouse_id: v})}>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</Select></div>
            <div><label className="block text-sm font-medium text-foreground/80 mb-1">To Warehouse</label><Select value={form.to_warehouse_id} onValueChange={v => setForm({...form, to_warehouse_id: v})}>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</Select></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-foreground/80 mb-1">Medicine</label><Select value={form.medicine_id} onValueChange={v => setForm({...form, medicine_id: v})}>{medicines.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</Select></div>
            <div><label htmlFor="st-qty" className="block text-sm font-medium text-foreground/80 mb-1">Quantity</label><Input id="st-qty" type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="h-11" /></div></div>
          <div><label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-xl border border-border bg-background/85 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button type="submit">Create Transfer</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}