/**
 * Audit Log Module (Step 13 of Gold Standard)
 * 
 * Records every user action with full traceability:
 * - Imported By
 * - Time
 * - Machine/Device
 * - Invoice reference
 * - Corrections made
 * - Confidence scores
 */

export interface AuditEntry {
  id?: number;
  userId: number;
  userName: string;
  action: AuditAction;
  details: string;
  metadata: AuditMetadata;
  timestamp: string;
}

export type AuditAction = 
  | 'invoice_import'
  | 'invoice_review'
  | 'stock_add'
  | 'stock_update'
  | 'stock_delete'
  | 'sale_create'
  | 'sale_cancel'
  | 'user_login'
  | 'user_create'
  | 'user_update'
  | 'backup_create'
  | 'backup_restore'
  | 'correction'
  | 'system_error'
  | 'system_config'
  | 'ocr_scan'
  | 'ocr_correction';

export interface AuditMetadata {
  deviceId?: string;
  machineName?: string;
  ipAddress?: string;
  invoiceRef?: string;
  corrections?: CorrectionRecord[];
  confidence?: number;
  fieldConfidences?: Record<string, number>;
  itemCount?: number;
  errorMessage?: string;
}

export interface CorrectionRecord {
  field: string;
  originalValue: string;
  correctedValue: string;
  reason?: string;
}

// ── Generate device fingerprint ─────────────────────────────────────

function getDeviceId(): string {
  try {
    // Use navigator properties for browser fingerprinting
    const components = [
      navigator.userAgent || '',
      navigator.language || '',
      screen.width + 'x' + screen.height,
      navigator.hardwareConcurrency || '',
      navigator.platform || '',
    ];
    const hash = components.join('||');
    // Simple hash
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result = ((result << 5) - result) + hash.charCodeAt(i);
      result = result & result;
    }
    return 'DEV-' + Math.abs(result).toString(16).toUpperCase().slice(0, 8);
  } catch {
    return 'DEV-UNKNOWN';
  }
}

// ── Log an audit entry ──────────────────────────────────────────────

export async function logAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<boolean> {
  try {
    const fullEntry: AuditEntry = {
      ...entry,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      metadata: {
        ...entry.metadata,
        deviceId: entry.metadata?.deviceId || getDeviceId(),
        machineName: entry.metadata?.machineName || navigator.platform || 'Unknown',
      },
    };
    
    // Try to log via Electron main process
    if (window.electronAPI && window.electronAPI.logAudit) {
      const result = await window.electronAPI.logAudit({
        userId: fullEntry.userId,
        action: fullEntry.action,
        details: JSON.stringify({
          message: fullEntry.details,
          metadata: fullEntry.metadata,
          userName: fullEntry.userName,
        }),
      });
      return result.success;
    }
    
    // Fallback: store in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('audit_log') || '[]');
      existing.push(fullEntry);
      // Keep last 1000 entries
      if (existing.length > 1000) {
        existing.splice(0, existing.length - 1000);
      }
      localStorage.setItem('audit_log', JSON.stringify(existing));
    } catch {
      // localStorage might be full
    }
    
    return true;
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    return false;
  }
}

// ── Specific audit helpers ──────────────────────────────────────────

export function logInvoiceImport(
  userId: number,
  userName: string,
  itemCount: number,
  confidence: number,
  fieldConfidences: Record<string, number>,
  invoiceRef?: string
): Promise<boolean> {
  return logAuditEntry({
    userId,
    userName,
    action: 'invoice_import',
    details: `Imported ${itemCount} items from invoice${invoiceRef ? ` (${invoiceRef})` : ''} with ${confidence}% confidence`,
    metadata: {
      invoiceRef,
      confidence,
      fieldConfidences,
      itemCount,
    },
  });
}

export function logCorrection(
  userId: number,
  userName: string,
  corrections: CorrectionRecord[],
  invoiceRef?: string
): Promise<boolean> {
  return logAuditEntry({
    userId,
    userName,
    action: 'ocr_correction',
    details: `Corrected ${corrections.length} field(s): ${corrections.map(c => `${c.field}: "${c.originalValue}" → "${c.correctedValue}"`).join(', ')}`,
    metadata: {
      invoiceRef,
      corrections,
    },
  });
}

export function logError(
  userId: number | null,
  errorMessage: string,
  action?: AuditAction
): Promise<boolean> {
  return logAuditEntry({
    userId: userId || 0,
    userName: 'System',
    action: action || 'system_error',
    details: errorMessage,
    metadata: {
      errorMessage,
    },
  });
}

export function logStockTransaction(
  userId: number,
  userName: string,
  action: 'stock_add' | 'stock_update' | 'stock_delete',
  details: string,
  itemCount?: number
): Promise<boolean> {
  return logAuditEntry({
    userId,
    userName,
    action,
    details,
    metadata: { itemCount },
  });
}

// ── Retrieve recent audit entries ───────────────────────────────────

export function getRecentAuditEntries(limit: number = 50): AuditEntry[] {
  try {
    const data = localStorage.getItem('audit_log');
    if (!data) return [];
    const entries: AuditEntry[] = JSON.parse(data);
    return entries.slice(-limit).reverse();
  } catch {
    return [];
  }
}

export function getAuditByAction(action: AuditAction, limit: number = 20): AuditEntry[] {
  try {
    const data = localStorage.getItem('audit_log');
    if (!data) return [];
    const entries: AuditEntry[] = JSON.parse(data);
    return entries.filter(e => e.action === action).slice(-limit).reverse();
  } catch {
    return [];
  }
}