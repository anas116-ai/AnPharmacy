import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Plus, Package, Search, Barcode, AlertTriangle, CheckCircle2, FileText, Upload, DollarSign, Calculator, Building2, Calendar, Box, Shield, Thermometer, BadgePercent, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { useToast } from '../hooks/useToast';
import { formatCurrency, cn } from '../lib/utils';

interface Supplier { id: number; name: string; gstin: string | null; drug_license_no: string | null; address: string | null; }
interface MedicineBatch { id: number; name: string; batch_number: string; company: string | null; pack_size: string | null; supplier_id: number | null; }

// ── SectionHeader: standalone component (defined outside AddStock for perf) ──
// Receives isOpen and onToggle as props instead of relying on parent closure
function SectionHeader({ 
  title, subtitle, icon: Icon, isOpen, onToggle, color 
}: { 
  title: string; subtitle: string; icon: any; isOpen: boolean; onToggle: () => void; color: string 
}) {
  const [letter, name] = (() => {
    const m = title.match(/^SECTION (\w+):\s*(.*)$/i);
    return m ? [m[1], m[2]] : ['', title];
  })();
  return (
    <div
      onClick={onToggle}
      className="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200 bg-card border border-border hover:border-accent/40 hover:shadow-md"
    >
      <div className="flex items-center gap-3 min-w-0">
        {letter && (
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} border border-border flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <span className="text-sm font-bold text-navy-800">{letter}</span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground font-display truncate">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-accent" />
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>
    </div>
  );
}

import { DOSAGE_FORMS } from '../lib/types';

const initialForm = {
  name: '', strength: '', batch_number: '', pack_size: '', company: '',
  generic_name: '', manufacturer_id: '', item_code: '',
  dosage_form: 'Tablets',
  requires_prescription: false,
  shelf_life_days_after_opening: '',
  quantity: '', loose_quantity: '0',
  low_stock_alert: '20', max_stock_limit: '',
  rack_location: '', barcode: '',
  mrp: '', purchase_price: '', ptr: '', pts: '',
  retailer_margin_percent: '', selling_price: '',
  purchase_gst_percent: '5', sale_gst_percent: '12',
  min_margin_percent: '20', discount_percent: '',
  hsn_code: '3004', schedule_type: 'General',
  expiry_returnable: false, cold_chain: false,
  prescription_doc: '',
  mfg_date: '', expiry_date: '',
  supplier_id: '', supplier_name: '',
  invoice_no: '', invoice_date: '',
  po_number: '', order_date: '',
  payment_terms: '', due_date: '',
  dispatch_location: '',
  scheme_qty: '0', free_qty: '0', scheme_bonus_code: '',
  taxable_amount: '', cgst_amount: '', sgst_amount: '', igst_amount: '',
  eway_bill_no: '', num_cartons: '',
};

export default function AddStock() {
  const { user, hasPermission } = useAuthStore();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [manufacturers, setManufacturers] = useState<{id: number; name: string}[]>([]);
  const [recentBatches, setRecentBatches] = useState<MedicineBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [recentlyAddedName, setRecentlyAddedName] = useState('');
  const [showHSNLookup, setShowHSNLookup] = useState(false);
  const canAdd = hasPermission('add_stock');

  const [form, setForm] = useState({ ...initialForm });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Collapsible sections — simple boolean record (idiomatic React)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    A: true, B: true, C: true, D: true, E: true, F: true, G: true, H: true,
  });

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [s, r, m] = await Promise.all([
          window.electronAPI.listSuppliers(),
          window.electronAPI.listStock(),
          window.electronAPI.listManufacturers?.() || Promise.resolve({ success: true, manufacturers: [] })
        ]);
        if (s.success) setSuppliers(s.suppliers || []);
        if (r.success) setRecentBatches((r.medicines || []).slice(0, 10));
        if (m.success) setManufacturers(m.manufacturers || []);
      }
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  const suggestedSellingPrice = useMemo(() => {
    const mrp = parseFloat(form.mrp) || 0;
    const minMargin = parseFloat(form.min_margin_percent) || 20;
    if (mrp <= 0) return 0;
    return Math.round((mrp - mrp * (minMargin / 100)) * 100) / 100;
  }, [form.mrp, form.min_margin_percent]);

  const suggestedPTR = useMemo(() => {
    const mrp = parseFloat(form.mrp) || 0;
    const retailerMargin = parseFloat(form.retailer_margin_percent) || 20;
    if (mrp <= 0) return 0;
    return Math.round((mrp * (1 - retailerMargin / 100)) * 100) / 100;
  }, [form.mrp, form.retailer_margin_percent]);

  const marginPreview = useMemo(() => {
    const sp = parseFloat(form.selling_price) || 0;
    const pp = parseFloat(form.purchase_price) || 0;
    const inGst = pp * (parseFloat(form.purchase_gst_percent) / 100);
    const outGst = sp * (parseFloat(form.sale_gst_percent) / 100);
    const netGst = outGst - inGst;
    const realMargin = sp - pp - netGst;
    const marginPct = sp > 0 ? (realMargin / sp) * 100 : 0;
    const mrp = parseFloat(form.mrp) || 0;
    const ptr = parseFloat(form.ptr) || 0;
    const retailerMargin = mrp > 0 && ptr > 0 ? ((mrp - ptr) / mrp) * 100 : 0;
    return { realMargin, marginPct, inGst, outGst, netGst, retailerMargin };
  }, [form.selling_price, form.purchase_price, form.mrp, form.ptr, form.purchase_gst_percent, form.sale_gst_percent]);

  const generateBarcode = useCallback(() => {
    const barcode = `MED${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setForm(f => ({ ...f, barcode }));
  }, []);

  const validateForm = useCallback(() => {
    if (!form.name.trim()) return 'Medicine name is required';
    if (!form.batch_number.trim()) return 'Batch number is required';
    if (!form.expiry_date) return 'Expiry date is required';
    if (!form.company.trim()) return 'Company/Manufacturer name is required';
    const mrp = parseFloat(form.mrp) || 0;
    const sellingPrice = parseFloat(form.selling_price) || 0;
    if (mrp > 0 && sellingPrice > mrp) {
      return `Selling price (₹${sellingPrice}) cannot exceed MRP (₹${mrp}) - Legal compliance!`;
    }
    const purchasePrice = parseFloat(form.purchase_price) || 0;
    if (purchasePrice > 0 && sellingPrice > 0) {
      const margin = ((sellingPrice - purchasePrice) / sellingPrice) * 100;
      const minMargin = parseFloat(form.min_margin_percent) || 20;
      if (margin < minMargin) {
        return `Minimum margin is ${minMargin}%. Current margin: ${margin.toFixed(1)}%`;
      }
    }
    if (form.schedule_type === 'H1') {
      if (!form.barcode) return 'Barcode is mandatory for H1 schedule drugs';
      if (!form.prescription_doc) return 'Prescription/license document upload is mandatory for H1 schedule drugs';
    }
    return null;
  }, [form]);

  const resetForm = useCallback(() => {
    setForm({ ...initialForm });
    if (nameInputRef.current) nameInputRef.current.focus();
  }, []);

  const updateForm = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!window.electronAPI || !canAdd) return;
    const error = validateForm();
    if (error) { toast.error('Validation Error', error); return; }
    const effectiveUserId = user?.id || 1;
    const taxableAmt = parseFloat(form.taxable_amount) || (parseFloat(form.quantity) || 0) * (parseFloat(form.purchase_price) || 0);
    const gstRate = parseFloat(form.purchase_gst_percent) || 0;
    const autoCgst = form.cgst_amount ? parseFloat(form.cgst_amount) : (taxableAmt * gstRate / 200);
    const autoSgst = form.sgst_amount ? parseFloat(form.sgst_amount) : (taxableAmt * gstRate / 200);

    const medicine = {
      name: `${form.name}${form.strength ? ' ' + form.strength : ''}`.trim(),
      strength: form.strength || null,
      batchNumber: form.batch_number,
      packSize: form.pack_size || null,
      company: form.company,
      genericName: form.generic_name || null,
      manufacturerId: form.manufacturer_id ? parseInt(form.manufacturer_id) : null,
      quantity: parseInt(form.quantity) || 0,
      looseQuantity: parseInt(form.loose_quantity) || 0,
      mrp: form.mrp ? parseFloat(form.mrp) : null,
      purchasePrice: form.purchase_price ? parseFloat(form.purchase_price) : null,
      ptr: form.ptr ? parseFloat(form.ptr) : null,
      pts: form.pts ? parseFloat(form.pts) : null,
      retailerMarginPercent: form.retailer_margin_percent ? parseFloat(form.retailer_margin_percent) : null,
      sellingPrice: form.selling_price ? parseFloat(form.selling_price) : null,
      purchaseGstPercent: parseFloat(form.purchase_gst_percent),
      saleGstPercent: parseFloat(form.sale_gst_percent),
      hsnCode: form.hsn_code || null,
      scheduleType: form.schedule_type,
      barcode: form.barcode || null,
      rackLocation: form.rack_location || null,
      lowStockAlert: parseInt(form.low_stock_alert) || 20,
      maxStockLimit: form.max_stock_limit ? parseInt(form.max_stock_limit) : null,
      minMarginPercent: parseFloat(form.min_margin_percent) || 20,
      mfgDate: form.mfg_date || null,
      expiryDate: form.expiry_date,
      expiryReturnable: form.expiry_returnable,
      supplierId: form.supplier_id ? parseInt(form.supplier_id) : null,
      invoiceNo: form.invoice_no || null,
      invoiceDate: form.invoice_date || null,
      poNumber: form.po_number || null,
      orderDate: form.order_date || null,
      paymentTerms: form.payment_terms || null,
      dueDate: form.due_date || null,
      dispatchLocation: form.dispatch_location || null,
      itemCode: form.item_code || null,
      schemeQty: parseInt(form.scheme_qty) || 0,
      freeQty: parseInt(form.free_qty) || 0,
      schemeBonusCode: form.scheme_bonus_code || null,
      discountPercent: form.discount_percent ? parseFloat(form.discount_percent) : null,
      taxableAmount: taxableAmt,
      cgstAmount: autoCgst,
      sgstAmount: autoSgst,
      igstAmount: form.igst_amount ? parseFloat(form.igst_amount) : null,
      ewayBillNo: form.eway_bill_no || null,
      numCartons: form.num_cartons ? parseInt(form.num_cartons) : null,
      coldChain: form.cold_chain ? 1 : 0,
      dosageForm: form.dosage_form || 'Tablets',
      requiresPrescription: form.requires_prescription,
      shelfLifeDaysAfterOpening: form.shelf_life_days_after_opening ? parseInt(form.shelf_life_days_after_opening) : null,
      prescriptionDoc: form.prescription_doc || null,
    };

    const result = await window.electronAPI.addStock({ medicine, userId: effectiveUserId });
    if (result.success) {
      setRecentlyAddedName(medicine.name);
      toast.success('Stock Added', `${medicine.name} (Batch: ${form.batch_number}) added successfully.`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      resetForm();
      loadData();
    } else {
      toast.error('Error', result.error || 'Failed to add stock');
    }
  };

  const handleBatchClick = (batch: MedicineBatch) => {
    setForm(f => ({
      ...f,
      name: batch.name.replace(/\s+\d+mg.*$/i, '').trim(),
      batch_number: batch.batch_number,
      company: batch.company || '',
      pack_size: batch.pack_size || f.pack_size,
      supplier_id: batch.supplier_id ? String(batch.supplier_id) : f.supplier_id,
    }));
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return <div className="space-y-5"><div className="skeleton h-8 w-48" /><div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}</div></div>;
  }

  if (!canAdd) {
    return <div className="flex items-center justify-center h-64"><div className="text-center"><Shield className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" /><h3 className="text-lg font-semibold text-muted-foreground">Access Denied</h3><p className="text-sm text-muted-foreground/60 mt-1">You don't have permission to add stock.</p></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground font-display">Add Stock / Purchase Entry</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete pharmacy stock entry — scroll down to fill all sections</p>
        </div>
        <Button onClick={generateBarcode} variant="outline" size="sm" className="gap-2">
          <Barcode className="w-4 h-4" /> Generate Barcode
        </Button>
      </div>

      {/* Success Banner */}
      {showSuccess && (
        <Card className="border-success/40 bg-success-light">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="text-sm text-success font-medium">Stock added successfully!</p>
              <p className="text-xs text-success mt-0.5">{recentlyAddedName}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION A: Product Identification */}
        <Card variant="bordered">
          <SectionHeader title="SECTION A: Product Identification" subtitle="Medicine name, batch, pack size, manufacturer" icon={Package} isOpen={openSections['A']} onToggle={() => toggleSection('A')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['A'] && (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-med-name" className="block text-sm font-medium text-foreground mb-1">Medicine Name <span className="text-destructive">*</span></label>
                  <Input id="add-med-name" ref={nameInputRef} value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Paracetamol" required className="h-11" autoFocus />
                </div>
                <div>
                  <label htmlFor="add-strength" className="block text-sm font-medium text-foreground mb-1">Strength</label>
                  <Input id="add-strength" value={form.strength} onChange={e => updateForm('strength', e.target.value)} placeholder="e.g. 500mg" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-item-code" className="block text-sm font-medium text-foreground mb-1">Item Code / SKU</label>
                  <Input id="add-item-code" value={form.item_code} onChange={e => updateForm('item_code', e.target.value)} placeholder="Auto or assign" className="h-11 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-company" className="block text-sm font-medium text-foreground mb-1">Brand/Company <span className="text-destructive">*</span></label>
                  <Input id="add-company" value={form.company} onChange={e => updateForm('company', e.target.value)} placeholder="ABC Pharma" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-generic" className="block text-sm font-medium text-foreground mb-1">Generic Name</label>
                  <Input id="add-generic" value={form.generic_name} onChange={e => updateForm('generic_name', e.target.value)} placeholder="Paracetamol 500mg" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-manufacturer" className="block text-sm font-medium text-foreground mb-1">Manufacturer</label>
                  <Select id="add-manufacturer" value={form.manufacturer_id} onValueChange={v => updateForm('manufacturer_id', v)}>
                    <SelectItem value="">Select...</SelectItem>
                    {manufacturers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-batch" className="block text-sm font-medium text-foreground mb-1">Batch Number <span className="text-destructive">*</span></label>
                  <Input id="add-batch" value={form.batch_number} onChange={e => updateForm('batch_number', e.target.value)} placeholder="BATCH001 / AMXT784" required className="h-11 font-mono" />
                </div>
                <div>
                  <label htmlFor="add-pack-size" className="block text-sm font-medium text-foreground mb-1">Pack Size / Unit</label>
                  <Input id="add-pack-size" value={form.pack_size} onChange={e => updateForm('pack_size', e.target.value)} placeholder="10 Tab / 100ml / 1 Bottle" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label htmlFor="add-dosage-form" className="block text-sm font-medium text-foreground mb-1">
                    Dosage Form (12 Formats)
                  </label>
                  <Select id="add-dosage-form" value={form.dosage_form} onValueChange={v => updateForm('dosage_form', v)}>
                    {DOSAGE_FORMS.map(df => (
                      <SelectItem key={df} value={df}>{df}</SelectItem>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="add-shelf-life" className="block text-sm font-medium text-foreground mb-1">
                    Shelf Life After Opening (Days)
                  </label>
                  <Input
                    id="add-shelf-life"
                    type="number"
                    value={form.shelf_life_days_after_opening}
                    onChange={e => updateForm('shelf_life_days_after_opening', e.target.value)}
                    placeholder="e.g. 28 (Eye drops / Syrups)"
                    className="h-11"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.requires_prescription}
                      onChange={e => updateForm('requires_prescription', e.target.checked)}
                      className="w-4 h-4 rounded accent-[#14292E] cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-bold text-foreground">Requires Prescription (Rx)</span>
                      <p className="text-[11px] text-muted-foreground">Flag as Schedule H/H1/X drug</p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* SECTION B: Quantity & Stock */}
        <Card variant="bordered">
          <SectionHeader title="SECTION B: Quantity & Stock Management" subtitle="Qty received, loose qty, rack location, alerts" icon={Box} isOpen={openSections['B']} onToggle={() => toggleSection('B')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['B'] && (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-qty" className="block text-sm font-medium text-foreground mb-1">Quantity Received <span className="text-destructive">*</span></label>
                  <Input id="add-qty" type="number" min="0" value={form.quantity} onChange={e => updateForm('quantity', e.target.value)} placeholder="0" required className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-loose-qty" className="block text-sm font-medium text-foreground mb-1">Loose Quantity</label>
                  <Input id="add-loose-qty" type="number" min="0" value={form.loose_quantity} onChange={e => updateForm('loose_quantity', e.target.value)} placeholder="0" className="h-11" />
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Individual units</p>
                </div>
                <div>
                  <label htmlFor="add-rack" className="block text-sm font-medium text-foreground mb-1">Rack / Shelf / Location</label>
                  <Input id="add-rack" value={form.rack_location} onChange={e => updateForm('rack_location', e.target.value)} placeholder="A1-Row3 / Shelf-5" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-low-stock" className="block text-sm font-medium text-foreground mb-1">Low Stock Alert</label>
                  <Input id="add-low-stock" type="number" min="0" value={form.low_stock_alert} onChange={e => updateForm('low_stock_alert', e.target.value)} placeholder="20" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-max-stock" className="block text-sm font-medium text-foreground mb-1">Max Stock Limit</label>
                  <Input id="add-max-stock" type="number" min="0" value={form.max_stock_limit} onChange={e => updateForm('max_stock_limit', e.target.value)} placeholder="1000" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-barcode" className="block text-sm font-medium text-foreground mb-1">Barcode / EAN</label>
                  <div className="flex gap-2">
                    <Input id="add-barcode" ref={fileInputRef} value={form.barcode} onChange={e => updateForm('barcode', e.target.value)} placeholder="Auto or scan" className="h-11 font-mono flex-1" />
                    <Button type="button" variant="outline" size="sm" className="h-11" onClick={generateBarcode}>Generate</Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.cold_chain} onChange={e => updateForm('cold_chain', e.target.checked)} className="w-4 h-4 rounded text-accent" />
                  <span className="text-sm text-foreground/80"><Thermometer className="w-3.5 h-3.5 inline mr-1" />Cold Chain Storage (2°C to 8°C)</span>
                </label>
              </div>
            </CardContent>
          )}
        </Card>

        {/* SECTION C: Pricing & Margin */}
        <Card variant="bordered">
          <SectionHeader title="SECTION C: Pricing & Margin" subtitle="MRP, PTR, PTS, purchase price, selling price, discounts" icon={DollarSign} isOpen={openSections['C']} onToggle={() => toggleSection('C')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['C'] && (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-mrp" className="block text-sm font-medium text-foreground mb-1">MRP (₹) <span className="text-destructive">*</span></label>
                  <Input id="add-mrp" type="number" step="0.01" min="0" value={form.mrp} onChange={e => updateForm('mrp', e.target.value)} placeholder="100.00" required className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-pts" className="block text-sm font-medium text-foreground mb-1">PTS (Price to Stockist)</label>
                  <Input id="add-pts" type="number" step="0.01" min="0" value={form.pts} onChange={e => updateForm('pts', e.target.value)} placeholder="Unit cost" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-purchase-price" className="block text-sm font-medium text-foreground mb-1">Purchase Price (₹)</label>
                  <Input id="add-purchase-price" type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => updateForm('purchase_price', e.target.value)} placeholder="0.00" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-ptr" className="block text-sm font-medium text-foreground mb-1">PTR (Price to Retailer)</label>
                  <div className="flex gap-2">
                    <Input id="add-ptr" type="number" step="0.01" min="0" value={form.ptr} onChange={e => updateForm('ptr', e.target.value)} placeholder="Dealer rate" className="h-11 flex-1" />
                    {suggestedPTR > 0 && parseFloat(form.ptr) !== suggestedPTR && (
                      <Button type="button" variant="outline-teal" size="sm" className="h-11 text-xs whitespace-nowrap" onClick={() => updateForm('ptr', String(suggestedPTR))}>₹{suggestedPTR.toFixed(0)}</Button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="add-retailer-margin" className="block text-sm font-medium text-foreground mb-1">Retailer Margin %</label>
                  <Input id="add-retailer-margin" type="number" min="0" max="100" step="0.5" value={form.retailer_margin_percent} onChange={e => updateForm('retailer_margin_percent', e.target.value)} placeholder="20" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-selling-price" className="block text-sm font-medium text-foreground mb-1">Selling Price (₹)</label>
                  <div className="flex gap-2">
                    <Input id="add-selling-price" type="number" step="0.01" min="0" value={form.selling_price} onChange={e => updateForm('selling_price', e.target.value)} placeholder="0.00" className="h-11 flex-1" />
                    {suggestedSellingPrice > 0 && parseFloat(form.selling_price) !== suggestedSellingPrice && (
                      <Button type="button" variant="outline-teal" size="sm" className="h-11 text-xs whitespace-nowrap" onClick={() => updateForm('selling_price', String(suggestedSellingPrice))}>₹{suggestedSellingPrice.toFixed(0)}</Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-min-margin" className="block text-sm font-medium text-foreground mb-1">Min Margin %</label>
                  <Input id="add-min-margin" type="number" min="0" max="100" step="0.5" value={form.min_margin_percent} onChange={e => updateForm('min_margin_percent', e.target.value)} placeholder="20" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-discount" className="block text-sm font-medium text-foreground mb-1">Discount %</label>
                  <Input id="add-discount" type="number" min="0" max="100" step="0.5" value={form.discount_percent} onChange={e => updateForm('discount_percent', e.target.value)} placeholder="0" className="h-11" />
                </div>
              </div>
              {(parseFloat(form.selling_price) > 0 || parseFloat(form.purchase_price) > 0) && (
                <div className="p-3 bg-muted/50 border border-border rounded-xl space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Real Margin Preview</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Input GST:</span><span className="font-medium">₹{marginPreview.inGst.toFixed(2)}</span>
                    <span className="text-muted-foreground">Output GST:</span><span className="font-medium">₹{marginPreview.outGst.toFixed(2)}</span>
                    <span className="text-muted-foreground">Retailer Margin:</span><span className="text-accent font-medium">{marginPreview.retailerMargin.toFixed(1)}%</span>
                    <span className="font-semibold text-foreground/80 border-t border-border pt-1">Real Margin:</span>
                    <span className={`font-bold border-t border-border pt-1 ${marginPreview.realMargin >= 0 ? 'text-success' : 'text-destructive'}`}>₹{marginPreview.realMargin.toFixed(2)} ({marginPreview.marginPct.toFixed(1)}%)</span>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* SECTION D: Compliance */}
        <Card variant="bordered">
          <SectionHeader title="SECTION D: Compliance & Regulatory" subtitle="HSN code, schedule type, GST, barcode, license" icon={Shield} isOpen={openSections['D']} onToggle={() => toggleSection('D')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['D'] && (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-hsn" className="block text-sm font-medium text-foreground mb-1">HSN Code <span className="text-destructive">*</span></label>
                  <div className="flex gap-2">
                    <Input id="add-hsn" value={form.hsn_code} onChange={e => updateForm('hsn_code', e.target.value)} placeholder="3004" required className="h-11 font-mono flex-1" />
                    <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => setShowHSNLookup(true)}>Lookup</Button>
                  </div>
                </div>
                <div>
                  <label htmlFor="add-schedule" className="block text-sm font-medium text-foreground mb-1">Schedule Type</label>
                  <Select id="add-schedule" value={form.schedule_type} onValueChange={v => updateForm('schedule_type', v)}>
                    <SelectItem value="General">General - OTC</SelectItem>
                    <SelectItem value="H">H - Prescription Required</SelectItem>
                    <SelectItem value="H1">H1 - Rx + License Mandatory</SelectItem>
                    <SelectItem value="X">X - Narcotic</SelectItem>
                  </Select>
                </div>
                <div>
                  <label htmlFor="add-purchase-gst" className="block text-sm font-medium text-foreground mb-1">Purchase GST %</label>
                  <Select id="add-purchase-gst" value={form.purchase_gst_percent} onValueChange={v => updateForm('purchase_gst_percent', v)}>
                    <SelectItem value="0">0% - Nil</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-sale-gst" className="block text-sm font-medium text-foreground mb-1">Sale GST %</label>
                  <Select id="add-sale-gst" value={form.sale_gst_percent} onValueChange={v => updateForm('sale_gst_percent', v)}>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                  </Select>
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.expiry_returnable} onChange={e => updateForm('expiry_returnable', e.target.checked)} className="w-4 h-4 rounded text-accent" />
                    <span className="text-sm text-foreground/80">Expiry Returnable</span>
                  </label>
                </div>
              </div>
              {form.schedule_type === 'H1' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-red-700 uppercase">H1 Drug Compliance: Barcode + Prescription License upload are MANDATORY</p>
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { updateForm('prescription_doc', file.name); }
                  }} className="hidden" />
                  <Button type="button" variant="destructive" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Upload Prescription/License
                  </Button>
                  {form.prescription_doc && <span className="text-xs text-success font-medium ml-2">{form.prescription_doc}</span>}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* SECTION E: Dates */}
        <Card variant="bordered">
          <SectionHeader title="SECTION E: Manufacturing & Expiry Dates" subtitle="MFG date and expiry date" icon={Calendar} isOpen={openSections['E']} onToggle={() => toggleSection('E')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['E'] && (
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-mfg-date" className="block text-sm font-medium text-foreground mb-1">Manufacturing Date</label>
                  <Input id="add-mfg-date" type="date" value={form.mfg_date} onChange={e => updateForm('mfg_date', e.target.value)} className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-expiry-date" className="block text-sm font-medium text-foreground mb-1">Expiry Date <span className="text-destructive">*</span></label>
                  <Input id="add-expiry-date" type="date" value={form.expiry_date} onChange={e => updateForm('expiry_date', e.target.value)} required className="h-11" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* SECTION F: Supplier & Purchase Info */}
        <Card variant="bordered">
          <SectionHeader title="SECTION F: Supplier & Purchase Order Details" subtitle="Supplier, invoice, PO, payment terms, dispatch" icon={Building2} isOpen={openSections['F']} onToggle={() => toggleSection('F')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['F'] && (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-supplier" className="block text-sm font-medium text-foreground mb-1">Supplier</label>
                  <Select id="add-supplier" value={form.supplier_id} onValueChange={v => {
                    const s = suppliers.find(sup => String(sup.id) === v);
                    updateForm('supplier_id', v);
                    updateForm('supplier_name', s?.name || '');
                  }}>
                    <SelectItem value="">Select supplier...</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} {s.gstin ? `(${s.gstin})` : ''}</SelectItem>)}
                  </Select>
                </div>
                <div>
                  <label htmlFor="add-invoice-no" className="block text-sm font-medium text-foreground mb-1">Invoice Number</label>
                  <Input id="add-invoice-no" value={form.invoice_no} onChange={e => updateForm('invoice_no', e.target.value)} placeholder="INV-2024-001" className="h-11 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-invoice-date" className="block text-sm font-medium text-foreground mb-1">Invoice Date</label>
                  <Input id="add-invoice-date" type="date" value={form.invoice_date} onChange={e => updateForm('invoice_date', e.target.value)} className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-po-number" className="block text-sm font-medium text-foreground mb-1">PO Number</label>
                  <Input id="add-po-number" value={form.po_number} onChange={e => updateForm('po_number', e.target.value)} placeholder="PO-2024-001" className="h-11 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-order-date" className="block text-sm font-medium text-foreground mb-1">Order Date</label>
                  <Input id="add-order-date" type="date" value={form.order_date} onChange={e => updateForm('order_date', e.target.value)} className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-payment-terms" className="block text-sm font-medium text-foreground mb-1">Payment Terms</label>
                  <Select id="add-payment-terms" value={form.payment_terms} onValueChange={v => updateForm('payment_terms', v)}>
                    <SelectItem value="">Select...</SelectItem>
                    <SelectItem value="immediate">Immediate / Cash</SelectItem>
                    <SelectItem value="7_days">7 Days</SelectItem>
                    <SelectItem value="15_days">15 Days</SelectItem>
                    <SelectItem value="30_days">30 Days</SelectItem>
                    <SelectItem value="45_days">45 Days</SelectItem>
                    <SelectItem value="60_days">60 Days</SelectItem>
                  </Select>
                </div>
                <div>
                  <label htmlFor="add-due-date" className="block text-sm font-medium text-foreground mb-1">Due Date</label>
                  <Input id="add-due-date" type="date" value={form.due_date} onChange={e => updateForm('due_date', e.target.value)} className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-dispatch" className="block text-sm font-medium text-foreground mb-1">Dispatch / Warehouse Location</label>
                  <Input id="add-dispatch" value={form.dispatch_location} onChange={e => updateForm('dispatch_location', e.target.value)} placeholder="Main Warehouse" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-cartons" className="block text-sm font-medium text-foreground mb-1">Number of Cartons/Boxes</label>
                  <Input id="add-cartons" type="number" min="0" value={form.num_cartons} onChange={e => updateForm('num_cartons', e.target.value)} placeholder="5" className="h-11" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* SECTION G: Scheme & Bonus */}
        <Card variant="bordered">
          <SectionHeader title="SECTION G: Scheme & Bonus Details" subtitle="Scheme quantity, free qty, bonus code" icon={BadgePercent} isOpen={openSections['G']} onToggle={() => toggleSection('G')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['G'] && (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-scheme-qty" className="block text-sm font-medium text-foreground mb-1">Scheme Quantity</label>
                  <Input id="add-scheme-qty" type="number" min="0" value={form.scheme_qty} onChange={e => updateForm('scheme_qty', e.target.value)} placeholder="10" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-free-qty" className="block text-sm font-medium text-foreground mb-1">Free Quantity</label>
                  <Input id="add-free-qty" type="number" min="0" value={form.free_qty} onChange={e => updateForm('free_qty', e.target.value)} placeholder="1" className="h-11" />
                  {(parseInt(form.scheme_qty) > 0 || parseInt(form.free_qty) > 0) && <p className="text-[10px] font-semibold text-success mt-0.5">Scheme: {form.scheme_qty}+{form.free_qty}</p>}
                </div>
                <div>
                  <label htmlFor="add-scheme-code" className="block text-sm font-medium text-foreground mb-1">Scheme/Bonus Code</label>
                  <Input id="add-scheme-code" value={form.scheme_bonus_code} onChange={e => updateForm('scheme_bonus_code', e.target.value)} placeholder="SCH-2024-01" className="h-11 font-mono" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* SECTION H: Tax & E-Way Bill */}
        <Card variant="bordered">
          <SectionHeader title="SECTION H: Tax & E-Way Bill Details" subtitle="Taxable amount, CGST, SGST, IGST, E-way bill" icon={FileSpreadsheet} isOpen={openSections['H']} onToggle={() => toggleSection('H')} color="from-[#EDF5F6] to-[#2E9C90]/25" />
          {openSections['H'] && (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-taxable" className="block text-sm font-medium text-foreground mb-1">Taxable Amount</label>
                  <Input id="add-taxable" type="number" step="0.01" min="0" value={form.taxable_amount} onChange={e => updateForm('taxable_amount', e.target.value)} placeholder="Auto" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-cgst" className="block text-sm font-medium text-foreground mb-1">CGST Amount</label>
                  <Input id="add-cgst" type="number" step="0.01" min="0" value={form.cgst_amount} onChange={e => updateForm('cgst_amount', e.target.value)} placeholder="Auto" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-sgst" className="block text-sm font-medium text-foreground mb-1">SGST Amount</label>
                  <Input id="add-sgst" type="number" step="0.01" min="0" value={form.sgst_amount} onChange={e => updateForm('sgst_amount', e.target.value)} placeholder="Auto" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-igst" className="block text-sm font-medium text-foreground mb-1">IGST Amount</label>
                  <Input id="add-igst" type="number" step="0.01" min="0" value={form.igst_amount} onChange={e => updateForm('igst_amount', e.target.value)} placeholder="0" className="h-11" />
                </div>
                <div>
                  <label htmlFor="add-eway" className="block text-sm font-medium text-foreground mb-1">E-Way Bill Number</label>
                  <Input id="add-eway" value={form.eway_bill_no} onChange={e => updateForm('eway_bill_no', e.target.value)} placeholder="EWB-2024-..." className="h-11 font-mono" />
                </div>
                <div className="flex items-end pb-1">
                  <span className="text-[10px] text-muted-foreground/60">Taxable + CGST + SGST + IGST = Total</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Recent Batches */}
        {recentBatches.length > 0 && (
          <Card variant="bordered">
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Batches — Click to auto-fill</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              <div className="flex flex-wrap gap-1.5">
                {recentBatches.map(b => (
                  <button key={b.id} type="button" onClick={() => handleBatchClick(b)} className="px-3 py-1.5 bg-muted hover:bg-accent/10 rounded-lg text-xs font-mono text-foreground/80 hover:text-accent transition-all">
                    {b.batch_number}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-3 sticky bottom-0 bg-background/85 backdrop-blur-xl p-4 rounded-2xl border border-border">
          <Button type="submit" size="lg" className="flex-1 gap-2 h-12" disabled={!canAdd}>
            <Plus className="w-5 h-5" /> Add Stock & Complete Purchase Entry
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-12 px-6" onClick={resetForm}>Reset</Button>
        </div>
      </form>

      {/* HSN Lookup Dialog */}
      <Dialog open={showHSNLookup} onOpenChange={setShowHSNLookup}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>HSN Code Lookup</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            {[
              { code: '3004', desc: 'Medicaments - retail sale', gst: '12%' },
              { code: '3005', desc: 'Wadding, gauze, bandages', gst: '12%' },
              { code: '3003', desc: 'Medicaments - bulk/wholesale', gst: '12%' },
              { code: '3006', desc: 'Pharmaceutical goods', gst: '12%' },
              { code: '9018', desc: 'Medical instruments', gst: '12%' },
              { code: '4015', desc: 'Rubber gloves, medical', gst: '12%' },
            ].map(hsn => (
              <button key={hsn.code} type="button" onClick={() => { updateForm('hsn_code', hsn.code); setShowHSNLookup(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent/10 transition-colors border border-transparent hover:border-accent/30">
                <div className="flex items-center gap-3">
                  <code className="px-2 py-0.5 bg-accent/10 rounded text-sm font-bold text-accent font-mono">{hsn.code}</code>
                  <div className="text-left"><p className="text-sm font-medium text-foreground">{hsn.desc}</p><p className="text-xs text-muted-foreground">GST: {hsn.gst}</p></div>
                </div>
                <Badge variant="outline-teal" size="sm">Select</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}