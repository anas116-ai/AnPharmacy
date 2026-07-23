import { Medicine } from './types';

/**
 * Real margin per unit for a batch:
 *   Margin = Selling Price − Purchase Price − GST
 * where GST is computed on the respective sides:
 *   - Purchase side GST = purchasePrice * purchaseGstPercent/100
 *   - Sale side GST     = sellingPrice * saleGstPercent/100
 * Net GST impact = saleGST − purchaseGST (input credit used to offset output).
 */
export function realMargin(m: {
  purchase_price: number | null;
  selling_price: number | null;
  purchase_gst_percent?: number | null;
  sale_gst_percent?: number | null;
}): number | null {
  const pp = m.purchase_price || 0;
  const sp = m.selling_price || 0;
  if (sp === 0 && pp === 0) return null;

  const purchaseGst = pp * ((m.purchase_gst_percent || 0) / 100);
  const saleGst = sp * ((m.sale_gst_percent || 0) / 100);
  // Input GST is recoverable (credit); only net GST difference reduces margin.
  const netGst = saleGst - purchaseGst;

  return sp - pp - netGst;
}

export function realMarginPercent(m: {
  purchase_price: number | null;
  selling_price: number | null;
  purchase_gst_percent?: number | null;
  sale_gst_percent?: number | null;
}): number | null {
  const sp = m.selling_price || 0;
  if (sp === 0) return null;
  const margin = realMargin(m);
  if (margin == null) return null;
  return (margin / sp) * 100;
}

export interface ProfitSummary {
  totalPurchaseValue: number;
  totalSaleValue: number;
  totalInputGst: number;
  totalOutputGst: number;
  totalRealProfit: number;
  marginPercent: number;
  batchCount: number;
}

export function computeProfitSummary(medicines: Medicine[]): ProfitSummary {
  let totalPurchaseValue = 0;
  let totalSaleValue = 0;
  let totalInputGst = 0;
  let totalOutputGst = 0;
  let totalRealProfit = 0;
  let batchCount = 0;

  for (const m of medicines) {
    const qty = m.quantity || 0;
    if (qty <= 0) continue;
    batchCount += 1;

    const pp = m.purchase_price || 0;
    const sp = m.selling_price || 0;
    const inGst = pp * ((m.purchase_gst_percent || 0) / 100) * qty;
    const outGst = sp * ((m.sale_gst_percent || 0) / 100) * qty;

    totalPurchaseValue += pp * qty;
    totalSaleValue += sp * qty;
    totalInputGst += inGst;
    totalOutputGst += outGst;
    totalRealProfit += (sp - pp) * qty - (outGst - inGst);
  }

  const marginPercent = totalSaleValue > 0
    ? (totalRealProfit / totalSaleValue) * 100
    : 0;

  return {
    totalPurchaseValue,
    totalSaleValue,
    totalInputGst,
    totalOutputGst,
    totalRealProfit,
    marginPercent,
    batchCount,
  };
}

export type ExpiryTier = 'expired' | 'd90' | 'd60' | 'd30' | 'safe' | 'unknown';

export function expiryTier(daysRemaining: number | null): ExpiryTier {
  if (daysRemaining == null) return 'unknown';
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'd30';
  if (daysRemaining <= 60) return 'd60';
  if (daysRemaining <= 90) return 'd90';
  return 'safe';
}

export const EXPIRY_TIER_LABELS: Record<ExpiryTier, string> = {
  expired: 'Expired',
  d90: '≤ 90 days',
  d60: '≤ 60 days',
  d30: '≤ 30 days',
  safe: 'Safe (>90 days)',
  unknown: 'No expiry set',
};
