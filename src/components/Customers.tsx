import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { UserPlus, Search, Plus, Phone, Mail, MapPin, CreditCard, DollarSign, Eye, Edit, Trash2, Wallet, CheckCircle2, Receipt, ArrowDownCircle } from 'lucide-react';
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
  const [recordingPaymentCustomer, setRecordingPaymentCustomer] = useState<Customer | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_id: '',
    notes: '',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const canManage = hasPermission('manage_users');

  const startRecordPayment = (customer: Customer) => {
    setRecordingPaymentCustomer(customer);
    setPaymentForm({
      amount: customer.current_balance > 0 ? String(customer.current_balance) : '',
      payment_method: 'cash',
      reference_id: '',
      notes: 'Payment received against outstanding dues',
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingPaymentCustomer || !window.electronAPI) return;
    const amountNum = parseFloat(paymentForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid amount greater than ₹0.');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const res = await window.electronAPI.addCustomerLedger({
        customer_id: recordingPaymentCustomer.id,
        transaction_type: 'payment',
        amount: amountNum,
        payment_method: paymentForm.payment_method,
        reference_id: paymentForm.reference_id || null,
        notes: paymentForm.notes || 'Payment Received',
      });
      if (res.success) {
        toast.success('Payment Received', `Recorded ${formatCurrency(amountNum)} from ${recordingPaymentCustomer.name}`);
        await loadData();
        if (viewingLedger?.id === recordingPaymentCustomer.id) {
          const lRes = await window.electronAPI.getCustomerLedger({ customerId: recordingPaymentCustomer.id });
          if (lRes.success) setLedger(lRes.ledger || []);
        }
        setRecordingPaymentCustomer(null);
      } else {
        toast.error('Payment Error', res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Operation failed');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

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
          <h2 className="text-xl font-bold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage customers and view ledger</p>
        </div>
        {canManage && <Button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', gstin: '', credit_limit: '0', type: 'retail' }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Customer</Button>}
      </div>
      <Card variant="bordered"><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-10 h-11" /></div>
      </CardContent></Card>

      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div> : filtered.length === 0 ? (
        <Card variant="bordered"><CardContent className="p-12 text-center"><UserPlus className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No customers found</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <Card key={customer.id} variant="bordered" className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{customer.name}</h3>
                      <Badge variant={customer.type === 'wholesale' ? 'warning' : 'safe'} size="sm">{customer.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
                      {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
                      {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>}
                      {customer.gstin && <span className="font-mono">GST: {customer.gstin}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className={cn('flex items-center gap-1 font-semibold', customer.current_balance > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                        <DollarSign className="w-3.5 h-3.5" />
                        Due / Balance: {formatCurrency(customer.current_balance)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CreditCard className="w-3.5 h-3.5" />
                        Limit: {formatCurrency(customer.credit_limit)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => startRecordPayment(customer)}
                      className="h-8 gap-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
                      title="Record Payment / Collection from Customer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Receive Pay
                    </Button>
                    <button onClick={() => viewLedger(customer)} className="p-2 rounded-lg border border-border hover:bg-accent/10 transition-colors" title="View Customer Ledger">
                      <Eye className="w-4 h-4 text-accent" />
                    </button>
                    {canManage && <>
                      <button onClick={() => { setEditing(customer); setForm({ name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '', gstin: customer.gstin || '', credit_limit: String(customer.credit_limit), type: customer.type }); setShowDialog(true); }} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><Edit className="w-4 h-4 text-muted-foreground/60" /></button>
                      <button onClick={() => handleDelete(customer.id)} className="p-2 rounded-lg border border-border hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
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
            <div><label htmlFor="cust-name" className="block text-sm font-medium text-foreground/80 mb-1">Name *</label><Input id="cust-name" autoComplete="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-11" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="cust-phone" className="block text-sm font-medium text-foreground/80 mb-1">Phone</label><Input id="cust-phone" autoComplete="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-11" /></div>
              <div><label htmlFor="cust-email" className="block text-sm font-medium text-foreground/80 mb-1">Email</label><Input id="cust-email" type="email" autoComplete="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="cust-gstin" className="block text-sm font-medium text-foreground/80 mb-1">GSTIN</label><Input id="cust-gstin" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} className="h-11" /></div>
              <div><label className="block text-sm font-medium text-foreground/80 mb-1">Type</label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="cust-credit" className="block text-sm font-medium text-foreground/80 mb-1">Credit Limit (₹)</label><Input id="cust-credit" type="number" autoComplete="off" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} className="h-11" /></div>
            </div>
            <div><label className="block text-sm font-medium text-foreground/80 mb-1">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full rounded-xl border border-border bg-background/85 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={!form.name.trim()}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingLedger} onOpenChange={o => { if (!o) { setViewingLedger(null); setLedger([]); } }}>
        {viewingLedger && <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Ledger: {viewingLedger.name}</DialogTitle></DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-xl mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Due Balance: <span className="font-bold text-amber-500">{formatCurrency(viewingLedger.current_balance)}</span></span>
              <span className="text-sm text-muted-foreground">Credit Limit: <span className="font-bold text-foreground">{formatCurrency(viewingLedger.credit_limit)}</span></span>
            </div>
            <Button size="sm" onClick={() => startRecordPayment(viewingLedger)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              <Wallet className="w-4 h-4" /> Record Payment
            </Button>
          </div>
          {ledger.length === 0 ? <p className="text-center text-muted-foreground/60 py-8">No ledger entries found</p> : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full uppercase', entry.transaction_type === 'payment' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300')}>
                        {entry.transaction_type}
                      </span>
                      {entry.payment_method && <span className="text-xs text-muted-foreground capitalize">({entry.payment_method})</span>}
                      {entry.reference_id && <span className="text-xs font-mono text-muted-foreground">#{entry.reference_id}</span>}
                    </div>
                    {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
                    <span className="text-[11px] text-muted-foreground/60">{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                  <span className={cn('font-bold text-sm', entry.transaction_type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                    {entry.transaction_type === 'payment' ? '-' : '+'}{formatCurrency(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => { setViewingLedger(null); setLedger([]); }}>Close</Button></DialogFooter>
        </DialogContent>}
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!recordingPaymentCustomer} onOpenChange={o => { if (!o) setRecordingPaymentCustomer(null); }}>
        {recordingPaymentCustomer && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                Record Customer Payment
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-3.5 bg-muted/60 rounded-xl space-y-1.5 border border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold text-foreground">{recordingPaymentCustomer.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Current Due Balance:</span>
                  <span className="font-bold text-amber-500 text-sm">{formatCurrency(recordingPaymentCustomer.current_balance)}</span>
                </div>
              </div>

              <div>
                <label htmlFor="pay-amt" className="block text-sm font-medium text-foreground mb-1">
                  Amount Received (₹) *
                </label>
                <Input
                  id="pay-amt"
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="h-11 text-base font-semibold"
                  autoFocus
                />
                {recordingPaymentCustomer.current_balance > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, amount: String(recordingPaymentCustomer.current_balance) })}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      Full Due ({formatCurrency(recordingPaymentCustomer.current_balance)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, amount: String(Math.round(recordingPaymentCustomer.current_balance / 2)) })}
                      className="text-xs px-2.5 py-1 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                    >
                      50% Due
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Payment Mode</label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={v => setPaymentForm({ ...paymentForm, payment_method: v })}
                  >
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / QR</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  </Select>
                </div>
                <div>
                  <label htmlFor="pay-ref" className="block text-sm font-medium text-foreground mb-1">
                    Ref / UTR / Cheque No
                  </label>
                  <Input
                    id="pay-ref"
                    value={paymentForm.reference_id}
                    onChange={e => setPaymentForm({ ...paymentForm, reference_id: e.target.value })}
                    placeholder="Optional reference"
                    className="h-11"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pay-notes" className="block text-sm font-medium text-foreground mb-1">
                  Notes / Remarks
                </label>
                <Input
                  id="pay-notes"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Payment remarks"
                  className="h-11"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecordingPaymentCustomer(null)}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPayment || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmittingPayment ? 'Saving...' : 'Confirm Payment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}