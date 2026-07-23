import { useEffect, useState } from 'react';
import { Undo2, Plus, Search } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatDate, formatCurrency } from '../lib/utils';

interface SaleReturn {
  id: string; sale_id: string | null; customer_id: number | null;
  customer_name?: string; medicine_name: string; quantity: number;
  refund_amount: number; reason: string | null; processed_by: number | null;
  processed_by_name?: string; created_at: string;
}
interface Customer { id: number; name: string; }

export default function SalesReturns() {
  const toast = useToast();
  const [items, setItems] = useState<SaleReturn[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ customer_id: '', medicine_name: '', quantity: '1', refund_amount: '0', reason: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [r, c] = await Promise.all([window.electronAPI.listSalesReturns(), window.electronAPI.listCustomers()]);
        if (r.success) setItems(r.returns || []);
        if (c.success) setCustomers(c.customers || []);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const result = await window.electronAPI.createSalesReturn({
      customer_id: parseInt(form.customer_id) || null, medicine_name: form.medicine_name,
      quantity: parseInt(form.quantity) || 1, refund_amount: parseFloat(form.refund_amount) || 0,
      reason: form.reason || null, processed_by: 1,
    });
    if (result.success) {
      toast.success('Return Created', 'Sales return processed.');
      await loadData(); setShowDialog(false);
      setForm({ customer_id: '', medicine_name: '', quantity: '1', refund_amount: '0', reason: '' });
    } else toast.error('Error', result.error || 'Operation failed');
  };

  const filtered = items.filter(i =>
    i.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
    i.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (<div className="space-y-5">
    <div className="flex items-center justify-between">
      <div><h2 className="text-xl font-bold text-gray-900">Sales Returns</h2><p className="text-sm text-gray-500 mt-1">Process customer returns</p></div>
      <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Return</Button>
    </div>
    <Card variant="bordered"><CardContent className="p-4">
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns..." className="pl-10 h-11" />
      </div>
    </CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
    : filtered.length === 0 ? (<Card variant="bordered"><CardContent className="p-12 text-center"><Undo2 className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No sales returns</p></CardContent></Card>)
    : (<div className="space-y-2">{filtered.map(ret => (<Card key={ret.id} variant="bordered"><CardContent className="p-4 flex items-center justify-between">
      <div><div className="flex items-center gap-2"><Badge variant="critical" size="sm">Return</Badge><span className="font-semibold text-sm">{ret.medicine_name}</span></div>
        <p className="text-xs text-gray-500 mt-0.5">{ret.customer_name && `Customer: ${ret.customer_name}`} · {formatDate(ret.created_at)}</p></div>
      <div className="text-right"><p className="text-sm font-bold text-red-600">{ret.quantity} units</p>{ret.refund_amount > 0 && <p className="text-xs text-gray-500">{formatCurrency(ret.refund_amount)}</p>}</div>
    </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) setShowDialog(false); }}>
      <DialogContent><DialogHeader><DialogTitle>Create Sales Return</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <Select value={form.customer_id} onValueChange={v => setForm({...form, customer_id: v})}>
              {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </Select></div>
          <div><label htmlFor="sr-medicine" className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
            <Input id="sr-medicine" value={form.medicine_name} onChange={e => setForm({...form, medicine_name: e.target.value})} required className="h-11" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="sr-qty" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <Input id="sr-qty" type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
            <div><label htmlFor="sr-refund" className="block text-sm font-medium text-gray-700 mb-1">Refund (₹)</label>
              <Input id="sr-refund" type="number" value={form.refund_amount} onChange={e => setForm({...form, refund_amount: e.target.value})} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2}
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button type="submit">Create Return</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}