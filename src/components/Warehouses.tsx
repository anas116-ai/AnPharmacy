import { useEffect, useState } from 'react';
import { Building2, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useToast } from '../hooks/useToast';
interface Warehouse { id: number; name: string; location: string | null; manager_name: string | null; phone: string | null; capacity: number | null; current_stock: number; is_active: number; created_at: string; }
export default function Warehouses() {
  const toast = useToast();
  const [items, setItems] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ name: '', location: '', manager_name: '', phone: '', capacity: '' });
  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { if (window.electronAPI) { const res = await window.electronAPI.listWarehouses(); if (res.success) setItems(res.warehouses || []); } } catch (error) { console.error(error); } finally { setIsLoading(false); } };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const data = { ...form, capacity: form.capacity ? parseInt(form.capacity) : null };
    const result = editing ? await window.electronAPI.updateWarehouse({ ...data, id: editing.id }) : await window.electronAPI.createWarehouse(data);
    if (result.success) { toast.success(editing ? 'Updated' : 'Created', `Warehouse ${form.name}`); await loadData(); setShowDialog(false); setEditing(null); setForm({ name: '', location: '', manager_name: '', phone: '', capacity: '' }); }
    else toast.error('Error', result.error || 'Operation failed');
  };
  const handleDelete = async (id: number) => { if (!window.electronAPI) return; const res = await window.electronAPI.deleteWarehouse({ id }); if (res.success) { toast.success('Deleted', 'Warehouse removed.'); await loadData(); } else toast.error('Error', res.error || 'Delete failed'); };
  const filtered = items.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.location?.toLowerCase().includes(search.toLowerCase()));
  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-foreground">Warehouses</h2><p className="text-sm text-muted-foreground mt-1">Manage warehouse locations</p></div>
      <Button onClick={() => { setEditing(null); setForm({ name: '', location: '', manager_name: '', phone: '', capacity: '' }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Warehouse</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search warehouses..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div> : filtered.length === 0 ? (
      <Card variant="bordered"><CardContent className="p-12 text-center"><Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No warehouses found</p></CardContent></Card>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(warehouse => (
          <Card key={warehouse.id} variant="bordered" className="hover:shadow-md transition-all">
            <CardContent className="p-4"><div className="flex items-start justify-between">
              <div><div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{warehouse.name}</h3>{warehouse.is_active ? <Badge variant="safe" size="sm">Active</Badge> : <Badge variant="expired" size="sm">Inactive</Badge>}</div>
                <p className="text-xs text-muted-foreground mt-1">{warehouse.location && <span className="mr-3">{warehouse.location}</span>}{warehouse.manager_name && <span>Mgr: {warehouse.manager_name}</span>}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Stock: {warehouse.current_stock} {warehouse.capacity && `/ ${warehouse.capacity} capacity`}</p>
              </div>
              <div className="flex gap-1"><button onClick={() => { setEditing(warehouse); setForm({ name: warehouse.name, location: warehouse.location || '', manager_name: warehouse.manager_name || '', phone: warehouse.phone || '', capacity: String(warehouse.capacity || '') }); setShowDialog(true); }} className="p-1.5 rounded hover:bg-gray-100"><Edit className="w-3.5 h-3.5 text-muted-foreground/60" /></button>
                <button onClick={() => handleDelete(warehouse.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div>
            </div></CardContent></Card>
        ))}
      </div>
    )}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
      <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Warehouse</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="wh-name" className="block text-sm font-medium text-foreground/80 mb-1">Name *</label><Input id="wh-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-11" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="wh-location" className="block text-sm font-medium text-foreground/80 mb-1">Location</label><Input id="wh-location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="h-11" /></div><div><label htmlFor="wh-capacity" className="block text-sm font-medium text-foreground/80 mb-1">Capacity</label><Input id="wh-capacity" type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} className="h-11" /></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="wh-manager" className="block text-sm font-medium text-foreground/80 mb-1">Manager</label><Input id="wh-manager" value={form.manager_name} onChange={e => setForm({...form, manager_name: e.target.value})} className="h-11" /></div><div><label htmlFor="wh-phone" className="block text-sm font-medium text-foreground/80 mb-1">Phone</label><Input id="wh-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-11" /></div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={!form.name.trim()}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}