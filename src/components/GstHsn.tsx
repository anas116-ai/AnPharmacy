import { useEffect, useState } from 'react';
import { Receipt, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useToast } from '../hooks/useToast';
interface HSNCode { id: number; hsn_code: string; description: string | null; gst_rate: number; cess_rate: number; created_at: string; }
export default function GstHsn() {
  const toast = useToast();
  const [items, setItems] = useState<HSNCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<HSNCode | null>(null);
  const [form, setForm] = useState({ hsn_code: '', description: '', gst_rate: '18', cess_rate: '0' });
  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { if (window.electronAPI) { const res = await window.electronAPI.listHSNCodes(); if (res.success) setItems(res.hsnCodes || []); } } catch (error) { console.error(error); } finally { setIsLoading(false); } };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const data = { hsn_code: form.hsn_code, description: form.description || null, gst_rate: parseFloat(form.gst_rate) || 0, cess_rate: parseFloat(form.cess_rate) || 0 };
    const result = editing ? await window.electronAPI.updateHSNCode({ ...data, id: editing.id }) : await window.electronAPI.createHSNCode(data);
    if (result.success) { toast.success(editing ? 'Updated' : 'Created', `HSN ${form.hsn_code}`); await loadData(); setShowDialog(false); setEditing(null); setForm({ hsn_code: '', description: '', gst_rate: '18', cess_rate: '0' }); }
    else toast.error('Error', result.error || 'Operation failed');
  };
  const handleDelete = async (id: number) => { if (!window.electronAPI) return; const res = await window.electronAPI.deleteHSNCode({ id }); if (res.success) { toast.success('Deleted', 'HSN code removed.'); await loadData(); } else toast.error('Error', res.error || 'Delete failed'); };
  const filtered = items.filter(h => h.hsn_code.includes(search) || h.description?.toLowerCase().includes(search.toLowerCase()));
  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-900">GST & HSN Codes</h2><p className="text-sm text-gray-500 mt-1">Manage HSN codes and GST rates</p></div>
      <Button onClick={() => { setEditing(null); setForm({ hsn_code: '', description: '', gst_rate: '18', cess_rate: '0' }); setShowDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add HSN Code</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HSN codes..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (<Card variant="bordered"><CardContent className="p-12 text-center"><Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No HSN codes</p></CardContent></Card>)
    : (<div className="space-y-2">{filtered.map(hsn => (<Card key={hsn.id} variant="bordered"><CardContent className="p-4 flex items-center justify-between">
      <div><div className="flex items-center gap-2"><span className="font-mono font-bold text-sm">{hsn.hsn_code}</span><Badge variant={hsn.gst_rate >= 18 ? 'warning' : 'safe'} size="sm">{hsn.gst_rate}% GST</Badge>{hsn.cess_rate > 0 && <Badge variant="outline" size="sm">Cess: {hsn.cess_rate}%</Badge>}</div>
        {hsn.description && <p className="text-xs text-gray-500 mt-0.5">{hsn.description}</p>}</div>
      <div className="flex gap-1"><button onClick={() => { setEditing(hsn); setForm({ hsn_code: hsn.hsn_code, description: hsn.description || '', gst_rate: String(hsn.gst_rate), cess_rate: String(hsn.cess_rate) }); setShowDialog(true); }} className="p-1.5 rounded hover:bg-gray-100"><Edit className="w-3.5 h-3.5 text-gray-400" /></button>
        <button onClick={() => handleDelete(hsn.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div>
    </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
      <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} HSN Code</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="hsn-code" className="block text-sm font-medium text-gray-700 mb-1">HSN Code *</label><Input id="hsn-code" value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} required className="h-11" /></div>
            <div><label htmlFor="gst-rate" className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%) *</label><Input id="gst-rate" type="number" value={form.gst_rate} onChange={e => setForm({...form, gst_rate: e.target.value})} required className="h-11" /></div></div>
          <div><label htmlFor="cess-rate" className="block text-sm font-medium text-gray-700 mb-1">Cess Rate (%)</label><Input id="cess-rate" type="number" value={form.cess_rate} onChange={e => setForm({...form, cess_rate: e.target.value})} className="h-11" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={!form.hsn_code.trim() || !form.gst_rate}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}