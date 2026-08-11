import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Database, TrendingUp, Download, Upload, RefreshCw, Trash2, FileText, Package, Columns, Lightbulb, AlertTriangle, CheckCircle, X, Search, Filter, List, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { cn } from '../lib/utils';
import { learningEngine } from '../lib/invoiceLearningEngine';
import type { LearningStats, LearnedPattern, CorrectionRecord } from '../lib/invoiceLearningEngine';
import { headerMapper } from '../lib/headerMapper';

// ═══════════════════════════════════════════════════════════════════
// SUPPLIER PROFILE MANAGER COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function SupplierProfileManager() {
  const [learningStats, setLearningStats] = useState<LearningStats>(learningEngine.getStats());
  const [topPatterns, setTopPatterns] = useState<LearnedPattern[]>([]);
  const [recentCorrections, setRecentCorrections] = useState<CorrectionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'patterns' | 'corrections' | 'headers'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<'success' | 'error' | null>(null);
  const [patternTypeFilter, setPatternTypeFilter] = useState<string>('all');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setLearningStats(learningEngine.getStats());
    setTopPatterns(learningEngine.getTopPatterns(50));
    setRecentCorrections(learningEngine.getRecentCorrections(20));
  };

  // ── Filtered patterns ─────────────────────────────────────────
  const filteredPatterns = useMemo(() => {
    let patterns = topPatterns;

    if (patternTypeFilter !== 'all') {
      patterns = patterns.filter(p => p.patternType === patternTypeFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      patterns = patterns.filter(p =>
        p.pattern.toLowerCase().includes(q) ||
        p.replacement.toLowerCase().includes(q) ||
        p.context?.toLowerCase().includes(q)
      );
    }

    return patterns;
  }, [topPatterns, patternTypeFilter, searchQuery]);

  // ── Header mapping demo ───────────────────────────────────────
  const headerMappingDemo = useMemo(() => {
    const sampleHeaders = [
      'Product Name', 'Batch No', 'Expiry', 'Qty', 'Rate', 'Amount',
      'Medicine', 'Lot Number', 'Exp Date', 'Quantity', 'Unit Price', 'Total',
      'Item Description', 'Batch', 'Mfg Date', 'Packs', 'Price', 'Value',
      'HSN', 'GST%', 'Manufacturer', 'Free Qty', 'Discount %',
    ];

    return sampleHeaders.map(h => {
      const result = headerMapper.mapHeaders(h + '\n1 2 3');
      const matched = result.find(r => r.originalText === h);
      return {
        header: h,
        mappedField: matched?.field || 'unknown',
        confidence: matched?.confidence || 10,
      };
    });
  }, []);

  // ── Stats summary cards ──────────────────────────────────────
  const statsCards = useMemo(() => [
    {
      label: 'Total Corrections',
      value: learningStats.totalCorrections,
      icon: Database,
      gradient: 'from-accent to-success',
      change: '+AI Learning',
    },
    {
      label: 'Patterns Learned',
      value: learningStats.patternsLearned,
      icon: Lightbulb,
      gradient: 'from-amber-500 to-orange-600',
      change: `${topPatterns.filter(p => p.confidence >= 80).length} high confidence`,
    },
    {
      label: 'Accuracy',
      value: `${learningStats.accuracyImprovement}%`,
      icon: TrendingUp,
      gradient: 'from-blue-500 to-indigo-600',
      change: learningStats.accuracyImprovement >= 50 ? 'Good' : 'Building...',
    },
    {
      label: 'Patterns Applied',
      value: learningStats.patternsApplied,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-teal-600',
      change: 'In production',
    },
  ], [learningStats, topPatterns]);

  // ── Pattern type distribution ────────────────────────────────
  const patternTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of topPatterns) {
      counts[p.patternType] = (counts[p.patternType] || 0) + 1;
    }
    return counts;
  }, [topPatterns]);

  // ── Export patterns ──────────────────────────────────────────
  const handleExport = () => {
    const data = learningEngine.exportPatterns();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anpharmacy-patterns-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Import patterns ──────────────────────────────────────────
  const handleImport = () => {
    const success = learningEngine.importPatterns(importText);
    setImportResult(success ? 'success' : 'error');
    if (success) {
      setTimeout(() => {
        setShowImport(false);
        setImportText('');
        setImportResult(null);
        refreshData();
      }, 1500);
    }
  };

  // ── Clear all data ───────────────────────────────────────────
  const handleClearAll = () => {
    learningEngine.clearAll();
    setShowConfirmClear(false);
    refreshData();
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">AI Learning & Profiles</h2>
            <p className="text-xs text-muted-foreground">{learningStats.totalCorrections} total corrections · {learningStats.patternsLearned} patterns learned</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-4 text-white shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 opacity-80" />
                <span className="text-[10px] opacity-70 font-medium">{card.change}</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
        {[
          { id: 'stats', label: 'Statistics', icon: BarChart3 },
          { id: 'patterns', label: 'Patterns', icon: List },
          { id: 'corrections', label: 'Corrections', icon: FileText },
          { id: 'headers', label: 'Header Map', icon: Columns },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-background text-accent shadow-sm'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: Statistics ───────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pattern Type Distribution */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                Pattern Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {Object.entries(patternTypeCounts).length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">No patterns learned yet</p>
                ) : (
                  Object.entries(patternTypeCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const total = topPatterns.length || 1;
                      const pct = Math.round((count / total) * 100);
                      const colors: Record<string, string> = {
                        medicine_name: 'bg-info-light',
                        batch_format: 'bg-accent/100',
                        date_format: 'bg-warning-light',
                        field_mapping: 'bg-purple-500',
                        manufacturer: 'bg-success-light',
                      };
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-28 capitalize">{type.replace('_', ' ')}</span>
                          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', colors[type] || 'bg-muted-foreground')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Fields Corrected */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Most Corrected Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {Object.entries(learningStats.topCorrectedFields).length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">No corrections recorded yet</p>
                ) : (
                  Object.entries(learningStats.topCorrectedFields)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([field, count], i) => (
                      <div key={field} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60 w-5">{i + 1}.</span>
                          <span className="text-xs text-foreground/80 capitalize">{field}</span>
                        </div>
                        <Badge size="sm" variant="outline">{count}x</Badge>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Patterns ──────────────────────────────────────── */}
      {activeTab === 'patterns' && (
        <Card variant="bordered">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Learned Patterns ({filteredPatterns.length})</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={patternTypeFilter}
                  onChange={e => setPatternTypeFilter(e.target.value)}
                  className="text-xs rounded-lg border border-border px-2 py-1.5 bg-background"
                >
                  <option value="all">All Types</option>
                  <option value="medicine_name">Medicine Name</option>
                  <option value="batch_format">Batch Format</option>
                  <option value="date_format">Date Format</option>
                  <option value="field_mapping">Field Mapping</option>
                  <option value="manufacturer">Manufacturer</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search patterns..."
                    className="pl-8 h-8 text-xs w-48"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPatterns.length === 0 ? (
              <div className="p-8 text-center">
                <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No patterns match your search</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredPatterns.map(pattern => (
                  <div key={pattern.id} className="px-4 py-3 hover:bg-muted/50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          size="sm"
                          className={cn(
                            pattern.patternType === 'medicine_name' ? 'bg-blue-100 text-info' :
                            pattern.patternType === 'batch_format' ? 'bg-accent/10 text-accent' :
                            pattern.patternType === 'date_format' ? 'bg-amber-100 text-warning' :
                            pattern.patternType === 'field_mapping' ? 'bg-purple-100 text-purple-700' :
                            'bg-success-light text-success'
                          )}
                        >
                          {pattern.patternType.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground/60">used {pattern.usageCount}x</span>
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full',
                        pattern.confidence >= 80 ? 'bg-success-light text-success' :
                        pattern.confidence >= 60 ? 'bg-amber-100 text-warning' :
                        'bg-red-100 text-destructive'
                      )}>
                        {pattern.confidence}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono line-through">{pattern.pattern}</code>
                      <span className="text-xs text-muted-foreground/60">→</span>
                      <code className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-mono">{pattern.replacement}</code>
                      {pattern.context && (
                        <span className="text-[10px] text-muted-foreground/60 ml-2">context: {pattern.context}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB: Corrections ──────────────────────────────────── */}
      {activeTab === 'corrections' && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="text-sm">Recent Corrections ({recentCorrections.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentCorrections.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No corrections made yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentCorrections.map(correction => (
                  <div key={correction.id} className="px-4 py-3 hover:bg-muted/50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge size="sm" variant="outline">{correction.field}</Badge>
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(correction.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground line-through">{correction.originalValue}</span>
                      <CheckCircle className="w-3 h-3 text-accent" />
                      <span className="text-xs text-accent font-medium">{correction.correctedValue}</span>
                    </div>
                    {correction.context.medicineName && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Medicine: {correction.context.medicineName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB: Header Mapping ──────────────────────────────── */}
      {activeTab === 'headers' && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Columns className="w-4 h-4 text-accent" />
              Header Synonym Mapping Demo
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Shows how common invoice header names map to StandardField values using the synonym database
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {headerMappingDemo.map((mapping, idx) => (
                <div key={idx} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground/80 font-medium">{mapping.header}</span>
                    <span className="text-xs text-muted-foreground/60">→</span>
                    <Badge
                      size="sm"
                      className={cn(
                        mapping.confidence >= 90 ? 'bg-success-light text-success' :
                        mapping.confidence >= 60 ? 'bg-blue-100 text-info' :
                        'bg-muted text-muted-foreground'
                      )}
                    >
                      {mapping.mappedField.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', mapping.confidence >= 90 ? 'bg-success-light' : mapping.confidence >= 60 ? 'bg-info-light' : 'bg-muted')}
                        style={{ width: `${mapping.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 w-8 text-right">{mapping.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Danger Zone ──────────────────────────────────────── */}
      <Card variant="bordered" className="border-destructive/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Clear All Learning Data</p>
              <p className="text-xs text-muted-foreground">This will remove all learned patterns and corrections</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowConfirmClear(true)}
            className="text-destructive border-destructive/20 hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
          </Button>
        </CardContent>
      </Card>

      {/* ── Clear Confirmation Dialog ────────────────────────── */}
      <Dialog open={showConfirmClear} onOpenChange={o => { if (!o) setShowConfirmClear(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Clear Learning Data
            </DialogTitle>
          </DialogHeader>
          <div className="bg-destructive/10 border border-red-100 rounded-xl p-4">
            <p className="text-sm text-destructive">
              This will permanently delete <strong>{learningStats.totalCorrections} corrections</strong> and{' '}
              <strong>{learningStats.patternsLearned} patterns</strong>. Consider exporting first.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmClear(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll}>Yes, Clear All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={o => { if (!o) { setShowImport(false); setImportResult(null); setImportText(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent" /> Import Patterns
            </DialogTitle>
          </DialogHeader>
          {importResult === 'success' ? (
            <div className="bg-success-light border border-success/40 rounded-xl p-6 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-success font-medium">Import successful!</p>
            </div>
          ) : (
            <>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Paste exported JSON data here..."
                className="w-full h-40 rounded-xl border border-border bg-muted/50 p-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              {importResult === 'error' && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive flex items-center gap-2">
                  <X className="w-4 h-4 flex-shrink-0" /> Invalid data format
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={!importText.trim()}>Import</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
