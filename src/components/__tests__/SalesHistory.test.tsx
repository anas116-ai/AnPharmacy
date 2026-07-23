import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SalesHistory from '../SalesHistory';

// ── Mock i18next ──
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// ── Mock InvoicePreview ──
vi.mock('../InvoicePreview', () => ({
  default: () => <div data-testid="invoice-preview">Invoice Preview</div>,
}));

// ── Generate mock sales data ──
const generateMockSales = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `S${String(i + 1).padStart(3, '0')}`,
    customer_name: i % 2 === 0 ? 'John Doe' : 'Jane Smith',
    medicine_name: i % 3 === 0 ? 'Paracetamol 500mg' : i % 3 === 1 ? 'Amoxicillin 250mg' : 'Cough Syrup',
    quantity: (i % 10) + 1,
    total_amount: (i % 50) * 10 + 50,
    sale_date: new Date(2024, 5, i + 1).toISOString(),
    processed_by: 1,
    processed_by_name: 'Pharmacist John',
  }));

const mockSales = generateMockSales(25);

const defaultElectronAPI = () => ({
  listSales: vi.fn().mockResolvedValue({ success: true, sales: mockSales }),
});

describe('SalesHistory Component', () => {
  beforeEach(() => {
    (window as any).electronAPI = defaultElectronAPI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the header', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        expect(screen.getByText('Sales History')).toBeTruthy();
      });
    });

    it('should show badges with revenue and units', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        const revenueElements = screen.getAllByText(/₹/);
        expect(revenueElements.length).toBeGreaterThan(0);
        expect(screen.getByText(/Units/)).toBeTruthy();
      });
    });

    it('should render search input', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by customer, medicine, or bill ID/i)).toBeTruthy();
      });
    });

    it('should render date filter inputs', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        // Date inputs should be rendered after component loads
        expect(document.querySelectorAll('input[type="date"]').length).toBe(2);
      });
    });
  });

  describe('Data Loading', () => {
    it('should load sales on mount', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        expect(window.electronAPI.listSales).toHaveBeenCalled();
      });
    });

    it('should display sales data after loading', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        // Multiple John Doe entries exist in the table
        const johnElements = screen.getAllByText('John Doe');
        expect(johnElements.length).toBeGreaterThan(0);
        const janeElements = screen.getAllByText('Jane Smith');
        expect(janeElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty sales list gracefully', async () => {
      (window as any).electronAPI.listSales = vi.fn().mockResolvedValue({ success: true, sales: [] });
      render(<SalesHistory />);
      await waitFor(() => {
        expect(window.electronAPI.listSales).toHaveBeenCalled();
      });
    });

    it('should handle API failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (window as any).electronAPI.listSales = vi.fn().mockRejectedValue(new Error('Load Failed'));
      render(<SalesHistory />);
      await waitFor(() => { expect(window.electronAPI.listSales).toHaveBeenCalled(); });
      consoleSpy.mockRestore();
    });

    it('should render without crashing when electronAPI is missing', () => {
      delete (window as any).electronAPI;
      render(<SalesHistory />);
      expect(screen.getByText('Sales History')).toBeTruthy();
    });
  });

  describe('Search & Filter', () => {
    it('should filter sales by customer name', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        const johnElements = screen.getAllByText('John Doe');
        expect(johnElements.length).toBeGreaterThan(0);
      });

      const searchInput = screen.getByPlaceholderText(/Search by customer, medicine, or bill ID/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Jane' } });

      // After filtering for 'Jane', no 'John Doe' entries should remain
      await waitFor(() => {
        const johnElements = screen.queryAllByText('John Doe');
        expect(johnElements.length).toBe(0);
      });
    });

    it('should clear search when clear button clicked', async () => {
      render(<SalesHistory />);
      await waitFor(() => { expect(screen.getByText('Sales History')).toBeTruthy(); });

      const searchInput = screen.getByPlaceholderText(/Search by customer, medicine, or bill ID/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Jane' } });
      expect(searchInput.value).toBe('Jane');

      fireEvent.click(screen.getByText('Clear'));
      expect(searchInput.value).toBe('');
    });
  });

  describe('Pagination', () => {
    it('should show pagination controls for multiple pages', async () => {
      render(<SalesHistory />);
      await waitFor(() => {
        // With 25 items and perPage=15, expect page 1 and page 2 buttons
        const pageOneBtns = screen.getAllByText('1');
        expect(pageOneBtns.length).toBeGreaterThan(0);
        const pageTwoBtns = screen.getAllByText('2');
        expect(pageTwoBtns.length).toBeGreaterThan(0);
      });
    });
  });
});
