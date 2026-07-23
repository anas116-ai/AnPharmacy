import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sales from '../Sales';

// ── Mock i18next ──
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// ── Mock zustand stores ──
const mockUser = { id: 1, displayName: 'Pharmacist John', role: 'pharmacist', email: 'john@pharmacy.com' };

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ user: mockUser }),
}));

const mockMedicines = [
  {
    id: 1, name: 'Paracetamol 500mg', batch_number: 'BT001', company: 'PharmaCorp',
    quantity: 100, purchase_price: 25, selling_price: 45, mrp: 50,
    purchase_gst_percent: 12, expiry_date: '2027-12-31', status: 'safe',
    barcode: '8901234567890', item_code: 'ITEM001', hsn_code: '3004',
  },
  {
    id: 2, name: 'Amoxicillin 250mg', batch_number: 'BT002', company: 'MediLife',
    quantity: 50, purchase_price: 80, selling_price: 120, mrp: 135,
    purchase_gst_percent: 12, expiry_date: '2026-06-15', status: 'safe',
    barcode: '8901234567891', item_code: 'ITEM002', hsn_code: '3004',
  },
];

vi.mock('../../stores/stockStore', () => ({
  useStockStore: () => ({ medicines: mockMedicines, setMedicines: vi.fn() }),
}));

// ── Mock UI sub-components ──
vi.mock('../ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="mock-select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock('../InvoicePreview', () => ({
  default: () => <div data-testid="invoice-preview">Invoice Preview</div>,
}));

const mockCustomers = [
  { id: 1, name: 'John Doe', phone: '9876543210', email: 'john@example.com', address: '123 Main St', gstin: '29ABCDE1234F1Z5', credit_limit: 50000, current_balance: 10000, type: 'retail' },
  { id: 2, name: 'Jane Smith', phone: '9876543211', email: null, address: null, gstin: null, credit_limit: 25000, current_balance: 5000, type: 'retail' },
];

const defaultElectronAPI = () => ({
  listCustomers: vi.fn().mockResolvedValue({ success: true, customers: mockCustomers }),
  listStock: vi.fn().mockResolvedValue({ success: true, medicines: mockMedicines }),
  createCustomer: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ success: true, customer: { id: 3, ...data } })),
  processSale: vi.fn().mockResolvedValue({ success: true, billNumber: 'BILL-20240101-ABCD' }),
});

describe('Sales (POS) Component', () => {
  beforeEach(() => {
    (window as any).electronAPI = defaultElectronAPI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the sales header with title', async () => {
      render(<Sales />);
      await waitFor(() => {
        expect(screen.getByText('Pharmacy POS - Sales')).toBeTruthy();
      });
    });

    it('should render Customer Details and Search Medicine cards', async () => {
      render(<Sales />);
      await waitFor(() => {
        expect(screen.getByText('Customer Details')).toBeTruthy();
        expect(screen.getByText('Search Medicine')).toBeTruthy();
      });
    });

    it('should show empty cart state when no items added', async () => {
      render(<Sales />);
      await waitFor(() => {
        expect(screen.getByText('Cart is empty')).toBeTruthy();
      });
    });

    it('should show medicine count badge', async () => {
      render(<Sales />);
      await waitFor(() => {
        expect(screen.getByText(/2 Medicines/)).toBeTruthy();
      });
    });
  });

  describe('Customer Search', () => {
    it('should load customers on mount', async () => {
      render(<Sales />);
      await waitFor(() => {
        expect(window.electronAPI.listCustomers).toHaveBeenCalled();
      });
    });

    it('should show customer suggestions when typing', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listCustomers).toHaveBeenCalled(); });

      const searchInput = screen.getByPlaceholderText('Search by name or phone...') as HTMLInputElement;
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
      });
    });

    it('should allow adding a new customer', () => {
      render(<Sales />);
      fireEvent.click(screen.getByText('New'));
      expect(screen.getByPlaceholderText('Customer/shop name')).toBeTruthy();
    });
  });

  describe('Medicine Search & Cart', () => {
    it('should show medicine suggestions when typing', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });

      const searchInput = screen.getByPlaceholderText('Search medicine, batch, barcode...');
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Para' } });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();
      });
    });

    it('should select a medicine and show Add to Cart button', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });

      const searchInput = screen.getByPlaceholderText('Search medicine, batch, barcode...');
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Para' } });
      await waitFor(() => { expect(screen.getByText('Paracetamol 500mg')).toBeTruthy(); });
      fireEvent.mouseDown(screen.getByText('Paracetamol 500mg'));
      await waitFor(() => {
        expect(screen.getByText('Add to Cart')).toBeTruthy();
      });
    });

    it('should add item to cart and update cart count', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });

      // Search and select medicine
      const searchInput = screen.getByPlaceholderText('Search medicine, batch, barcode...');
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Para' } });
      await waitFor(() => { expect(screen.getByText('Paracetamol 500mg')).toBeTruthy(); });
      fireEvent.mouseDown(screen.getByText('Paracetamol 500mg'));
      await waitFor(() => { expect(screen.getByText('Add to Cart')).toBeTruthy(); });

      // Add to cart
      fireEvent.click(screen.getByText('Add to Cart'));

      await waitFor(() => {
        // Cart should show 1 item
        expect(screen.getByText(/Cart \(1 items/)).toBeTruthy();
        expect(screen.queryByText('Cart is empty')).toBeNull();
      });
    });

    it('should clear cart when Clear All is clicked', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });

      // Add item to cart first
      const searchInput = screen.getByPlaceholderText('Search medicine, batch, barcode...');
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Para' } });
      await waitFor(() => { expect(screen.getByText('Paracetamol 500mg')).toBeTruthy(); });
      fireEvent.mouseDown(screen.getByText('Paracetamol 500mg'));
      await waitFor(() => { expect(screen.getByText('Add to Cart')).toBeTruthy(); });
      fireEvent.click(screen.getByText('Add to Cart'));
      await waitFor(() => { expect(screen.getByText(/Cart \(1 items/)).toBeTruthy(); });

      // Clear all
      const clearBtns = screen.getAllByText('Clear All');
      fireEvent.click(clearBtns[0]);

      await waitFor(() => {
        expect(screen.getByText('Cart is empty')).toBeTruthy();
      });
    });
  });

  describe('Complete Sale Flow', () => {
    it('should show Complete Sale button when cart has items', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });

      // Button should not be visible initially (empty cart)
      expect(screen.queryByText(/Complete Sale/)).toBeNull();

      // Add medicine to cart
      const searchInput = screen.getByPlaceholderText('Search medicine, batch, barcode...');
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Para' } });
      await waitFor(() => { expect(screen.getByText('Paracetamol 500mg')).toBeTruthy(); });
      fireEvent.mouseDown(screen.getByText('Paracetamol 500mg'));
      await waitFor(() => { expect(screen.getByText('Add to Cart')).toBeTruthy(); });
      fireEvent.click(screen.getByText('Add to Cart'));
      await waitFor(() => { expect(screen.getByText(/Cart \(1 items/)).toBeTruthy(); });

      // Button should now be visible
      expect(screen.getByText(/Complete Sale/)).toBeTruthy();
    });

    it('should show error when completing sale without customer name', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });

      // Add a medicine to cart
      const searchInput = screen.getByPlaceholderText('Search medicine, batch, barcode...');
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Para' } });
      await waitFor(() => { expect(screen.getByText('Paracetamol 500mg')).toBeTruthy(); });
      fireEvent.mouseDown(screen.getByText('Paracetamol 500mg'));
      await waitFor(() => { expect(screen.getByText('Add to Cart')).toBeTruthy(); });
      fireEvent.click(screen.getByText('Add to Cart'));
      await waitFor(() => { expect(screen.getByText(/Cart \(1 items/)).toBeTruthy(); });

      // Clear customer name
      const nameInput = screen.getByPlaceholderText('Customer/shop name') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: '' } });
      expect(nameInput.value).toBe('');

      // Click complete sale
      const completeBtn = screen.getByText(/Complete Sale/);
      fireEvent.click(completeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Customer name is required/)).toBeTruthy();
      });
    });
  });

  describe('Payment Modes', () => {
    it('should show payment mode options when cart has items', async () => {
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });

      // Add medicine to cart
      const searchInput = screen.getByPlaceholderText('Search medicine, batch, barcode...');
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Para' } });
      await waitFor(() => { expect(screen.getByText('Paracetamol 500mg')).toBeTruthy(); });
      fireEvent.mouseDown(screen.getByText('Paracetamol 500mg'));
      await waitFor(() => { expect(screen.getByText('Add to Cart')).toBeTruthy(); });
      fireEvent.click(screen.getByText('Add to Cart'));
      await waitFor(() => { expect(screen.getByText(/Cart \(1 items/)).toBeTruthy(); });

      await waitFor(() => {
        expect(screen.getAllByText('Cash').length).toBeGreaterThan(0);
        expect(screen.getByText('UPI')).toBeTruthy();
        expect(screen.getByText('Card')).toBeTruthy();
        expect(screen.getByText('Credit Ledger')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API failure on mount gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (window as any).electronAPI.listStock = vi.fn().mockRejectedValue(new Error('Load Failed'));
      render(<Sales />);
      await waitFor(() => { expect(window.electronAPI.listStock).toHaveBeenCalled(); });
      consoleSpy.mockRestore();
    });

    it('should render without crashing when electronAPI is missing', () => {
      delete (window as any).electronAPI;
      render(<Sales />);
      expect(screen.getByText('Pharmacy POS - Sales')).toBeTruthy();
    });
  });
});
