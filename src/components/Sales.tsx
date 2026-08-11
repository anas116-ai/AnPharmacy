import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useStockStore } from '../stores/stockStore';
import { Plus, Minus, ShoppingCart, CheckCircle, AlertCircle, Package, User, Phone, MapPin, Search, Receipt, Wallet, Building2, FileText, CreditCard, Smartphone, Banknote, Trash2, X, Save, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { Medicine } from '../lib/types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import InvoicePreview from './InvoicePreview';

interface CartItem {
  id: string;
  medicineName: string;
  itemCode: string | null;
  hsnCode: string | null;
  batchId: number;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number;
  discountPercent: number;
  totalAmount: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  netAmount: number;
  returnable: boolean;
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  credit_limit: number;
  current_balance: number;
  type: string;
}

export default function Sales() {
  const { user } = useAuthStore();
  const { medicines, setMedicines, setDashboardStats } = useStockStore();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerArea, setCustomerArea] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [creditLimit, setCreditLimit] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  
  const [doctorName, setDoctorName] = useState('');
  const [doctorRegNo, setDoctorRegNo] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('OTC');
  const [paymentMode, setPaymentMode] = useState('cash');
  
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Medicine | null>(null);
  const [cartQty, setCartQty] = useState(1);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [counterId] = useState('COUNTER-1');
  const [billDiscount, setBillDiscount] = useState(0);
  type RoundOffMode = 'none' | 'nearest_1' | 'nearest_0.50';
  const [roundOffMode, setRoundOffMode] = useState<RoundOffMode>('none');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [custResult, stockResult] = await Promise.all([
          window.electronAPI.listCustomers?.() || Promise.resolve({ success: true, customers: [] }),
          window.electronAPI.listStock()
        ]);
        if (custResult.success) setCustomers(custResult.customers || []);
        if (stockResult.success) setMedicines(stockResult.medicines || []);
      }
    } catch (error) { console.error(error); }
  };

  const handleCustomerSearch = useCallback((query: string) => {
    setCustomerSearch(query);
    setShowCustomerSuggestions(true);
    if (query.trim().length >= 1) {
      const lower = query.toLowerCase();
      const results = customers.filter(c => 
        c.name.toLowerCase().includes(lower) ||
        (c.phone && c.phone.includes(query)) ||
        (c.gstin && c.gstin.toLowerCase().includes(lower))
      );
      setCustomers(results.length > 0 ? results : customers.slice(0, 20));
    } else {
      setCustomers(customers.slice(0, 20));
    }
  }, [customers]);

  const selectCustomer = useCallback((cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setShopName(cust.name);
    setCustomerPhone(cust.phone || '');
    setAlternatePhone('');
    setCustomerAddress(cust.address || '');
    setCustomerArea('');
    setCustomerGstin(cust.gstin || '');
    setCreditLimit(cust.credit_limit || 0);
    setCurrentBalance(cust.current_balance || 0);
    setIsNewCustomer(false);
    setShowCustomerSuggestions(false);
    setCustomerSearch(cust.name);
  }, []);

  const handleNewCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerName('');
    setShopName('');
    setCustomerPhone('');
    setAlternatePhone('');
    setCustomerAddress('');
    setCustomerArea('');
    setCustomerGstin('');
    setCreditLimit(0);
    setCurrentBalance(0);
    setIsNewCustomer(true);
    setCustomerSearch('');
    setShowCustomerSuggestions(false);
  }, []);

  const saveCustomer = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Customer name and phone are required');
      return;
    }
    setIsSavingCustomer(true);
    try {
      const customerData = {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: '',
        address: customerAddress.trim() || null,
        gstin: customerGstin.trim() || null,
        credit_limit: creditLimit || 0,
        current_balance: currentBalance || 0,
        type: 'retail'
      };
      if (window.electronAPI) {
        const result = await window.electronAPI.createCustomer({ data: customerData });
        if (result.success) {
          setSuccess('Customer saved successfully!');
          setSelectedCustomer(result.customer);
          setIsNewCustomer(false);
          loadData();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(result.error || 'Failed to save customer');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setMedicineSearch(query);
    setShowSuggestions(true);
    setSelectedBatch(null);
    if (query.trim().length >= 2) {
      const lower = query.toLowerCase();
      const results = medicines
        .filter(m => 
          m.name.toLowerCase().includes(lower) ||
          m.batch_number.toLowerCase().includes(lower) ||
          (m.barcode && m.barcode.toLowerCase().includes(lower))
        )
        // ponytail: FEFO at POS — same medicine, earliest expiry first so the oldest stock gets billed
        .sort((a, b) =>
          a.name.localeCompare(b.name) ||
          (a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity) -
          (b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity)
        );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [medicines]);

  const handleSelectMedicine = useCallback((med: Medicine) => {
    setMedicineSearch(med.name);
    setShowSuggestions(false);
    setSelectedBatch(med);
    setCartQty(1);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedBatch) {
      setError('Please select a medicine first');
      return;
    }
    if (cartQty <= 0 || cartQty > selectedBatch.quantity) {
      setError(`Only ${selectedBatch.quantity} units available`);
      return;
    }
    if (!selectedBatch.selling_price) {
      setError('Selling price not set for this batch — cannot add to cart');
      return;
    }

    const unitPrice = selectedBatch.selling_price;
    const taxableValue = cartQty * unitPrice;
    const cgstAmount = taxableValue * ((selectedBatch.purchase_gst_percent || 0) / 200);
    const sgstAmount = taxableValue * ((selectedBatch.purchase_gst_percent || 0) / 200);
    const igstAmount = 0;
    const netAmount = taxableValue + cgstAmount + sgstAmount + igstAmount;

    const existingIndex = cart.findIndex(item => item.batchId === selectedBatch.id);
    if (existingIndex >= 0) {
      const newQty = cart[existingIndex].quantity + cartQty;
      if (newQty > selectedBatch.quantity) {
        setError(`Only ${selectedBatch.quantity} units available`);
        return;
      }
      const updated = cart[existingIndex];
      updated.quantity = newQty;
      updated.totalAmount = newQty * updated.sellingPrice;
      updated.taxableValue = updated.totalAmount;
      updated.cgstAmount = updated.totalAmount * ((selectedBatch.purchase_gst_percent || 0) / 200);
      updated.sgstAmount = updated.totalAmount * ((selectedBatch.purchase_gst_percent || 0) / 200);
      updated.netAmount = updated.totalAmount + updated.cgstAmount + updated.sgstAmount;
      cart[existingIndex] = updated;
      setCart([...cart]);
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        medicineName: selectedBatch.name,
        itemCode: selectedBatch.item_code || null,
        hsnCode: selectedBatch.hsn_code || null,
        batchId: selectedBatch.id,
        batchNumber: selectedBatch.batch_number,
        expiryDate: selectedBatch.expiry_date || '',
        availableQty: selectedBatch.quantity,
        quantity: cartQty,
        sellingPrice: unitPrice,
        purchasePrice: selectedBatch.purchase_price || 0,
        discountPercent: 0,
        totalAmount: cartQty * unitPrice,
        taxableValue,
        cgstAmount,
        sgstAmount,
        igstAmount,
        netAmount,
        returnable: false,
      };
      setCart([...cart, newItem]);
    }

    setSelectedBatch(null);
    setCartQty(1);
    setMedicineSearch('');
    setSearchResults([]);
    setError('');
  }, [selectedBatch, cartQty, cart, medicines]);

  const handleRemoveFromCart = useCallback((id: string) => {
    setCart(cart.filter(item => item.id !== id));
  }, [cart]);

  const handleUpdateDiscount = useCallback((id: string, discount: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const discPct = Math.max(0, Math.min(100, discount));
        const discountedPrice = item.sellingPrice * (1 - discPct / 100);
        const newTotal = item.quantity * discountedPrice;
        return {
          ...item,
          discountPercent: discPct,
          totalAmount: newTotal,
          taxableValue: newTotal,
          cgstAmount: newTotal * 0.06,
          sgstAmount: newTotal * 0.06,
          netAmount: newTotal * 1.12,
        };
      }
      return item;
    }));
  }, [cart]);

  const handleToggleReturnable = useCallback((id: string) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        return { ...item, returnable: !item.returnable };
      }
      return item;
    }));
  }, [cart]);

  const cartSummary = useCallback(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalDiscount = cart.reduce((sum, item) => {
      const originalPrice = item.sellingPrice * item.quantity;
      return sum + (originalPrice - item.totalAmount);
    }, 0);
    const taxableAmount = cart.reduce((sum, item) => sum + item.taxableValue, 0);
    const cgstAmount = cart.reduce((sum, item) => sum + item.cgstAmount, 0);
    const sgstAmount = cart.reduce((sum, item) => sum + item.sgstAmount, 0);
    const igstAmount = cart.reduce((sum, item) => sum + item.igstAmount, 0);
    const grandTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;

    return { totalItems, totalAmount, totalDiscount, taxableAmount, cgstAmount, sgstAmount, igstAmount, grandTotal };
  }, [cart]);

  // ─── Compute round-off ───
  const computeRoundOff = (amount: number, mode: RoundOffMode): number => {
    if (mode === 'none') return 0;
    const rounded = mode === 'nearest_1' ? Math.round(amount) : Math.round(amount * 2) / 2;
    return rounded - amount;
  };

  const summary = cartSummary();
  const computedRoundOff = computeRoundOff(summary.grandTotal - billDiscount, roundOffMode);
  const finalAmount = summary.grandTotal - billDiscount + computedRoundOff;

  const generateBillNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BILL-${datePart}-${randomPart}`;
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add medicines before completing sale.');
      return;
    }
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      if (window.electronAPI && user) {
        let custId = selectedCustomer?.id;
        if (isNewCustomer && !selectedCustomer) {
          const custResult = await window.electronAPI.createCustomer({
            data: {
              name: customerName.trim(),
              phone: customerPhone.trim(),
              address: customerAddress.trim() || null,
              gstin: customerGstin.trim() || null,
              credit_limit: creditLimit || 0,
              current_balance: currentBalance || 0,
              type: 'retail'
            }
          });
          if (custResult.success) {
            custId = custResult.customer.id;
          }
        }

        const billNumber = generateBillNumber();
        const saleItems = cart.map(item => ({
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          medicineName: item.medicineName,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          purchasePrice: item.purchasePrice || 0,
          sellingPrice: item.sellingPrice,
          discountPercent: item.discountPercent,
          taxableValue: item.totalAmount,
          cgstAmount: item.totalAmount * 0.06,
          sgstAmount: item.totalAmount * 0.06,
          igstAmount: 0,
          netAmount: item.totalAmount * 1.12,
        }));

        const result = await window.electronAPI.processSale({
          customerName,
          customerId: custId ?? null,
          customerPhone: customerPhone || null,
          customerAddress: customerAddress || null,
          customerGstin: customerGstin || null,
          doctorName: doctorName || null,
          doctorRegNo: doctorRegNo || null,
          prescriptionType: prescriptionType || 'OTC',
          medicineName: cart.map(c => c.medicineName).join(', '),
          totalAmount: summary.grandTotal,
          discountAmount: summary.totalDiscount,
          taxableAmount: summary.taxableAmount,
          cgstAmount: summary.cgstAmount,
          sgstAmount: summary.sgstAmount,
          igstAmount: summary.igstAmount,
          netPayable: summary.grandTotal,
          paymentMode,
          counterId,
          pharmacistId: user.id,
          pharmacistName: user.displayName,
          items: saleItems,
          userId: user.id,
        });

        if (result.success) {
          const [stockResult, custResult, dashResult] = await Promise.all([
            window.electronAPI.listStock(),
            window.electronAPI.listCustomers?.() || Promise.resolve({ success: true, customers: [] }),
            window.electronAPI.getDashboardStats()
          ]);
          if (stockResult.success) setMedicines(stockResult.medicines || []);
          if (custResult.success) setCustomers(custResult.customers || []);
          if (dashResult.success) setDashboardStats(dashResult.stats);

          const billDateTime = new Date().toISOString();
          setLastBill({
            billNumber: result.billNumber || billNumber,
            billDateTime,
            counterId,
            pharmacistId: user.id,
            pharmacistName: user.displayName,
            customerName,
            shopName,
            customerPhone,
            alternatePhone,
            customerAddress,
            customerArea,
            customerGstin,
            doctorName,
            doctorRegNo,
            prescriptionType,
            previousBalance: currentBalance,
            items: cart,
            summary,
            billDiscount,
            roundOff: computedRoundOff,
            finalAmount,
            paymentMode,
            saleDate: new Date().toISOString(),
          });
          setShowReceipt(true);
          setSuccess('Sale completed successfully!');
          
          setCart([]);
          setCustomerName('');
          setShopName('');
          setCustomerPhone('');
          setAlternatePhone('');
          setCustomerAddress('');
          setCustomerArea('');
          setCustomerGstin('');
          setCreditLimit(0);
          setCurrentBalance(0);
          setDoctorName('');
          setDoctorRegNo('');
          setPrescriptionType('OTC');
          setPaymentMode('cash');
          setSelectedBatch(null);
          setCartQty(1);
          setIsNewCustomer(false);
          setSelectedCustomer(null);
          setCustomerSearch('');
          setBillDiscount(0);
          setRoundOffMode('none');
          
          setTimeout(() => { setSuccess(''); setShowReceipt(false); }, 10000);
        } else {
          setError(result.error || 'Sale failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Sale failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground font-display">Pharmacy POS - Sales</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete medical billing with customer details, GST, and stock management</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline-teal" size="md">
            <Package className="w-3.5 h-3.5 mr-1.5" />
            {medicines.length} Medicines
          </Badge>
          <Badge variant="safe" size="md">
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
            {cart.length} Items
          </Badge>
        </div>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="flex items-center gap-3 bg-success-light border border-success/40 rounded-2xl px-5 py-4 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-success" />
          <span className="text-success text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl px-5 py-4 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-destructive text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Customer & Search */}
        <div className="lg:col-span-1 space-y-5">
          {/* Customer Details */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-accent" />
                Customer Details
                {selectedCustomer && (
                  <Badge variant="safe" size="sm" className="ml-auto">
                    Bal: ₹{currentBalance.toFixed(2)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div ref={customerRef} className="relative">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Search Customer</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      placeholder="Search by name or phone..."
                      className="h-10 pl-9"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleNewCustomer} className="whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-1" /> New
                  </Button>
                </div>

                {showCustomerSuggestions && (
                  <div className="absolute z-20 mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {customers.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onMouseDown={() => selectCustomer(cust)}
                        className="w-full text-left px-4 py-3 hover:bg-accent/10 border-b border-border last:border-0 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">{cust.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">Phone: {cust.phone || 'N/A'}</span>
                          <span className="text-xs text-muted-foreground">Balance: ₹{cust.current_balance.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">Limit: ₹{cust.credit_limit.toFixed(2)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="sale-cust-name" className="block text-xs font-medium text-muted-foreground mb-1">Customer Name *</label>
                <Input id="sale-cust-name" autoComplete="name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer/shop name" className="h-10" />
              </div>
              <div>
                <label htmlFor="sale-shop" className="block text-xs font-medium text-muted-foreground mb-1">Shop / Business Name</label>
                <Input id="sale-shop" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Shop name if different" className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="sale-phone" className="block text-xs font-medium text-muted-foreground mb-1">Phone *</label>
                  <Input id="sale-phone" autoComplete="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone" className="h-10" />
                </div>
                <div>
                  <label htmlFor="sale-alt-phone" className="block text-xs font-medium text-muted-foreground mb-1">Alternate Phone</label>
                  <Input id="sale-alt-phone" value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} placeholder="Alt" className="h-10" />
                </div>
              </div>
              <div>
                <label htmlFor="sale-address" className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                <Input id="sale-address" autoComplete="street-address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Full address" className="h-10" />
              </div>
              <div>
                <label htmlFor="sale-area" className="block text-xs font-medium text-muted-foreground mb-1">Area / City</label>
                <Input id="sale-area" value={customerArea} onChange={e => setCustomerArea(e.target.value)} placeholder="Area or city" className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="sale-gstin" className="block text-xs font-medium text-muted-foreground mb-1">GSTIN</label>
                  <Input id="sale-gstin" value={customerGstin} onChange={e => setCustomerGstin(e.target.value)} placeholder="GSTIN" className="h-10 font-mono" />
                </div>
                <div>
                  <label htmlFor="sale-credit" className="block text-xs font-medium text-muted-foreground mb-1">Credit Limit (₹)</label>
                  <Input id="sale-credit" type="number" value={creditLimit} onChange={e => setCreditLimit(parseFloat(e.target.value) || 0)} placeholder="0" className="h-10" />
                </div>
              </div>

              {currentBalance > 0 && (
                <div className="p-2 bg-warning-light border border-warning/40 rounded-xl">
                  <p className="text-xs text-warning">Outstanding: ₹{currentBalance.toFixed(2)} / ₹{creditLimit.toFixed(2)}</p>
                </div>
              )}

              {isNewCustomer && !selectedCustomer && (
                <Button type="button" variant="outline-teal" size="sm" onClick={saveCustomer} disabled={isSavingCustomer} className="w-full gap-2">
                  <Save className="w-4 h-4" /> {isSavingCustomer ? 'Saving...' : 'Save Customer'}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="sale-doctor" className="block text-xs font-medium text-muted-foreground mb-1">Doctor Name</label>
                  <Input id="sale-doctor" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Doctor" className="h-10" />
                </div>
                <div>
                  <label htmlFor="sale-doctor-reg" className="block text-xs font-medium text-muted-foreground mb-1">Doctor Reg. No.</label>
                  <Input id="sale-doctor-reg" value={doctorRegNo} onChange={e => setDoctorRegNo(e.target.value)} placeholder="Reg No" className="h-10" />
                </div>
              </div>
              <div>
                <label htmlFor="sale-rx-type" className="block text-xs font-medium text-muted-foreground mb-1">Prescription Type</label>
                <Select value={prescriptionType} onValueChange={v => setPrescriptionType(v)}>
                  <SelectItem value="OTC">OTC - Over the Counter</SelectItem>
                  <SelectItem value="H">H - Prescription Required</SelectItem>
                  <SelectItem value="H1">H1 - Schedule H1</SelectItem>
                  <SelectItem value="X">X - Narcotic</SelectItem>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Medicine Search */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="w-4 h-4 text-accent" />
                Search Medicine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div ref={searchRef} className="relative">
                <Input
                  value={medicineSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search medicine, batch, barcode..."
                  className="h-10 pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                
                {showSuggestions && searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map(med => (
                      <button
                        key={med.id}
                        type="button"
                        onMouseDown={() => handleSelectMedicine(med)}
                        className="w-full text-left px-4 py-3 hover:bg-accent/10 border-b border-border last:border-0 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">{med.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">Batch: <span className="font-mono">{med.batch_number}</span></span>
                          <span className="text-xs text-muted-foreground">Qty: <span className="font-bold text-accent">{med.quantity}</span></span>
                          <span className="text-xs text-muted-foreground">MRP: ₹{med.mrp?.toFixed(2)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${med.status === 'expired' ? 'bg-destructive/10 text-destructive' : med.status === 'critical' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}`}>
                            {med.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedBatch && (
                <div className="p-3 bg-gradient-to-r from-accent-light to-success-light border border-accent/40 rounded-xl space-y-2 animate-fade-in">
                  <p className="text-sm font-bold text-foreground">{selectedBatch.name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Item Code:</span>
                      <span className="font-mono ml-1">{selectedBatch.item_code || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Batch:</span>
                      <span className="font-mono ml-1">{selectedBatch.batch_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available:</span>
                      <span className="font-bold text-accent ml-1">{selectedBatch.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Exp:</span>
                      <span className="ml-1">{formatDate(selectedBatch.expiry_date)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">MRP:</span>
                      <span className="font-semibold ml-1">₹{selectedBatch.mrp?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Selling:</span>
                      <span className="font-semibold text-accent ml-1">₹{selectedBatch.selling_price?.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setCartQty(Math.max(1, cartQty - 1))} className="w-8 h-8 rounded-lg border-2 border-border flex items-center justify-center hover:bg-muted/50">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <Input type="number" value={cartQty} onChange={(e) => setCartQty(Math.max(1, Math.min(selectedBatch.quantity, parseInt(e.target.value) || 1)))} className="w-20 h-8 text-center text-sm font-bold" />
                      <button type="button" onClick={() => setCartQty(Math.min(selectedBatch.quantity, cartQty + 1))} className="w-8 h-8 rounded-lg border-2 border-border flex items-center justify-center hover:bg-muted/50">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Button onClick={handleAddToCart} size="sm" className="flex-1 gap-1.5 h-8">
                      <Plus className="w-3.5 h-3.5" /> Add to Cart
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Cart & Billing */}
        <div className="lg:col-span-2 space-y-5">
          {/* Cart Items */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-accent" />
                  Cart ({cart.length} items)
                </span>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" /> Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Cart is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Search and add medicines to start billing</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Medicine</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Batch</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Expiry</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Price</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Disc%</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Taxable</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground">CGST</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground">SGST</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Net</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cart.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/50/50">
                          <td className="px-3 py-2.5 text-muted-foreground/60 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-foreground">{item.medicineName}</p>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-muted-foreground">{item.itemCode || '-'}</td>
                          <td className="px-3 py-2.5 font-mono text-muted-foreground">{item.batchNumber}</td>
                          <td className="px-3 py-2.5 text-center">{formatDate(item.expiryDate)}</td>
                          <td className="px-3 py-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right">₹{item.sellingPrice.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => handleUpdateDiscount(item.id, parseFloat(e.target.value) || 0)}
                              className="w-14 h-8 text-center text-xs border border-border rounded-lg"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right">₹{item.taxableValue.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-center">₹{item.cgstAmount.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-center">₹{item.sgstAmount.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-foreground">₹{item.netAmount.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => handleRemoveFromCart(item.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill Summary */}
          {cart.length > 0 && (
            <Card variant="bordered" className="border-accent/40">
              <CardContent className="p-4 space-y-4">
                {/* Complete Bill Header Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bill Number:</span>
                      <span className="font-mono font-bold text-accent">BILL-{new Date().toISOString().slice(0,10).replace(/-/g,'')}-{Math.random().toString(36).substring(2,6).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bill Date & Time:</span>
                      <span className="font-medium">{new Date().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Counter / Terminal:</span>
                      <span className="font-medium">{counterId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pharmacist / Cashier:</span>
                      <span className="font-medium">{user?.displayName}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{customerName || 'Walk-in'}</span>
                    </div>
                    {shopName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shop:</span>
                        <span className="font-medium">{shopName}</span>
                      </div>
                    )}
                    {customerPhone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{customerPhone}</span>
                      </div>
                    )}
                    {customerAddress && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium text-right max-w-[150px] truncate">{customerAddress}</span>
                      </div>
                    )}
                    {customerGstin && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GSTIN:</span>
                        <span className="font-mono font-medium">{customerGstin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor & Prescription Info */}
                {(doctorName || doctorRegNo || prescriptionType) && (
                  <div className="grid grid-cols-3 gap-2 text-xs p-2 bg-muted/50 rounded-xl">
                    {doctorName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Doctor:</span>
                        <span className="font-medium">{doctorName}</span>
                      </div>
                    )}
                    {doctorRegNo && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reg No:</span>
                        <span className="font-mono">{doctorRegNo}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rx Type:</span>
                      <span className="font-medium">{prescriptionType}</span>
                    </div>
                  </div>
                )}

                {/* Previous Balance */}
                {currentBalance > 0 && (
                  <div className="p-2 bg-warning-light border border-warning/40 rounded-xl text-xs">
                    <div className="flex justify-between">
                      <span className="text-warning font-medium">Previous Ledger Balance / Outstanding:</span>
                      <span className="font-bold text-warning">₹{currentBalance.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Cart Items Summary Table */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold">Item</th>
                        <th className="px-2 py-1.5 text-center">Batch</th>
                        <th className="px-2 py-1.5 text-center">Exp</th>
                        <th className="px-2 py-1.5 text-center">Qty</th>
                        <th className="px-2 py-1.5 text-right">Price</th>
                        <th className="px-2 py-1.5 text-center">Disc</th>
                        <th className="px-2 py-1.5 text-right">Taxable</th>
                        <th className="px-2 py-1.5 text-center">CGST</th>
                        <th className="px-2 py-1.5 text-center">SGST</th>
                        <th className="px-2 py-1.5 text-center">IGST</th>
                        <th className="px-2 py-1.5 text-right">Net</th>
                        <th className="px-2 py-1.5 text-center">Ret</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cart.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="px-2 py-1.5 font-medium">{item.medicineName}</td>
                          <td className="px-2 py-1.5 text-center font-mono">{item.batchNumber}</td>
                          <td className="px-2 py-1.5 text-center">{formatDate(item.expiryDate)}</td>
                          <td className="px-2 py-1.5 text-center">{item.quantity}</td>
                          <td className="px-2 py-1.5 text-right">₹{item.sellingPrice.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">{item.discountPercent}%</td>
                          <td className="px-2 py-1.5 text-right">₹{item.taxableValue.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">₹{item.cgstAmount.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">₹{item.sgstAmount.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">₹{item.igstAmount.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">₹{item.netAmount.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button onClick={() => handleToggleReturnable(item.id)} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.returnable ? 'bg-success-light text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {item.returnable ? 'Yes' : 'No'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Items</span>
                      <span className="font-semibold">{summary.totalItems} units</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">₹{summary.totalAmount.toFixed(2)}</span>
                    </div>
                    {summary.totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Item Discount</span>
                        <span className="font-semibold">-₹{summary.totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxable Amount</span>
                      <span className="font-semibold">₹{summary.taxableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>CGST</span>
                      <span>₹{summary.cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>SGST</span>
                      <span>₹{summary.sgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>IGST</span>
                      <span>₹{summary.igstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total GST:</span>
                      <span className="font-medium">₹{(summary.cgstAmount + summary.sgstAmount + summary.igstAmount).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {/* Bill Discount */}
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Bill Discount</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={billDiscount}
                          onChange={(e) => setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-16 h-7 text-center text-xs border border-border rounded-lg"
                          placeholder="₹"
                        />
                      </div>
                    </div>
                    {billDiscount > 0 && (
                      <div className="flex justify-between text-xs text-destructive">
                        <span>Disc. Amount</span>
                        <span className="font-semibold">-₹{billDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {/* Round Off */}
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-muted-foreground">Round Off</span>
                      <select
                        value={roundOffMode}
                        onChange={(e) => setRoundOffMode(e.target.value as RoundOffMode)}
                        className="w-24 h-7 text-xs border border-border rounded-lg bg-background"
                      >
                        <option value="none">None</option>
                        <option value="nearest_1">Nearest ₹1</option>
                        <option value="nearest_0.50">Nearest ₹0.50</option>
                      </select>
                    </div>
                    {computedRoundOff !== 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Round Off Adj.</span>
                        <span>{computedRoundOff > 0 ? '+' : ''}₹{computedRoundOff.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t-2 border-foreground pt-2">
                      <span>Net Payable</span>
                      <span className="text-accent text-xl">₹{finalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Amount in Words:</span>
                      <span className="text-[9px] text-muted-foreground/60 italic truncate ml-2">(See invoice)</span>
                    </div>
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="mt-4 pt-3 border-t border-border">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Payment Mode</label>
                  <div className="flex gap-2">
                    {[
                      { mode: 'cash', label: 'Cash', icon: Banknote },
                      { mode: 'upi', label: 'UPI', icon: Smartphone },
                      { mode: 'card', label: 'Card', icon: CreditCard },
                      { mode: 'credit', label: 'Credit Ledger', icon: Wallet },
                    ].map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 transition-all ${
                          paymentMode === mode
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border hover:border-border text-muted-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleCompleteSale}
                    disabled={isProcessing || cart.length === 0}
                    size="xl"
                    className="flex-1 gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Complete Sale · ₹{finalAmount.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>

                {/* Authorized Signatory */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground/80 mb-1">Authorized Signatory / Dispensing Pharmacist</p>
                      <p className="italic">Signature: ___________________</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground/80 mb-1">Customer Acknowledgement</p>
                      <p className="italic">Signature: ___________________</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <InvoicePreview
            billNumber={lastBill?.billNumber || ''}
            billDateTime={lastBill?.billDateTime || new Date().toISOString()}
            counterId={lastBill?.counterId || counterId}
            pharmacistId={lastBill?.pharmacistId || user?.id || 0}
            pharmacistName={lastBill?.pharmacistName || user?.displayName || ''}
            customerName={lastBill?.customerName || customerName}
            shopName={lastBill?.shopName}
            customerPhone={lastBill?.customerPhone}
            alternatePhone={lastBill?.alternatePhone}
            customerAddress={lastBill?.customerAddress}
            customerArea={lastBill?.customerArea}
            customerGstin={lastBill?.customerGstin}
            doctorName={lastBill?.doctorName}
            doctorRegNo={lastBill?.doctorRegNo}
            prescriptionType={lastBill?.prescriptionType}
            previousBalance={lastBill?.previousBalance || 0}
            items={lastBill?.items || cart}
            summary={lastBill?.summary || summary}
            paymentMode={lastBill?.paymentMode || paymentMode}
            billDiscount={lastBill?.billDiscount || billDiscount}
            roundOff={lastBill?.roundOff || computedRoundOff}
            finalAmount={lastBill?.finalAmount || finalAmount}
            onClose={() => setShowReceipt(false)}
            onPrint={handlePrintReceipt}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}