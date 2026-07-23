import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { FlaskRound, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

interface GenericMedicine {
  id: number; generic_name: string; brand_name: string;
  manufacturer_id: number | null; manufacturer_name?: string;
  category: string | null; description: string | null;
  created_at: string;
}
interface Manufacturer { id: number; name: string; }

export default function GenericMedicines() {
  const { hasPermission } = useAuthStore();
  const toast = useToast();
  const [items, setItems] = useState<GenericMedicine[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<GenericMedicine | null>(null);
  const [form, setForm] = useState({ generic_name: '', brand_name: '', manufacturer_id: '', category: '', description: '' });
  const canManage = hasPermission('manage_users');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [genRes, manRes] = await Promise.all([
          window.electronAPI.listGenericMedicines(),
          window.electronAPI.listManufacturers(),
        ]);
        if (genRes.success) setItems(genRes.medicines || []);
        if (manRes.success) setManufacturers(manRes.manufacturers || []);
      }
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!window.electronAPI || !canManage) return;
    const data = { ...form, manufacturer_id: form.manufacturer_id ? parseInt(form.manufacturer_id) : null };
    const result = editing
      ? await window.electronAPI.updateGenericMedicine({ ...data, id: editing.id })
      : await window.electronAPI.createGenericMedicine(data);
    if (result.success) {
      toast.success(editing ? 'Updated' : 'Created', `${form.generic_name} - ${form.brand_name}`);
      await loadData();
      setShowDialog(false); setEditing(null);
      setForm({ generic_name: '', brand_name: '', manufacturer_id: '', category: '', description: '' });
    } else {
      toast.error('Error', result.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.electronAPI || !canManage) return;
    const result = await window.electronAPI.deleteGenericMedicine({ id });
    if (result.success) { toast.success('Deleted', 'Generic medicine removed.'); await loadData(); }
    else toast.error('Error', result.error || 'Delete failed');
  };

  const filtered = items.filter(i =>
    i.generic_name.toLowerCase().includes(search.toLowerCase()) ||
    i.brand_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Generic Medicines</h2>
          <p className="text-sm text-gray-500 mt-1">Map generic names to brand names</p>
        </div>
        {canManage && <Button onClick={() => { setEditing(null); setForm({ generic_name: '', brand_name: '', manufacturer_id: '', category: '', description: '' }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Generic</Button>}
      </div>
      <Card variant="bordered"><CardContent className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search generics..." className="pl-10 h-11" />
        </div>
      </CardContent></Card>

      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div> : filtered.length === 0 ? (
        <Card variant="bordered"><CardContent className="p-12 text-center"><FlaskRound className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No generic medicines found</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(item => (
            <Card key={item.id} variant="bordered" className="hover:shadow-medium transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{item.generic_name}</h3>
                      <Badge variant="outline-teal" size="sm">{item.brand_name}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.manufacturer_name && <span className="mr-2">Mfr: {item.manufacturer_name}</span>}
                      {item.category && <Badge variant="outline" size="sm">{item.category}</Badge>}
                    </p>
                    {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(item); setForm({ generic_name: item.generic_name, brand_name: item.brand_name, manufacturer_id: String(item.manufacturer_id || ''), category: item.category || '', description: item.description || '' }); setShowDialog(true); }} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Generic Medicine</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label htmlFor="generic-name" className="block text-sm font-medium text-gray-700 mb-1">Generic Name *</label><Input id="generic-name" value={form.generic_name} onChange={e => setForm({...form, generic_name: e.target.value})} required className="h-11" /></div>
            <div><label htmlFor="brand-name" className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label><Input id="brand-name" value={form.brand_name} onChange={e => setForm({...form, brand_name: e.target.value})} required className="h-11" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <Select value={form.manufacturer_id} onValueChange={v => setForm({...form, manufacturer_id: v})}>
                <SelectItem value="">Select manufacturer...</SelectItem>
                {manufacturers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
              </Select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectItem value="">Select category...</SelectItem>
                <SelectItem value="analgesic">Analgesic</SelectItem>
                <SelectItem value="antibiotic">Antibiotic</SelectItem>
                <SelectItem value="antihypertensive">Antihypertensive</SelectItem>
                <SelectItem value="antidiabetic">Antidiabetic</SelectItem>
                <SelectItem value="vitamin">Vitamin</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </Select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" disabled={!form.generic_name.trim() || !form.brand_name.trim()}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}