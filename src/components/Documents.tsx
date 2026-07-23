import { useEffect, useState } from 'react';
import { FolderOpen, Plus, Search, Trash2, File, FileText, Image } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/utils';

interface Document { id: number; title: string; description: string | null; file_path: string; file_type: string | null; file_size: number | null; category: string | null; tags: string | null; uploaded_by: number | null; uploaded_by_name?: string; created_at: string; }

export default function Documents() {
  const toast = useToast();
  const [items, setItems] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', tags: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { if (window.electronAPI) { const res = await window.electronAPI.listDocuments(); if (res.success) setItems(res.documents || []); } } catch (error) { console.error(error); } finally { setIsLoading(false); } };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!window.electronAPI) return;
    const fileResult = await window.electronAPI.openFileDialog();
    if (!fileResult || fileResult.canceled || !fileResult.filePath) { toast.error('Error', 'Please select a file'); return; }
    const data = { ...form, file_path: fileResult.filePath, file_type: fileResult.filePath.split('.').pop() || null, uploaded_by: 1 };
    const result = await window.electronAPI.uploadDocument(data);
    if (result.success) { toast.success('Uploaded', 'Document added.'); await loadData(); setShowDialog(false); setForm({ title: '', description: '', category: '', tags: '' }); }
    else toast.error('Error', result.error || 'Upload failed');
  };

  const handleDelete = async (id: number) => { if (!window.electronAPI) return; const res = await window.electronAPI.deleteDocument(id); if (res.success) { toast.success('Deleted', 'Document removed.'); await loadData(); } else toast.error('Error', res.error || 'Delete failed'); };

  const getFileIcon = (type: string | null) => { if (!type) return <File className="w-4 h-4" />; if (['png','jpg','jpeg','gif','webp'].includes(type)) return <Image className="w-4 h-4" />; return <FileText className="w-4 h-4" />; };
  const filtered = items.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || d.category?.toLowerCase().includes(search.toLowerCase()));

  return (<div className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-900">Documents</h2><p className="text-sm text-gray-500 mt-1">Centralized document storage</p></div>
      <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Upload Document</Button></div>
    <Card variant="bordered"><CardContent className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="pl-10 h-11" /></div></CardContent></Card>
    {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : filtered.length === 0 ? (<Card variant="bordered"><CardContent className="p-12 text-center"><FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No documents</p></CardContent></Card>)
    : (<div className="space-y-2">{filtered.map(doc => (<Card key={doc.id} variant="bordered"><CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">{getFileIcon(doc.file_type)}</div>
        <div className="min-w-0"><p className="font-semibold text-sm text-gray-900 truncate">{doc.title}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">{doc.category && <Badge variant="outline" size="sm">{doc.category}</Badge>}{doc.file_type && <span>.{doc.file_type}</span>}<span>{formatDate(doc.created_at)}</span></div></div></div>
      <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded hover:bg-red-50 flex-shrink-0"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
    </CardContent></Card>))}</div>)}
    <Dialog open={showDialog} onOpenChange={o => { if (!o) setShowDialog(false); }}>
      <DialogContent><DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="doc-title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label><Input id="doc-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="h-11" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full h-11 rounded-xl border border-gray-200 bg-white/80 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"><option value="">Select...</option><option value="Invoice">Invoice</option><option value="License">License</option><option value="Report">Report</option><option value="Contract">Contract</option><option value="Other">Other</option></select></div>
            <div><label htmlFor="doc-tags" className="block text-sm font-medium text-gray-700 mb-1">Tags</label><Input id="doc-tags" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="comma,separated" className="h-11" /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button type="submit" disabled={!form.title.trim()}>Upload & Select File</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>);
}