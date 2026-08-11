import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Building2, Calendar, FileText, IndianRupee, RefreshCw, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Button } from './ui/button';

export default function Purchases() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listPurchases();
        if (result.success) {
          setPurchases(result.purchases || []);
        }
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Stats
  const totalPurchases = purchases.length;
  const totalUnits = purchases.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);
  const totalValue = purchases.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">{t('purchases.title')}</h2>
            <p className="text-xs text-muted-foreground">{totalPurchases} purchase records</p>
          </div>
        </div>
        <Button
          onClick={loadPurchases}
          variant="outline-teal"
          size="sm"
          className="gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Purchases</p>
              <p className="text-lg font-bold text-foreground">{totalPurchases}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-light rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Units</p>
              <p className="text-lg font-bold text-foreground">{totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-light rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Value</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Purchases List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="skeleton h-4 w-48 mb-3" />
              <div className="skeleton h-3 w-32" />
            </div>
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">{t('common.noData')}</p>
            <p className="text-muted-foreground/70 text-xs mt-1">No purchase records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase: any) => (
            <div
              key={purchase.id}
              className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:border-accent/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-foreground">{purchase.medicine_name}</span>
                    <Badge variant="outline-teal" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      Purchase
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Batch: <span className="font-mono text-foreground/80">{purchase.batch_number}</span>
                    </span>
                    {purchase.supplier && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {purchase.supplier}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(purchase.purchase_date)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xl font-bold text-foreground">{purchase.quantity}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">units</p>
                  <p className="text-sm font-semibold text-accent mt-1">{formatCurrency(purchase.total_amount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                {purchase.purchase_price && (
                  <span>Rate: <span className="font-medium text-foreground/80">{formatCurrency(purchase.purchase_price)}</span>/unit</span>
                )}
                {purchase.added_by_name && (
                  <span>Added by: <span className="font-medium text-foreground/80">{purchase.added_by_name}</span></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
