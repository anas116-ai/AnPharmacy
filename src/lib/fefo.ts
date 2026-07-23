import { Medicine, SaleItem } from './types';

/**
 * FEFO Algorithm: First Expired First Out
 * 
 * Sorts available batches by expiry date (earliest first),
 * filters out expired batches, and selects enough quantity
 * starting from the earliest-expiring batch.
 */
export function calculateFEFO(
  batches: Medicine[],
  requestedQuantity: number
): { items: SaleItem[]; totalAmount: number; error?: string } {
  // Filter and sort valid batches
  const validBatches = batches
    .filter(b => b.quantity > 0 && b.status !== 'expired')
    .sort((a, b) => {
      // Sort by expiry date ascending (earliest first)
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

  if (validBatches.length === 0) {
    return { items: [], totalAmount: 0, error: 'No valid batches available' };
  }

  const totalAvailable = validBatches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalAvailable < requestedQuantity) {
    return {
      items: [],
      totalAmount: 0,
      error: `Insufficient stock. Available: ${totalAvailable}, Requested: ${requestedQuantity}`,
    };
  }

  let remaining = requestedQuantity;
  const items: SaleItem[] = [];
  let totalAmount = 0;

  for (const batch of validBatches) {
    if (remaining <= 0) break;

    const takeQuantity = Math.min(remaining, batch.quantity);
    const price = batch.selling_price || batch.purchase_price || 0;

    items.push({
      batchId: batch.id,
      batchNumber: batch.batch_number,
      medicineName: batch.name,
      quantity: takeQuantity,
      expiryDate: batch.expiry_date,
      purchasePrice: batch.purchase_price,
      sellingPrice: batch.selling_price,
    });

    totalAmount += takeQuantity * price;
    remaining -= takeQuantity;
  }

  return { items, totalAmount };
}
