import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Reports from '../Reports';

// ── Mock i18next ──
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'reports.stock': 'Stock Report',
        'reports.expiry': 'Expiry Report',
        'reports.sales': 'Sales Report',
        'reports.export': 'Export CSV',
        'reports.uniqueMedicines': 'Unique Medicines',
        'reports.totalBatches': 'Total Batches',
        'reports.totalUnits': 'Total Units',
        'reports.totalValue': 'Total Value',
        'reports.avgPrice': 'Avg Price',
        'reports.totalRevenue': 'Total Revenue',
        'reports.avgSaleValue': 'Avg Sale Value',
      };
      return map[key] || key;
    },
  }),
}));

// ── Mock zustand stores ──
vi.mock('../../stores/stockStore', () => ({
  useStockStore: () => ({
    medicines: [],
  }),
}));

// ── Mock chart components ──
vi.mock('../charts/StockBarChart', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="stock-bar-chart">{title}</div>
  ),
}));

vi.mock('../charts/ExpiryPieChart', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="expiry-pie-chart">{title}</div>
  ),
  buildDefaultData: (data: any) => data,
}));

vi.mock('../charts/SalesTrendChart', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="sales-trend-chart">{title}</div>
  ),
  MOCK_SALES_DATA: [],
}));

// ── Generate mock sales ──
const generateMockSales = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `S${String(i + 1).padStart(3, '0')}`,
    customer_name: i % 2 === 0 ? 'John Doe' : 'Jane Smith',
    medicine_name: 'Paracetamol',
    quantity: (i % 10) + 1,
    total_amount: (i % 10) * 50 + 100,
    sale_date: new Date(2024, 5, i + 1).toISOString(),
  }));

const mockStockReport = {
  success: true,
  stats: {
    uniqueMedicines: 5,
    totalBatches: 10,
    totalUnits: 500,
    totalValue: 125000,
    avgPricePerUnit: 250,
  },
  medicines: [
    {
      id: 1, name: 'Paracetamol', batch_number: 'BT001', company: 'PharmaCorp',
      quantity: 100, purchase_price: 50, selling_price: 75,
      mfg_date: '2024-01-01', expiry_date: '2027-12-31', status: 'safe',
      days_remaining: 365, low_stock_alert: 20,
    },
    {
      id: 2, name: 'Amoxicillin', batch_number: 'BT002', company: 'MediLife',
      quantity: 0, purchase_price: 120, selling_price: 180,
      mfg_date: '2024-03-01', expiry_date: '2026-06-15', status: 'warning',
      days_remaining: 120, low_stock_alert: 10,
    },
  ],
};

const mockExpiryReport = {
  success: true,
  categories: {
    expired: [{
      id: 3, name: 'Expired Medicine', batch_number: 'BT003',
      company: 'OldPharma', quantity: 10, expiry_date: '2023-01-01',
      days_remaining: -365, purchase_price: 100,
    }],
    critical: [{
      id: 4, name: 'Critical Med', batch_number: 'BT004',
      company: 'CriticalPharma', quantity: 20,
      expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      days_remaining: 30, purchase_price: 200,
    }],
    warning: [],
    safe: [],
  },
};

const defaultElectronAPI = () => ({
  getStockReport: vi.fn().mockResolvedValue(mockStockReport),
  getExpiryReport: vi.fn().mockResolvedValue(mockExpiryReport),
  getExpiryTierReport: vi.fn().mockResolvedValue({
    success: true,
    tiers: { expired: [], d90: [], d60: [], d30: [], safe: [] },
    stats: { atRiskValue: 0, expired: 0, d90: 0, d60: 0, d30: 0 },
  }),
  getProfitReport: vi.fn().mockResolvedValue({
    success: true,
    stats: { totalPurchaseValue: 50000, totalSaleValue: 75000, totalRealProfit: 25000, marginPercent: 33.33, totalInputGst: 2500, totalOutputGst: 4500 },
    rows: [],
  }),
  getSalesReport: vi.fn().mockResolvedValue({
    success: true,
    stats: { totalRevenue: 75000, totalSales: 25, totalUnitsSold: 100, avgSaleValue: 3000 },
    sales: generateMockSales(25),
  }),
  openExternal: vi.fn().mockResolvedValue(undefined),
});

describe('Reports Component', () => {
  beforeEach(() => {
    (window as any).electronAPI = defaultElectronAPI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering & Navigation', () => {
    it('should render all tab buttons', () => {
      render(<Reports />);
      expect(screen.getByText('Stock Report')).toBeTruthy();
      expect(screen.getByText('Expiry Report')).toBeTruthy();
      expect(screen.getByText('Expiry Tiers')).toBeTruthy();
      expect(screen.getByText('Profit/GST')).toBeTruthy();
      expect(screen.getByText('Sales Report')).toBeTruthy();
    });

    it('should show Export CSV and Email buttons', () => {
      render(<Reports />);
      expect(screen.getByText('Export CSV')).toBeTruthy();
      expect(screen.getByText('Email')).toBeTruthy();
    });

    it('should call getStockReport on mount with stock tab active', async () => {
      render(<Reports />);
      await waitFor(() => {
        expect(window.electronAPI.getStockReport).toHaveBeenCalled();
      });
    });

    it('should switch to expiry tab when clicked', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Expiry Report'));
      await waitFor(() => {
        expect(window.electronAPI.getExpiryReport).toHaveBeenCalled();
      });
    });

    it('should switch to sales tab when clicked', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Sales Report'));
      await waitFor(() => {
        expect(window.electronAPI.getSalesReport).toHaveBeenCalled();
      });
    });

    it('should switch to Profit/GST tab when clicked', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Profit/GST'));
      await waitFor(() => {
        expect(window.electronAPI.getProfitReport).toHaveBeenCalled();
      });
    });

    it('should switch to Expiry Tiers tab when clicked', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Expiry Tiers'));
      await waitFor(() => {
        expect(window.electronAPI.getExpiryTierReport).toHaveBeenCalled();
      });
    });
  });

  describe('Stock Report Tab', () => {
    it('should display KPI cards with stock values', async () => {
      render(<Reports />);
      await waitFor(() => {
        expect(screen.getAllByText('5').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('10').length).toBeGreaterThan(0);
      expect(screen.getAllByText('500').length).toBeGreaterThan(0);
    });

    it('should display medicine names in stock table', async () => {
      render(<Reports />);
      await waitFor(() => {
        const paraElements = screen.getAllByText('Paracetamol');
        expect(paraElements.length).toBeGreaterThan(0);
        const amoxElements = screen.getAllByText('Amoxicillin');
        expect(amoxElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Expiry Report Tab', () => {
    it('should show expired and critical category cards', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Expiry Report'));
      await waitFor(() => {
        expect(screen.getByText('Expired Items')).toBeTruthy();
        expect(screen.getByText('Critical Items (≤90 days)')).toBeTruthy();
      });
    });

    it('should render expiry pie chart', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Expiry Report'));
      await waitFor(() => {
        expect(screen.getByTestId('expiry-pie-chart')).toBeTruthy();
      });
    });
  });

  describe('Sales Report Tab', () => {
    it('should show total sales count in KPI cards', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Sales Report'));
      await waitFor(() => {
        // totalSales from stats is 25 (matches 25 generated sales)
        expect(screen.getAllByText('25').length).toBeGreaterThan(0);
      });
    });

    it('should render sales trend chart', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Sales Report'));
      await waitFor(() => {
        expect(screen.getByTestId('sales-trend-chart')).toBeTruthy();
      });
    });

    it('should show customer names in sales table', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Sales Report'));
      await waitFor(() => {
        const johnElements = screen.getAllByText('John Doe');
        expect(johnElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Export CSV', () => {
    it('should render Export CSV button', async () => {
      render(<Reports />);
      await waitFor(() => { expect(screen.getByText('Stock Report')).toBeTruthy(); });
      expect(screen.getByText('Export CSV')).toBeTruthy();
    });
  });

  describe('Email Report', () => {
    it('should open mailto link via electronAPI', async () => {
      render(<Reports />);
      await waitFor(() => { expect(screen.getByText('Stock Report')).toBeTruthy(); });

      fireEvent.click(screen.getByText('Email'));
      await waitFor(() => {
        expect(window.electronAPI.openExternal).toHaveBeenCalled();
        const url = (window.electronAPI.openExternal as any).mock.calls[0][0];
        expect(url).toContain('mailto:');
        expect(url).toContain('subject=');
        expect(url).toContain('body=');
      });
    });
  });

  describe('Filters', () => {
    it('should render search input and clear button', () => {
      render(<Reports />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
      expect(screen.getByText('Clear')).toBeTruthy();
    });

    it('should show date range filters for sales tab', async () => {
      render(<Reports />);
      fireEvent.click(screen.getByText('Sales Report'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('From')).toBeTruthy();
        expect(screen.getByPlaceholderText('To')).toBeTruthy();
      });
    });

    it('should clear search when clear button clicked', () => {
      render(<Reports />);
      const searchInput = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(searchInput.value).toBe('test');
      fireEvent.click(screen.getByText('Clear'));
      expect(searchInput.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle API rejection gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (window as any).electronAPI.getStockReport = vi.fn().mockRejectedValue(new Error('API Error'));
      render(<Reports />);
      await waitFor(() => { expect(consoleSpy).toHaveBeenCalled(); });
      consoleSpy.mockRestore();
    });

    it('should render without crashing when electronAPI is missing', () => {
      delete (window as any).electronAPI;
      render(<Reports />);
      expect(screen.getByText('Stock Report')).toBeTruthy();
    });
  });
});
