import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { UserPlus, Search, Plus, Phone, Mail, MapPin, CreditCard, DollarSign, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatCurrency, cn } from '../lib/utils';

interface Customer {
  id: number; name: string; phone: string | null; email: string | null;
  address: string | null; gstin: string | null; credit_limit: number;
  current_balance: number; type: string; created_at: string;
}
interface LedgerEntry {
  id: number; customer_id: number; transaction_type: string;
  amount: number; payment_method: string | null; reference_id: string | null;
  notes: string | null; created_at: string;
}

export default function Customers() {
  const { hasPermission } = useAuthStore();
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', gstin: '', credit_limit: '0', type: 'retail' });
  const [viewingLedger, setViewingLedger] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const canManage = hasPermission('manage_users');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.listCustomers();
        if (res.success) setCustomers(res.customers || []);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    const data = { ...form, credit_limit: parseFloat(form.credit_limit) || 0 };
    const result = editing
      ? await window.electronAPI.updateCustomer({ ...data, id: editing.id })
      : await window.electronAPI.createCustomer(data);
    if (result.success) {
      toast.success(editing ? 'Updated' : 'Created', `Customer ${form.name}`);
      await loadData(); setShowDialog(false); setEditing(null);
      setForm({ name: '', phone: '', email: '', address: '', gstin: '', credit_limit: '0', type: 'retail' });
    } else toast.error('Error', result.error || 'Operation failed');
  };

  const handleDelete = async (id: number) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.deleteCustomer({ id });
    if (result.success) { toast.success('Deleted', 'Customer removed.'); await loadData(); }
    else toast.error('Error', result.error || 'Delete failed');
  };

  const viewLedger = async (customer: Customer) => {
    setViewingLedger(customer);
    if (window.electronAPI) {
      const res = await window.electronAPI.getCustomerLedger({ customerId: customer.id });
      if (res.success) setLedger(res.ledger || []);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500 mt-1">Manage customers and view ledger</p>
        </div>
        {canManage && <Button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', gstin: '', credit_limit: '0', type: 'retail' }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Customer</Button>}
      </div>
      <Card variant="bordered"><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-10 h-11" /></div>
      </CardContent></Card>

      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div> : filtered.length === 0 ? (
        <Card variant="bordered"><CardContent className="p-12 text-center"><UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No customers found</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <Card key={customer.id} variant="bordered" className="hover:shadow-medium transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      <Badge variant={customer.type === 'wholesale' ? 'warning' : 'safe'} size="sm">{customer.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-500">
                      {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
                      {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>}
                      {customer.gstin && <span className="font-mono">GST: {customer.gstin}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600"><DollarSign className="w-3 h-3" />Balance: {formatCurrency(customer.current_balance)}</span>
                      <span className="flex items-center gap-1 text-amber-600"><CreditCard className="w-3 h-3" />Limit: {formatCurrency(customer.credit_limit)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => viewLedger(customer)} className="p-1.5 rounded-lg hover:bg-teal-50" title="View Ledger"><Eye className="w-4 h-4 text-teal-600" /></button>
                    {canManage && <>
                      <button onClick={() => { setEditing(customer); setForm({ name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '', gstin: customer.gstin || '', credit_limit: String(customer.credit_limit), type: customer.type }); setShowDialog(true); }} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={() => handleDelete(customer.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Customer</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label htmlFor="cust-name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label><Input id="cust-name" autoComplete="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-11" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="cust-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label><Input id="cust-phone" autoComplete="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-11" /></div>
              <div><label htmlFor="cust-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><Input id="cust-email" type="email" autoComplete="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="cust-gstin" className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label><Input id="cust-gstin" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} className="h-11" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="cust-credit" className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (₹)</label><Input id="cust-credit" type="number" autoComplete="off" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} className="h-11" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={!form.name.trim()}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingLedger} onOpenChange={o => { if (!o) { setViewingLedger(null); setLedger([]); } }}>
        {viewingLedger && <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Ledger: {viewingLedger.name}</DialogTitle></DialogHeader>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
            <span className="text-sm text-gray-600">Balance: <span className="font-bold text-emerald-600">{formatCurrency(viewingLedger.current_balance)}</span></span>
            <span className="text-sm text-gray-600">Credit Limit: <span className="font-bold text-amber-600">{formatCurrency(viewingLedger.credit_limit)}</span></span>
          </div>
          {ledger.length === 0 ? <p className="text-center text-gray-400 py-8">No ledger entries found</p> : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div><span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', entry.transaction_type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{entry.transaction_type}</span>
                    {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
                  </div>
                  <span className={cn('font-bold', entry.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600')}>{entry.transaction_type === 'payment' ? '-' : '+'}{formatCurrency(entry.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => { setViewingLedger(null); setLedger([]); }}>Close</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </div>
  );
}