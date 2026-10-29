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

  // Supplier Payables & Payment Ledger
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');

  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerBalance, setLedgerBalance] = useState(0);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  const openLedger = async (supplier: Supplier) => {
    setLedgerSupplier(supplier);
    setIsLoadingLedger(true);
    setShowMenu(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.getSupplierLedger({ supplierId: supplier.id });
        if (res.success) {
          setLedgerEntries(res.ledger || []);
          setLedgerBalance(res.currentBalance ?? supplier.current_balance ?? 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const openPaymentModal = (supplier: Supplier) => {
    setPayingSupplier(supplier);
    setPaymentAmount(supplier.current_balance && supplier.current_balance > 0 ? String(supplier.current_balance) : '');
    setPaymentMethod('bank_transfer');
    setPaymentRef('');
    setPaymentNotes('');
    setPaymentError('');
    setPaymentSuccess('');
    setShowMenu(null);
  };

  const handleRecordPayment = async () => {
    if (!payingSupplier) return;
    const num = parseFloat(paymentAmount);
    if (!num || num <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero');
      return;
    }
    setIsRecordingPayment(true);
    setPaymentError('');
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.addSupplierPayment({
          supplierId: payingSupplier.id,
          amount: num,
          paymentMethod,
          referenceId: paymentRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        });
        if (res.success) {
          setPaymentSuccess(`₹${num.toFixed(2)} payment recorded for ${payingSupplier.name}`);
          refreshSuppliers();
          setTimeout(() => {
            setPayingSupplier(null);
            setPaymentSuccess('');
          }, 1500);
        } else {
          setPaymentError(res.error || 'Failed to record payment');
        }
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment submission failed');
    } finally {
      setIsRecordingPayment(false);
    }
  };

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
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">Suppliers</h2>
            <p className="text-xs text-muted-foreground">{suppliers.length} suppliers registered</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* Analytics Toggle */}
      {analytics.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">Supplier Performance Analytics</span>
              <span className="text-[10px] text-muted-foreground font-medium">({analytics.length} suppliers)</span>
            </div>
            {showAnalytics ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showAnalytics && (
            <div className="px-5 pb-5 space-y-3 animate-fade-in">
              {isLoadingAnalytics ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
                      <p className="text-[9px] font-semibold text-accent uppercase">Total Batches</p>
                      <p className="text-lg font-bold text-accent">{analytics.reduce((s: number, a: any) => s + a.batchesCount, 0)}</p>
                    </div>
                    <div className="p-3 bg-success-light rounded-xl border border-success/20">
                      <p className="text-[9px] font-semibold text-success uppercase">Unique Meds</p>
                      <p className="text-lg font-bold text-success">{analytics.reduce((s: number, a: any) => s + a.uniqueMedicines, 0)}</p>
                    </div>
                    <div className="p-3 bg-warning-light rounded-xl border border-warning/20">
                      <p className="text-[9px] font-semibold text-warning uppercase">Total Stock</p>
                      <p className="text-lg font-bold text-warning">{analytics.reduce((s: number, a: any) => s + a.totalStock, 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                      <p className="text-[9px] font-semibold text-destructive uppercase">Near Expiry</p>
                      <p className="text-lg font-bold text-destructive">{analytics.reduce((s: number, a: any) => s + a.nearExpiry, 0)}</p>
                    </div>
                  </div>

                  {/* Per-supplier analytics table */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/70 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-foreground">Supplier</th>
                            <th className="px-3 py-2 text-center font-semibold text-foreground">Batches</th>
                            <th className="px-3 py-2 text-center font-semibold text-foreground">Unique</th>
                            <th className="px-3 py-2 text-right font-semibold text-foreground">Total Stock</th>
                            <th className="px-3 py-2 text-right font-semibold text-foreground">Avg Price</th>
                            <th className="px-3 py-2 text-right font-semibold text-foreground">Stock Value</th>
                            <th className="px-3 py-2 text-center font-semibold text-foreground">Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {analytics.map((a: any, idx: number) => (
                            <tr key={a.supplierId} className="hover:bg-muted/40 transition-colors">
                              <td className="px-3 py-2.5">
                                <span className="font-medium text-foreground">{a.supplierName}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{a.batchesCount}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{a.uniqueMedicines}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">{a.totalStock.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCurrency(a.avgPurchasePrice)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-accent">{formatCurrency(a.totalValue)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={cn(
                                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium',
                                  a.nearExpiry > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success-light text-success'
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="supplier-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, contact, phone, or GSTIN..."
          className="pl-10 h-11 rounded-xl bg-muted/40 border-border focus:bg-background"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Suppliers List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
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
            <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">
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
              className="bg-card rounded-2xl border border-border shadow-sm p-4 hover:border-accent/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br shadow-sm',
                    'from-primary to-primary-dark'
                  )}>
                    {getInitials(supplier.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{supplier.name}</span>
                      <Badge size="sm" className="bg-accent/10 text-accent">
                        {medicineCounts[supplier.id] || 0} medicines
                      </Badge>
                      {(supplier.current_balance ?? 0) > 0 ? (
                        <Badge size="sm" className="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold font-mono">
                          Payable: ₹{(supplier.current_balance ?? 0).toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge size="sm" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Cleared
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                      {supplier.contact_person && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {supplier.contact_person}
                        </span>
                      )}
                      {supplier.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {supplier.phone}
                        </span>
                      )}
                      {supplier.gstin && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3 h-3" /> GSTIN: {supplier.gstin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPaymentModal(supplier)}
                    className="h-8 px-2.5 text-xs gap-1 border-accent/40 text-accent hover:bg-accent/10 font-semibold"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    Pay
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openLedger(supplier)}
                    className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:bg-muted"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Ledger
                  </Button>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === supplier.id ? null : supplier.id); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {showMenu === supplier.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-popover rounded-xl border border-border shadow-lg z-10 py-1 animate-fade-in overflow-hidden">
                        <button
                          onClick={() => openPaymentModal(supplier)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2.5 text-accent transition-colors"
                        >
                          <IndianRupee className="w-4 h-4 text-accent" /> Record Payment
                        </button>
                        <button
                          onClick={() => openLedger(supplier)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2.5 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground" /> View Ledger
                        </button>
                        <button
                          onClick={() => openEditDialog(supplier)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2.5 transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-accent" /> Edit
                        </button>
                        <button
                          onClick={() => { setShowMedicines(supplier); setShowMenu(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2.5 transition-colors"
                        >
                          <Building2 className="w-4 h-4 text-muted-foreground" /> View Medicines
                        </button>
                        <button
                          onClick={() => { setShowConfirmDelete(supplier); setShowMenu(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-destructive/10 flex items-center gap-2.5 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
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
              <Building2 className="w-5 h-5 text-accent" />
              {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
            </DialogTitle>
            <DialogClose onClick={() => setShowDialog(false)} />
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label htmlFor="sup-name" className="block text-sm font-medium text-foreground/80 mb-1.5">
                Supplier Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="sup-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ABC Pharma Pvt Ltd"
              />
            </div>
            <div>
              <label htmlFor="sup-contact" className="block text-sm font-medium text-foreground/80 mb-1.5">Contact Person</label>
              <Input
                id="sup-contact"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sup-phone" className="block text-sm font-medium text-foreground/80 mb-1.5">Phone</label>
                <Input
                  id="sup-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., +91 98765 43210"
                />
              </div>
              <div>
                <label htmlFor="sup-email" className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
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
              <label htmlFor="sup-address" className="block text-sm font-medium text-foreground/80 mb-1.5">Address</label>
              <Input
                id="sup-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div>
              <label htmlFor="sup-gstin" className="block text-sm font-medium text-foreground/80 mb-1.5">GSTIN</label>
              <Input
                id="sup-gstin"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="15-character GSTIN"
                maxLength={15}
              />
            </div>
            <div>
              <label htmlFor="sup-notes" className="block text-sm font-medium text-foreground/80 mb-1.5">Notes</label>
              <textarea
                id="sup-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="flex w-full rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent focus:bg-background"
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
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Supplier
            </DialogTitle>
            <DialogClose onClick={() => setShowConfirmDelete(null)} />
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-sm text-destructive">
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
              <Building2 className="w-5 h-5 text-accent" />
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
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No medicines linked to this supplier</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicinesList.map((med: any) => (
                  <div key={med.id} className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{med.name}</p>
                      <p className="text-xs text-muted-foreground">Batch: {med.batch_number} · Qty: {med.quantity}</p>
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

      {/* Record Supplier Payment Dialog */}
      <Dialog open={payingSupplier !== null} onOpenChange={(o) => !o && setPayingSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-accent" />
              Pay Supplier: {payingSupplier?.name}
            </DialogTitle>
            <DialogClose onClick={() => setPayingSupplier(null)} />
          </DialogHeader>

          <div className="space-y-4">
            {/* Outstanding Balance Banner */}
            <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Outstanding Balance</p>
                <p className="text-lg font-bold text-foreground font-mono">
                  ₹{(payingSupplier?.current_balance ?? 0).toLocaleString()}
                </p>
              </div>
              {(payingSupplier?.current_balance ?? 0) > 0 && (
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPaymentAmount(String(payingSupplier?.current_balance ?? 0))}
                    className="text-xs h-7 px-2"
                  >
                    Full Due
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPaymentAmount(String(Math.round(((payingSupplier?.current_balance ?? 0) / 2) * 100) / 100))}
                    className="text-xs h-7 px-2"
                  >
                    50%
                  </Button>
                </div>
              )}
            </div>

            {paymentSuccess && (
              <div className="bg-success-light border border-success/30 text-success text-xs rounded-xl p-3 font-medium">
                {paymentSuccess}
              </div>
            )}
            {paymentError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3">
                {paymentError}
              </div>
            )}

            <div>
              <label htmlFor="pay-amount" className="block text-xs font-semibold text-foreground/80 mb-1">
                Payment Amount (₹) <span className="text-destructive">*</span>
              </label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono text-base font-bold"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI / QR</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label htmlFor="pay-ref" className="block text-xs font-semibold text-foreground/80 mb-1">Reference / UTR / Cheque #</label>
                <Input
                  id="pay-ref"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g., UTR12345678"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pay-notes" className="block text-xs font-semibold text-foreground/80 mb-1">Payment Notes / Remark</label>
              <Input
                id="pay-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional remark or invoice settlement note"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPayingSupplier(null)} disabled={isRecordingPayment}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} loading={isRecordingPayment} className="gap-1.5">
              <IndianRupee className="w-4 h-4" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Ledger Dialog */}
      <Dialog open={ledgerSupplier !== null} onOpenChange={(o) => !o && setLedgerSupplier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Payables Ledger: {ledgerSupplier?.name}
            </DialogTitle>
            <DialogClose onClick={() => setLedgerSupplier(null)} />
          </DialogHeader>

          <div className="space-y-4">
            {/* Balance Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card border border-border rounded-xl">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Current Net Payable</p>
                <p className="text-xl font-bold font-mono text-accent">
                  ₹{ledgerBalance.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-card border border-border rounded-xl">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Transactions</p>
                <p className="text-xl font-bold font-mono text-foreground">
                  {ledgerEntries.length}
                </p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {isLoadingLedger ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  No transactions recorded yet for this supplier.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/70 sticky top-0 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Ref / Mode</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Notes</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">
                          {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                            entry.transaction_type === 'purchase'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-emerald-500/10 text-emerald-600'
                          )}>
                            {entry.transaction_type === 'purchase' ? 'Bill / Invoice' : 'Payment'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground text-[11px]">
                          {entry.reference_id || entry.payment_method || '-'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-[11px] truncate max-w-xs">
                          {entry.notes || '-'}
                        </td>
                        <td className={cn(
                          'px-3 py-2 text-right font-mono font-bold',
                          entry.transaction_type === 'purchase' ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          {entry.transaction_type === 'purchase' ? '+' : '-'}₹{(entry.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (ledgerSupplier) {
                  openPaymentModal(ledgerSupplier);
                  setLedgerSupplier(null);
                }
              }}
              className="gap-1 text-accent border-accent/40 hover:bg-accent/10"
            >
              <IndianRupee className="w-3.5 h-3.5" /> Record Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLedgerSupplier(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
