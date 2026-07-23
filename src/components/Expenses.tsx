import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Wallet, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../lib/utils';

interface Expense { id: number; category: string; amount: number; description: string | null; payment_method: string | null; created_by: number | null; created_by_name?: string; created_at: string; }

export default function Expenses() {
  const toast = useToast();
  const [items, setItems] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category: '', amount: '', description: '', payment_method: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { if (window.electronAPI) { const res = await window.electronAPI.listExpenses(); if (res.success) setItems(res.expenses || []); } }
    catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    const data = { category: form.category, amount: parseFloat(form.amount) || 0, description: form.description || null, payment_method: form.payment_method || null, created_by: 1 };
    const result = editing ? await window.electronAPI.updateExpense({ ...data, id: editing.id }) : await window.electronAPI.createExpense(data);
    if (result.success) { toast.success(editing ? 'Updated' : 'Created', 'Expense saved.'); await loadData(); setShowDialog(false); setEditing(null); setForm({ category: '', amount: '', description: '', payment_method: '' }); }
    else toast.error('Error', result.error || 'Operation failed');
  };

  const handleDelete = async (id: number) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.deleteExpense({ id });
    if (result.success) { toast.success('Deleted', 'Expense removed.'); await loadData(); }
    else toast.error('Error', result.error || 'Delete failed');
  };

  const total = items.reduce((s, e) => s + e.amount, 0);
  const filtered = items.filter(e => e.category.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Expenses</h2><p className="text-sm text-gray-500 mt-1">Track operational expenses</p></div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Total: <strong className="text-red-600">{formatCurrency(total)}</strong></span>
          <Button onClick={() => { setEditing(null); setForm({ category: '', amount: '', description: '', payment_method: '' }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Expense</Button>
        </div>
      </div>
      <Card variant="bordered"><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="pl-10 h-11" /></div>
      </CardContent></Card>
      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (
        <Card variant="bordered"><CardContent className="p-12 text-center"><Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No expenses recorded</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(expense => (
            <Card key={expense.id} variant="bordered" className="hover:shadow-medium transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{expense.category}</span>
                    <span className="text-xs text-gray-400">{expense.payment_method && `via ${expense.payment_method}`}</span>
                  </div>
                  {expense.description && <p className="text-xs text-gray-500 mt-1">{expense.description}</p>}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                  <div className="flex gap-1 mt-1 justify-end">
                    <button onClick={() => { setEditing(expense); setForm({ category: expense.category, amount: String(expense.amount), description: expense.description || '', payment_method: expense.payment_method || '' }); setShowDialog(true); }} className="p-1 rounded hover:bg-gray-100"><Edit className="w-3 h-3 text-gray-400" /></button>
                    <button onClick={() => handleDelete(expense.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectItem value="">Select...</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </Select>
              </div>
              <div><label htmlFor="exp-amount" className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label><Input id="exp-amount" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="h-11" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <Select value={form.payment_method} onValueChange={v => setForm({...form, payment_method: v})}>
                <SelectItem value="">Select...</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
              </Select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={!form.category || !form.amount}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}