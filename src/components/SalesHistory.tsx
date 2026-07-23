import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Eye, Printer, Download, DollarSign, ShoppingCart, User, Clock, ArrowUpDown, FileText, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatDate, formatCurrency } from '../lib/utils';
import InvoicePreview from './InvoicePreview';

interface SaleRecord {
  id: string;
  customer_name: string;
  medicine_name: string;
  quantity: number;
  total_amount: number;
  sale_date: string;
  processed_by: number;
  processed_by_name?: string;
}

export default function SalesHistory() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const perPage = 15;

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listSales();
        if (result.success) {
          setSales(result.sales || []);
        }
      }
    } catch (err) {
      console.error('Failed to load sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales
    .filter(sale => {
      const matchesSearch = !searchQuery ||
        sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.medicine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.id?.toLowerCase().includes(searchQuery.toLowerCase());

      const saleDate = sale.sale_date?.slice(0, 10) || '';
      const matchesDateFrom = !dateFrom || saleDate >= dateFrom;
      const matchesDateTo = !dateTo || saleDate <= dateTo;

      return matchesSearch && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.sale_date || 0).getTime();
        const dateB = new Date(b.sale_date || 0).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc'
          ? (b.total_amount || 0) - (a.total_amount || 0)
          : (a.total_amount || 0) - (b.total_amount || 0);
      }
    });

  const totalPages = Math.ceil(filteredSales.length / perPage);
  const paginatedSales = filteredSales.slice((page - 1) * perPage, page * perPage);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalItems = filteredSales.reduce((sum, s) => sum + (s.quantity || 0), 0);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const viewInvoice = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setShowInvoice(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Format sale into invoice data
  const buildInvoiceData = (sale: SaleRecord) => ({
    billNumber: sale.id?.slice(0, 8).toUpperCase() || 'N/A',
    billDateTime: sale.sale_date || new Date().toISOString(),
    counterId: 'HISTORY',
    pharmacistId: sale.processed_by || 0,
    pharmacistName: sale.processed_by_name || 'N/A',
    customerName: sale.customer_name || 'Walk-in',
    items: [{
      id: '1',
      medicineName: sale.medicine_name || 'Medicine',
      itemCode: null as string | null,
      hsnCode: undefined as string | undefined,
      batchNumber: '-',
      expiryDate: '',
      quantity: sale.quantity || 0,
      sellingPrice: sale.total_amount && sale.quantity ? sale.total_amount / sale.quantity : 0,
      discountPercent: 0,
      taxableValue: sale.total_amount || 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      netAmount: sale.total_amount || 0,
    }],
    summary: {
      totalItems: sale.quantity || 0,
      totalAmount: sale.total_amount || 0,
      totalDiscount: 0,
      taxableAmount: sale.total_amount || 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      grandTotal: sale.total_amount || 0,
    },
    paymentMode: 'history',
    billDiscount: 0,
    roundOff: 0,
    finalAmount: sale.total_amount || 0,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sales History</h2>
          <p className="text-sm text-gray-500 mt-1">View, search, and reprint past invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="safe" size="md">
            <DollarSign className="w-3.5 h-3.5 mr-1.5" />
            ₹{totalRevenue.toFixed(2)}
          </Badge>
          <Badge variant="outline-teal" size="md">
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
            {totalItems} Units
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card variant="bordered">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search by customer, medicine, or bill ID..."
                className="h-10 pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-10 w-36 text-xs"
              />
              <span className="text-gray-400 text-xs">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-10 w-36 text-xs"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }} className="gap-1.5">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card variant="bordered">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading sales history...</p>
            </div>
          ) : paginatedSales.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No sales found</p>
              <p className="text-xs text-gray-400 mt-1">Complete a sale to see it here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Invoice / Bill ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                      <span className="inline-flex items-center gap-1">Amount <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('date')}>
                      <span className="inline-flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Cashier</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedSales.map((sale, idx) => (
                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{(page - 1) * perPage + idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">
                          {sale.id?.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium text-gray-800">{sale.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600">{sale.medicine_name?.slice(0, 40)}{(sale.medicine_name?.length || 0) > 40 ? '...' : ''}</span>
                        <span className="text-gray-400 ml-1">×{sale.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        ₹{sale.total_amount?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600 text-xs">{formatDate(sale.sale_date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-500">{sale.processed_by_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => viewInvoice(sale)}
                          className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors group"
                          title="View & Reprint"
                        >
                          <Eye className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredSales.length)} of {filteredSales.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pageNum = start + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Reprint Dialog */}
      {showInvoice && selectedSale && (
        <div className="fixed inset-0 z-50">
          <InvoicePreview
            {...buildInvoiceData(selectedSale)}
            onClose={() => { setShowInvoice(false); setSelectedSale(null); }}
            onPrint={handlePrint}
          />
        </div>
      )}
    </div>
  );
}
