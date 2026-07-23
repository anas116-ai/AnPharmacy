import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Building2, MoreVertical, Edit3, Trash2, Phone, FileText, X, Package, AlertTriangle, IndianRupee, TrendingUp, BarChart3, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { useSupplierStore } from '../stores/supplierStore';
import { Supplier } from '../lib/types';
import { formatCurrency, cn, getStatusColor } from '../lib/utils';

interface SupplierFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  drug_license_no: string;
  transporter_name: string;
  vehicle_number: string;
  notes: string;
}

export default function Suppliers() {
  const { t } = useTranslation();
  const { suppliers, isLoading, error, refreshSuppliers, addSupplier, updateSupplier, deleteSupplier } = useSupplierStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Supplier | null>(null);
  const [showMedicines, setShowMedicines] = useState<Supplier | null>(null);
  const [medicineCounts, setMedicineCounts] = useState<Record<number, number>>({});
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    drug_license_no: '',
    transporter_name: '',
    vehicle_number: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState<number | null>(null);
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (showMedicines && window.electronAPI) {
      setIsLoadingMedicines(true);
      window.electronAPI.getSupplierMedicines({ supplierId: showMedicines.id }).then((result) => {
        if (result.success) {
          setMedicinesList(result.medicines || []);
        } else {
          setMedicinesList([]);
        }
        setIsLoadingMedicines(false);
      }).catch(() => setIsLoadingMedicines(false));
    }
  }, [showMedicines]);

  useEffect(() => {
    refreshSuppliers();
    loadAnalytics();
    const handleClickOutside = () => setShowMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [refreshSuppliers]);

  const loadAnalytics = async () => {
    if (!window.electronAPI) return;
    setIsLoadingAnalytics(true);
    try {
      const result = await window.electronAPI.getSupplierAnalytics();
      if (result.success) setAnalytics(result.analytics || []);
    } catch {}
    setIsLoadingAnalytics(false);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.phone && s.phone.includes(searchQuery)) ||
    (s.gstin && s.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const fetchMedicineCounts = useCallback(async () => {
    if (!window.electronAPI) return;
    const counts: Record<number, number> = {};
    for (const supplier of suppliers) {
      try {
        const result = await window.electronAPI.getSupplierMedicines({ supplierId: supplier.id });
        if (result.success) {
          counts[supplier.id] = (result.medicines || []).length;
        }
      } catch {
        counts[supplier.id] = 0;
      }
    }
    setMedicineCounts(counts);
  }, [suppliers]);

  useEffect(() => {
    if (suppliers.length > 0) {
      fetchMedicineCounts();
    }
  }, [suppliers.length, fetchMedicineCounts]);

  const openAddDialog = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', gstin: '', drug_license_no: '', transporter_name: '', vehicle_number: '', notes: '' });
    setFormError('');
    setShowDialog(true);
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
    address: supplier.address || '',
    gstin: supplier.gstin || '',
    drug_license_no: supplier.drug_license_no || '',
    transporter_name: supplier.transporter_name || '',
    vehicle_number: supplier.vehicle_number || '',
    notes: supplier.notes || '',
    });
    setFormError('');
    setShowDialog(true);
    setShowMenu(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Supplier name is required');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    if (formData.gstin && !/^[0-9A-Z]{15}$/.test(formData.gstin)) {
      setFormError('GSTIN must be 15 characters (alphanumeric)');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
      } else {
        await addSupplier(formData);
      }
      setShowDialog(false);
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (showConfirmDelete) {
      await deleteSupplier(showConfirmDelete.id);
      setShowConfirmDelete(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Suppliers</h2>
            <p className="text-xs text-gray-500">{suppliers.length} suppliers registered</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* Analytics Toggle */}
      {analytics.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-soft">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-slate-800">Supplier Performance Analytics</span>
              <span className="text-[10px] text-slate-400 font-medium">({analytics.length} suppliers)</span>
            </div>
            {showAnalytics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showAnalytics && (
            <div className="px-5 pb-5 space-y-3 animate-fade-in">
              {isLoadingAnalytics ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <p className="text-[9px] font-semibold text-indigo-600 uppercase">Total Batches</p>
                      <p className="text-lg font-bold text-indigo-700">{analytics.reduce((s: number, a: any) => s + a.batchesCount, 0)}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                      <p className="text-[9px] font-semibold text-emerald-600 uppercase">Unique Meds</p>
                      <p className="text-lg font-bold text-emerald-700">{analytics.reduce((s: number, a: any) => s + a.uniqueMedicines, 0)}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                      <p className="text-[9px] font-semibold text-amber-600 uppercase">Total Stock</p>
                      <p className="text-lg font-bold text-amber-700">{analytics.reduce((s: number, a: any) => s + a.totalStock, 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
                      <p className="text-[9px] font-semibold text-red-600 uppercase">Near Expiry</p>
                      <p className="text-lg font-bold text-red-700">{analytics.reduce((s: number, a: any) => s + a.nearExpiry, 0)}</p>
                    </div>
                  </div>

                  {/* Per-supplier analytics table */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">Supplier</th>
                            <th className="px-3 py-2 text-center font-semibold text-slate-600">Batches</th>
                            <th className="px-3 py-2 text-center font-semibold text-slate-600">Unique</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Total Stock</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Avg Price</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-600">Stock Value</th>
                            <th className="px-3 py-2 text-center font-semibold text-slate-600">⚠️ Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {analytics.map((a: any, idx: number) => (
                            <tr key={a.supplierId} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="px-3 py-2.5">
                                <span className="font-medium text-slate-800">{a.supplierName}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono text-slate-600">{a.batchesCount}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-slate-600">{a.uniqueMedicines}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">{a.totalStock.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-600">{formatCurrency(a.avgPurchasePrice)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">{formatCurrency(a.totalValue)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={cn(
                                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium',
                                  a.nearExpiry > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                )}>
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  {a.nearExpiry}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <label htmlFor="supplier-search" className="sr-only">Search suppliers</label>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          id="supplier-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, contact, phone, or GSTIN..."
          className="pl-10 h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Suppliers List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="skeleton w-11 h-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium">
              {searchQuery ? 'No suppliers match your search' : 'No suppliers registered yet'}
            </p>
            {!searchQuery && (
              <Button onClick={openAddDialog} variant="outline" className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" />
                Add First Supplier
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSuppliers.map(supplier => (
            <div
              key={supplier.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-soft p-4 hover:border-teal-200 hover:shadow-medium transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br shadow-sm',
                    'from-teal-500 to-teal-600'
                  )}>
                    {getInitials(supplier.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{supplier.name}</span>
                      <Badge size="sm" className="bg-teal-50 text-teal-700">
                        {medicineCounts[supplier.id] || 0} medicines
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                      {supplier.contact_person && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          {supplier.contact_person}
                        </span>
                      )}
                      {supplier.phone && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {supplier.phone}
                        </span>
                      )}
                      {supplier.gstin && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> GSTIN: {supplier.gstin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === supplier.id ? null : supplier.id); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                  {showMenu === supplier.id && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-gray-100 shadow-strong z-10 py-1 animate-fade-in overflow-hidden">
                      <button
                        onClick={() => openEditDialog(supplier)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-teal-600" /> Edit
                      </button>
                      <button
                        onClick={() => { setShowMedicines(supplier); setShowMenu(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-gray-600" /> View Medicines
                      </button>
                      <button
                        onClick={() => { setShowConfirmDelete(supplier); setShowMenu(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 flex items-center gap-2.5 text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
            </DialogTitle>
            <DialogClose onClick={() => setShowDialog(false)} />
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label htmlFor="sup-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="sup-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ABC Pharma Pvt Ltd"
              />
            </div>
            <div>
              <label htmlFor="sup-contact" className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
              <Input
                id="sup-contact"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sup-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <Input
                  id="sup-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., +91 98765 43210"
                />
              </div>
              <div>
                <label htmlFor="sup-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <Input
                  id="sup-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., info@abcpharma.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="sup-address" className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <Input
                id="sup-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div>
              <label htmlFor="sup-gstin" className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN</label>
              <Input
                id="sup-gstin"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="15-character GSTIN"
                maxLength={15}
              />
            </div>
            <div>
              <label htmlFor="sup-notes" className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                id="sup-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="flex w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white"
                rows={3}
              />
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                <X className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingSupplier ? 'Update' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showConfirmDelete !== null} onOpenChange={(o) => !o && setShowConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Supplier
            </DialogTitle>
            <DialogClose onClick={() => setShowConfirmDelete(null)} />
          </DialogHeader>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-sm text-red-700">
              Are you sure you want to delete <strong>{showConfirmDelete?.name}</strong>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} loading={isSubmitting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Medicines Dialog */}
      <Dialog open={showMedicines !== null} onOpenChange={(o) => !o && setShowMedicines(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              Medicines from {showMedicines?.name}
            </DialogTitle>
            <DialogClose onClick={() => setShowMedicines(null)} />
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            {isLoadingMedicines ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton h-12 rounded-xl" />
                ))}
              </div>
            ) : medicinesList.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No medicines linked to this supplier</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicinesList.map((med: any) => (
                  <div key={med.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.name}</p>
                      <p className="text-xs text-gray-500">Batch: {med.batch_number} · Qty: {med.quantity}</p>
                    </div>
                    <Badge size="sm" className={getStatusColor(med.status || 'safe')}>
                      {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
