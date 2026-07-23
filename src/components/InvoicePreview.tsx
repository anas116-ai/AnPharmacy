import { useRef, useState } from 'react';
import { formatDate, cn } from '../lib/utils';
import { Printer, X, FileText, CheckCircle, Download } from 'lucide-react';

interface CartItem {
  id: string;
  medicineName: string;
  itemCode: string | null;
  hsnCode?: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  sellingPrice: number;
  discountPercent: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  netAmount: number;
}

interface InvoiceProps {
  billNumber: string;
  billDateTime: string;
  counterId: string;
  pharmacistId: number;
  pharmacistName: string;
  customerName: string;
  shopName?: string;
  customerPhone?: string;
  alternatePhone?: string;
  customerAddress?: string;
  customerArea?: string;
  customerGstin?: string;
  doctorName?: string;
  doctorRegNo?: string;
  prescriptionType?: string;
  previousBalance?: number;
  items: CartItem[];
  summary: {
    totalItems: number;
    totalAmount: number;
    totalDiscount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    grandTotal: number;
  };
  paymentMode: string;
  billDiscount?: number;
  roundOff?: number;
  finalAmount?: number;
  onClose: () => void;
  onPrint: () => void;
}

const PHARMACY = {
  name: 'ANPHARMACY',
  tagline: 'Complete Healthcare Solutions',
  address: 'Shop No. 123, Main Road, Hyderabad - 500001',
  phone: '+91 9876543210',
  email: 'pharmacy@example.com',
  gstin: '36ABCDE1234F1Z5',
  dlNo: 'TS/2024/PHARM/00123',
  licenseNo: '21-12345/PHARMA',
  cin: 'U12345TS2024PTC123456',
  website: 'www.anpharmacy.com',
  bankName: 'State Bank of India',
  bankBranch: 'Main Branch, Hyderabad',
  bankAccountNo: '12345678901234',
  bankIfsc: 'SBIN0001234',
  bankUpi: 'anpharmacy@upi',
  digitalSignature: 'Digitally signed by ANPHARMACY',
};

function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convertBelow1000 = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertBelow1000(n % 100) : '');
  };
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = '';
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = Math.floor((rupees % 1000) / 100);
  const remainder = rupees % 100;
  if (crore > 0) words += convertBelow1000(crore) + ' Crore ';
  if (lakh > 0) words += convertBelow1000(lakh) + ' Lakh ';
  if (thousand > 0) words += convertBelow1000(thousand) + ' Thousand ';
  if (hundred > 0) words += convertBelow1000(hundred) + ' Hundred ';
  if (remainder > 0) {
    if (words) words += 'and ';
    words += convertBelow1000(remainder);
  }
  words += ' Rupees';
  if (paise > 0) {
    words += ' and ' + convertBelow1000(paise) + ' Paise';
  }
  return words + ' Only';
}

function computeHsnSummary(items: CartItem[]) {
  const map = new Map<string, { hsn: string; taxable: number; qty: number; cgst: number; sgst: number; igst: number; items: string[] }>();
  items.forEach(item => {
    const hsn = item.hsnCode || item.itemCode || 'NA';
    const existing = map.get(hsn) || { hsn, taxable: 0, qty: 0, cgst: 0, sgst: 0, igst: 0, items: [] };
    existing.taxable += item.taxableValue;
    existing.qty += item.quantity;
    existing.cgst += item.cgstAmount;
    existing.sgst += item.sgstAmount;
    existing.igst += item.igstAmount;
    existing.items.push(item.medicineName);
    map.set(hsn, existing);
  });
  return Array.from(map.values());
}

function computeGstBreakup(items: CartItem[]) {
  const byRate = new Map<string, { rate: string; taxable: number; cgst: number; sgst: number; igst: number }>();
  items.forEach(item => {
    const totalGst = item.cgstAmount + item.sgstAmount + item.igstAmount;
    const effectiveRate = item.taxableValue > 0 ? (totalGst / item.taxableValue) * 100 : 0;
    const rateKey = effectiveRate > 0 ? effectiveRate.toFixed(1) + '%' : '0%';
    const existing = byRate.get(rateKey) || { rate: rateKey, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    existing.taxable += item.taxableValue;
    existing.cgst += item.cgstAmount;
    existing.sgst += item.sgstAmount;
    existing.igst += item.igstAmount;
    byRate.set(rateKey, existing);
  });
  return Array.from(byRate.values());
}

function getPaymentLabel(mode: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash', upi: 'UPI / GPay / PhonePe', card: 'Card (Debit/Credit)',
    credit: 'Credit / Ledger', cheque: 'Cheque', online: 'Online Transfer', insurance: 'Insurance Claim',
  };
  return labels[mode] || mode;
}

export default function InvoicePreview({
  billNumber, billDateTime, counterId, pharmacistName,
  customerName, shopName, customerPhone, alternatePhone,
  customerAddress, customerArea, customerGstin,
  doctorName, doctorRegNo, prescriptionType,
  previousBalance = 0, items, summary, paymentMode,
  billDiscount = 0, roundOff = 0, finalAmount,
  onClose,
}: InvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const amountInWords = numberToWords(finalAmount ?? summary.grandTotal);
  const hsnSummary = computeHsnSummary(items);
  const gstBreakup = computeGstBreakup(items);
  const computedFinalAmount = finalAmount ?? (summary.grandTotal - billDiscount + roundOff);
  const totalGst = summary.cgstAmount + summary.sgstAmount + summary.igstAmount;

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintPreview(false), 500);
    }, 300);
  };

  const invoiceContent = (
    <div ref={printRef} className="invoice-container font-body">
      <div className="invoice-page">
        <div className="invoice-header">
          <div className="invoice-header-main">
            <div className="invoice-brand">
              <div className="invoice-logo">
                <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">AP</div>
              </div>
              <div className="invoice-title-group">
                <h1 className="invoice-pharmacy-name">{PHARMACY.name}</h1>
                <p className="invoice-tagline">{PHARMACY.tagline}</p>
              </div>
            </div>
            <div className="invoice-doc-badge">
              <FileText className="w-4 h-4" />
              <span>TAX INVOICE</span>
            </div>
          </div>
          <div className="invoice-address-bar">
            <div className="flex flex-wrap justify-between gap-x-8 gap-y-1 text-xs">
              <span>📍 {PHARMACY.address}</span>
              <span>📞 {PHARMACY.phone}</span>
              <span>✉️ {PHARMACY.email}</span>
              <span>GST: {PHARMACY.gstin}</span>
              <span>DL: {PHARMACY.dlNo}</span>
            </div>
          </div>
        </div>

        <div className="invoice-meta-grid">
          <div className="invoice-meta-block">
            <h3 className="invoice-meta-heading">Bill To:</h3>
            <p className="invoice-customer-name">{customerName}</p>
            {shopName && shopName !== customerName && <p className="invoice-meta-text">🏪 {shopName}</p>}
            {customerPhone && <p className="invoice-meta-text">📞 {customerPhone}</p>}
            {alternatePhone && <p className="invoice-meta-text">📞 Alt: {alternatePhone}</p>}
            {(customerAddress || customerArea) && (
              <p className="invoice-meta-text">📍 {customerAddress}{customerArea && ', ' + customerArea}</p>
            )}
            {customerGstin && <p className="invoice-meta-text">GST: {customerGstin}</p>}
          </div>
          <div className="invoice-meta-block invoice-meta-right">
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Invoice No:</span>
              <span className="invoice-meta-value font-mono">{billNumber}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Date:</span>
              <span className="invoice-meta-value">{formatDate(billDateTime)}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Time:</span>
              <span className="invoice-meta-value">{new Date(billDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Counter:</span>
              <span className="invoice-meta-value">{counterId}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Cashier:</span>
              <span className="invoice-meta-value">{pharmacistName}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Payment:</span>
              <span className="invoice-meta-value font-medium uppercase">{getPaymentLabel(paymentMode)}</span>
            </div>
          </div>
        </div>

        {(doctorName || doctorRegNo || prescriptionType) && (
          <div className="invoice-doctor-bar">
            {doctorName && <span>👨‍⚕️ <strong>Dr.</strong> {doctorName}</span>}
            {doctorRegNo && <span>📋 Reg: {doctorRegNo}</span>}
            {prescriptionType && (
              <span className={cn(
                'invoice-rx-badge',
                prescriptionType === 'OTC' && 'bg-emerald-100 text-emerald-800',
                prescriptionType === 'H' && 'bg-amber-100 text-amber-800',
                prescriptionType === 'H1' && 'bg-red-100 text-red-800',
                prescriptionType === 'X' && 'bg-purple-100 text-purple-800',
              )}>Rx: {prescriptionType}</span>
            )}
          </div>
        )}

        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="w-8 text-center">#</th>
                <th className="text-left">Item Details</th>
                <th className="w-16 text-center">HSN</th>
                <th className="w-20 text-center">Batch</th>
                <th className="w-14 text-center">Exp</th>
                <th className="w-10 text-center">Qty</th>
                <th className="w-16 text-right">Rate (₹)</th>
                <th className="w-12 text-center">Disc%</th>
                <th className="w-18 text-right">Taxable (₹)</th>
                <th className="w-14 text-center">CGST</th>
                <th className="w-14 text-center">SGST</th>
                <th className="w-14 text-center">IGST</th>
                <th className="w-18 text-right">Net (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const totalGstItem = item.cgstAmount + item.sgstAmount + item.igstAmount;
                const gstRate = item.taxableValue > 0 ? (totalGstItem / item.taxableValue) * 100 : 0;
                return (
                  <tr key={item.id} className={idx % 2 === 0 ? 'even-row' : ''}>
                    <td className="text-center text-gray-500">{idx + 1}</td>
                    <td>
                      <div className="font-medium text-gray-800">{item.medicineName}</div>
                      {item.itemCode && <div className="text-[9px] text-gray-400">Code: {item.itemCode}</div>}
                    </td>
                    <td className="text-center font-mono text-[10px] text-gray-500">{item.hsnCode || item.itemCode || '-'}</td>
                    <td className="text-center font-mono text-[10px] text-gray-600">{item.batchNumber}</td>
                    <td className="text-center text-[10px] text-gray-500">{formatDate(item.expiryDate)}</td>
                    <td className="text-center font-bold text-gray-800">{item.quantity}</td>
                    <td className="text-right font-medium">{item.sellingPrice.toFixed(2)}</td>
                    <td className="text-center text-gray-600">{item.discountPercent > 0 ? item.discountPercent + '%' : '-'}</td>
                    <td className="text-right font-medium">{item.taxableValue.toFixed(2)}</td>
                    <td className="text-center text-[10px]">
                      {item.cgstAmount > 0 ? <span>{item.cgstAmount.toFixed(2)}<br/><span className="text-[8px] text-gray-400">({(gstRate / 2).toFixed(1)}%)</span></span> : '\u2014'}
                    </td>
                    <td className="text-center text-[10px]">
                      {item.sgstAmount > 0 ? <span>{item.sgstAmount.toFixed(2)}<br/><span className="text-[8px] text-gray-400">({(gstRate / 2).toFixed(1)}%)</span></span> : '\u2014'}
                    </td>
                    <td className="text-center text-[10px]">
                      {item.igstAmount > 0 ? <span>{item.igstAmount.toFixed(2)}<br/><span className="text-[8px] text-gray-400">({gstRate.toFixed(1)}%)</span></span> : '\u2014'}
                    </td>
                    <td className="text-right font-bold text-gray-800">{item.netAmount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="invoice-words-section">
          <span className="invoice-words-label">Amount in Words:</span>
          <span className="invoice-words-value">{amountInWords}</span>
        </div>

        <div className="invoice-summary-grid">
          <div className="invoice-sub-table">
            <h4 className="invoice-sub-table-title">HSN / Item Code Summary</h4>
            <table className="w-full text-[9px]">
              <thead>
                <tr>
                  <th className="text-left px-1 py-1 border-b border-gray-300 font-semibold">HSN</th>
                  <th className="text-center px-1 py-1 border-b border-gray-300 font-semibold">Items</th>
                  <th className="text-right px-1 py-1 border-b border-gray-300 font-semibold">Qty</th>
                  <th className="text-right px-1 py-1 border-b border-gray-300 font-semibold">Taxable</th>
                  <th className="text-right px-1 py-1 border-b border-gray-300 font-semibold">CGST</th>
                  <th className="text-right px-1 py-1 border-b border-gray-300 font-semibold">SGST</th>
                  <th className="text-right px-1 py-1 border-b border-gray-300 font-semibold">IGST</th>
                </tr>
              </thead>
              <tbody>
                {hsnSummary.map((h, i) => (
                  <tr key={i}>
                    <td className="font-mono px-1 py-0.5">{h.hsn}</td>
                    <td className="text-center px-1 py-0.5 text-gray-500">{h.items.length}</td>
                    <td className="text-right px-1 py-0.5">{h.qty}</td>
                    <td className="text-right px-1 py-0.5">{h.taxable.toFixed(2)}</td>
                    <td className="text-right px-1 py-0.5">{h.cgst.toFixed(2)}</td>
                    <td className="text-right px-1 py-0.5">{h.sgst.toFixed(2)}</td>
                    <td className="text-right px-1 py-0.5">{h.igst.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span>Total Items:</span>
              <span className="font-semibold">{summary.totalItems} units</span>
            </div>
            <div className="invoice-total-row">
              <span>Subtotal:</span>
              <span>₹{summary.totalAmount.toFixed(2)}</span>
            </div>
            {summary.totalDiscount > 0 && (
              <div className="invoice-total-row text-red-600">
                <span>Item Discount:</span>
                <span className="font-semibold">-₹{summary.totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {billDiscount > 0 && (
              <div className="invoice-total-row text-red-600">
                <span>Bill Discount:</span>
                <span className="font-semibold">-₹{billDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="invoice-total-row">
              <span>Taxable Amount:</span>
              <span className="font-semibold">₹{summary.taxableAmount.toFixed(2)}</span>
            </div>
            {gstBreakup.map((g, i) => (
              <div key={i} className="invoice-total-row text-xs text-gray-500 pl-4">
                <span>  {g.rate} GST (CGST: ₹{g.cgst.toFixed(2)} SGST: ₹{g.sgst.toFixed(2)}{g.igst > 0 ? ' IGST: ₹' + g.igst.toFixed(2) : ''})</span>
                <span>₹{(g.cgst + g.sgst + g.igst).toFixed(2)}</span>
              </div>
            ))}
            <div className="invoice-total-row text-xs font-medium border-t border-gray-300 pt-1">
              <span>Total GST:</span>
              <span>₹{totalGst.toFixed(2)}</span>
            </div>
            {previousBalance > 0 && (
              <div className="invoice-total-row bg-amber-50 rounded px-2 py-1">
                <span className="text-amber-700 font-medium">Previous Balance:</span>
                <span className="text-amber-700 font-bold">₹{previousBalance.toFixed(2)}</span>
              </div>
            )}
            {roundOff !== 0 && (
              <div className="invoice-total-row text-xs text-gray-500">
                <span>Round Off:</span>
                <span>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="invoice-grand-total">
              <span>Net Payable:</span>
              <span className="invoice-grand-amount">₹{computedFinalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="invoice-payment-section">
          <div className="invoice-bank-details">
            <h4 className="text-xs font-bold text-gray-700 mb-1">🏦 Payment Details:</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px] text-gray-600">
              <span>Bank: {PHARMACY.bankName}</span>
              <span>Branch: {PHARMACY.bankBranch}</span>
              <span>A/C No: {PHARMACY.bankAccountNo}</span>
              <span>IFSC: {PHARMACY.bankIfsc}</span>
              <span>UPI ID: {PHARMACY.bankUpi}</span>
            </div>
          </div>
          {paymentMode === 'upi' && (
            <div className="invoice-qr-placeholder">
              <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-[8px] text-gray-400 text-center leading-tight">UPI QR<br/>Scan</div>
            </div>
          )}
        </div>

        <div className="invoice-terms">
          <h4 className="text-xs font-bold text-gray-700 mb-1">📋 Terms & Conditions:</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px] text-gray-600">
            <span>1. Goods once sold will not be taken back.</span>
            <span>2. Check all medicines before leaving the store.</span>
            <span>3. Expired/expiring medicines are non-returnable.</span>
            <span>4. Please carry prescription for future purchases.</span>
            <span>5. Store credits valid for 30 days only.</span>
            <span>6. Subject to Hyderabad jurisdiction.</span>
          </div>
        </div>

        <div className="invoice-signature-grid">
          <div className="invoice-signature-block">
            <p className="text-xs font-semibold text-gray-700 mb-1">Authorized Signatory / Dispensing Pharmacist</p>
            <div className="invoice-signature-line">
              <p className="text-xs font-medium text-teal-700">{pharmacistName}</p>
              <p className="text-[9px] text-gray-400">(Dispensing Pharmacist)</p>
            </div>
          </div>
          <div className="invoice-signature-block">
            <p className="text-xs font-semibold text-gray-700 mb-1">Customer Acknowledgement</p>
            <div className="invoice-signature-line">
              <p className="text-xs text-gray-400 italic">Signature / Thumb</p>
            </div>
          </div>
          <div className="invoice-signature-block text-right">
            <p className="text-[9px] text-gray-500 font-mono">{PHARMACY.digitalSignature}</p>
            <p className="text-[8px] text-gray-400">License: {PHARMACY.licenseNo} | CIN: {PHARMACY.cin}</p>
          </div>
        </div>

        <div className="invoice-footer">
          <p className="font-semibold">🙏 Thank you for your purchase! Visit Again 🙏</p>
          {previousBalance > 0 && (
            <p className="text-[9px] text-amber-200 mt-0.5">⚠️ Please clear outstanding balance of ₹{previousBalance.toFixed(2)}</p>
          )}
          <p className="invoice-footer-meta">This is a computer-generated invoice | {PHARMACY.website} | Invoice: {billNumber}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!showPrintPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[900px] w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Tax Invoice Preview</h2>
                  <p className="text-xs text-gray-500">{billNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all text-sm font-medium shadow-md shadow-teal-200">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium shadow-md shadow-emerald-200">
                  <Download className="w-4 h-4" /> Save PDF
                </button>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6">{invoiceContent}</div>
            <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200 no-print">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle className="w-3.5 h-3.5 text-teal-600" /> Ready to print on A4 / thermal paper
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">Close</button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all text-sm font-medium">
                  <Printer className="w-4 h-4" /> Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[9999] bg-white print-only-render">{invoiceContent}</div>
      )}
    </>
  );
}
