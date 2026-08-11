import { useEffect, useState, useCallback } from 'react';
import { Bot, Lightbulb, AlertTriangle, Info, CheckCircle, FileText, Loader2, FlaskConical, BarChart3, Play, Shield, Clock, Zap, List, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import { runFullTestSuite, runSampleInvoice, generateTestReport, SAMPLE_INVOICES } from '../lib/pipelineTestHarness';
import type { TestSuiteResult, PipelineTestResult, SampleInvoice } from '../lib/pipelineTestHarness';

interface Insight { id: number; insight_type: string; title: string; description: string; confidence_score: number; recommended_action: string; is_actioned: number; created_at: string; }

export default function AiInsights() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'insights' | 'pipeline-test'>('insights');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDialog, setReportDialog] = useState<{ title: string; report: string } | null>(null);

  // ── Pipeline Test State ───────────────────────────────────────
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [activeSample, setActiveSample] = useState<SampleInvoice | null>(null);
  const [singleResult, setSingleResult] = useState<PipelineTestResult | null>(null);


  useEffect(() => { loadInsights(); }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    try { if (window.electronAPI) { const res = await window.electronAPI.getAIInsights(); if (res.success) setInsights(res.insights || []); } }
    catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleAction = async (id: number) => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.markInsightActioned(id);
    if (res.success) { toast.success('Actioned', 'Insight marked as actioned.'); await loadInsights(); }
    else toast.error('Error', res.error || 'Failed');
  };

  const generateReport = async (type: string) => {
    setReportLoading(true);
    try { if (window.electronAPI) { const res = await window.electronAPI.generateAIReport(type); if (res.success && res.report) setReportDialog({ title: res.report.title || 'AI Report', report: res.report.report || res.report }); else toast.error('Error', res.error || 'Failed to generate'); } }
    catch (error) { console.error(error); } finally { setReportLoading(false); }
  };

  // ── Pipeline Test Handlers ────────────────────────────────────
  const handleRunAllTests = useCallback(async () => {
    setTestRunning(true);
    setTestResults(null);
    try {
      const results = await runFullTestSuite();
      setTestResults(results);
      toast.success('Tests Complete', `Ran ${results.summary.totalInvoices} invoices in ${(results.summary.totalProcessingTimeMs / 1000).toFixed(1)}s`);
    } catch (error) {
      toast.error('Test Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setTestRunning(false);
    }
  }, [toast]);

  const handleRunSingleTest = useCallback(async (sample: SampleInvoice) => {
    setActiveSample(sample);
    setSingleResult(null);
    setTestRunning(true);
    try {
      const result = await runSampleInvoice(sample);
      setSingleResult(result);
    } catch (error) {
      toast.error('Test Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setTestRunning(false);
    }
  }, [toast]);

  const handleGenerateTestReport = useCallback(() => {
    if (!testResults) return;
    const report = generateTestReport(testResults);
    setReportDialog({ title: 'Pipeline Test Suite Report', report });
  }, [testResults]);

  const getIcon = (type: string) => { switch (type) { case 'alert': return AlertTriangle; case 'warning': return Lightbulb; case 'info': return Info; default: return CheckCircle; } };
  const getIconColor = (type: string) => { switch (type) { case 'alert': return 'text-destructive bg-destructive/10'; case 'warning': return 'text-warning bg-warning-light'; case 'info': return 'text-info bg-info-light'; default: return 'text-success bg-success-light'; } };

  // ── Tab Navigation ────────────────────────────────────────────
  const tabs = [
    { id: 'insights' as const, label: 'Insights', icon: Lightbulb },
    { id: 'pipeline-test' as const, label: 'Pipeline Test', icon: FlaskConical },
  ];

  return (<div className="space-y-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-accent to-success rounded-xl flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">AI Insights</h2>
          <p className="text-xs text-muted-foreground">AI-powered business intelligence &amp; pipeline testing</p>
        </div>
      </div>
      <div className="flex gap-2">
        {activeTab === 'insights' && (
          <>
            <Button variant="outline-teal" size="sm" onClick={() => generateReport('stock')} disabled={reportLoading} className="gap-2">
              {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Stock Report
            </Button>
            <Button variant="outline-teal" size="sm" onClick={() => generateReport('sales')} disabled={reportLoading} className="gap-2">
              {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Sales Report
            </Button>
            <Button size="sm" onClick={loadInsights} disabled={isLoading} className="gap-2">
              <Bot className="w-4 h-4" /> Refresh
            </Button>
          </>
        )}
      </div>
    </div>

    {/* Tab Bar */}
    <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-accent shadow-sm'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>

    {/* ════════════════════════════════════════════════════════════ */}
    {/* TAB: INSIGHTS */}
    {/* ════════════════════════════════════════════════════════════ */}
    {activeTab === 'insights' && (
      <>
        {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div> : insights.length === 0 ? (
          <Card variant="bordered"><CardContent className="p-12 text-center">
            <Bot className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">No insights available</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Add more inventory data to generate insights</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {insights.map(insight => {
              const Icon = getIcon(insight.insight_type);
              return (
                <Card key={insight.id} variant="bordered" className="hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getIconColor(insight.insight_type))}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground text-sm">{insight.title}</h3>
                          <span className="text-xs text-muted-foreground/60">{(insight.confidence_score * 100).toFixed(0)}% confidence</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-accent font-medium">{insight.recommended_action}</span>
                          <Button size="sm" variant="outline" onClick={() => handleAction(insight.id)}>Dismiss</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </>
    )}

    {/* ════════════════════════════════════════════════════════════ */}
    {/* TAB: PIPELINE TEST */}
    {/* ════════════════════════════════════════════════════════════ */}
    {activeTab === 'pipeline-test' && (
      <div className="space-y-5">
        {/* Summary Cards */}
        {testResults && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-accent to-success rounded-2xl p-4 text-primary-foreground shadow-md">
              <CheckCircle className="w-5 h-5 opacity-80 mb-2" />
              <p className="text-2xl font-bold">{testResults.summary.passed}/{testResults.summary.totalInvoices}</p>
              <p className="text-[11px] opacity-80">Tests Passed</p>
            </div>
            <div className="bg-gradient-to-br from-info to-primary rounded-2xl p-4 text-primary-foreground shadow-md">
              <BarChart3 className="w-5 h-5 opacity-80 mb-2" />
              <p className="text-2xl font-bold">{testResults.summary.averageConfidence}%</p>
              <p className="text-[11px] opacity-80">Avg Confidence</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-primary-foreground shadow-md">
              <Shield className="w-5 h-5 opacity-80 mb-2" />
              <p className="text-2xl font-bold">{testResults.summary.averageItemAccuracy}%</p>
              <p className="text-[11px] opacity-80">Avg Accuracy</p>
            </div>
            <div className="bg-gradient-to-br from-info to-info/80 rounded-2xl p-4 text-primary-foreground shadow-md">
              <Clock className="w-5 h-5 opacity-80 mb-2" />
              <p className="text-2xl font-bold">{(testResults.summary.totalProcessingTimeMs / 1000).toFixed(1)}s</p>
              <p className="text-[11px] opacity-80">Total Time</p>
            </div>
          </div>
        )}

        {/* Sample Invoices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_INVOICES.map(sample => {
            const result = testResults?.invoices.find(r => r.invoiceId === sample.id);
            const isActive = activeSample?.id === sample.id;
            const isRunning = testRunning && isActive;
            return (
              <Card
                key={sample.id}
                variant="bordered"
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isActive && 'ring-2 ring-accent',
                  result?.success === false && 'border-red-200'
                )}
                onClick={() => !testRunning && handleRunSingleTest(sample)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        result?.success ? 'bg-success-light' : result ? 'bg-destructive/10' : 'bg-muted'
                      )}>
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/60" />
                        ) : result?.success ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : result ? (
                          <X className="w-4 h-4 text-destructive" />
                        ) : (
                          <Play className="w-4 h-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{sample.supplier}</p>
                        <p className="text-[10px] text-muted-foreground/60">{sample.id}</p>
                      </div>
                    </div>
                    <Badge size="sm" variant="outline" className="text-[10px]">
                      {sample.expected.itemCount} items
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{sample.description}</p>
                  
                  {result && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Items: {result.itemCount}/{result.expectedItemCount}</span>
                        <span className="text-muted-foreground">{(result.processingTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className={cn(
                          'font-medium',
                          result.overallConfidence >= 80 ? 'text-success' :
                          result.overallConfidence >= 50 ? 'text-warning' : 'text-destructive'
                        )}>{result.overallConfidence}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {result.metrics.slice(0, 4).map(m => (
                          <span key={m.field} className={cn(
                            'px-1.5 py-0.5 rounded',
                            m.accuracy >= 80 ? 'bg-success-light text-success' :
                            m.accuracy >= 50 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          )}>{m.field.split(' ')[0]} {m.accuracy}%</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleRunAllTests}
              disabled={testRunning}
              className="gap-2"
            >
              {testRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Running All Tests...</>
              ) : (
                <><Play className="w-4 h-4" /> Run All Tests</>
              )}
            </Button>
            {testResults && (
              <Button size="sm" variant="outline" onClick={handleGenerateTestReport} className="gap-2">
                <FileText className="w-3.5 h-3.5" /> View Report
              </Button>
            )}
          </div>
          {testResults && (
            <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Click a card to run individual test
            </p>
          )}
        </div>

        {/* Detailed Results Table */}
        {testResults && testResults.invoices.length > 0 && (
          <Card variant="bordered">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Invoice</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Items</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Confidence</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Accuracy</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Time</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Stages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {testResults.invoices.map(invoice => (
                      <tr key={invoice.invoiceId} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{invoice.supplier}</span>
                            <span className="text-muted-foreground/60">({invoice.invoiceId})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {invoice.success ? (
                            <Badge size="sm" className="bg-success-light text-success">PASS</Badge>
                          ) : (
                            <Badge size="sm" className="bg-destructive/10 text-red-700">FAIL</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {invoice.itemCount}/{invoice.expectedItemCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            'font-medium',
                            invoice.overallConfidence >= 80 ? 'text-success' :
                            invoice.overallConfidence >= 50 ? 'text-warning' : 'text-destructive'
                          )}>{invoice.overallConfidence}%</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            'font-medium',
                            invoice.itemAccuracy >= 80 ? 'text-success' :
                            invoice.itemAccuracy >= 50 ? 'text-warning' : 'text-destructive'
                          )}>{invoice.itemAccuracy}%</span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {(invoice.processingTimeMs / 1000).toFixed(2)}s
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge size="sm" variant="outline">{invoice.stagesCompleted.length}/13</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Single Result Detail */}
        {singleResult && (
          <Card variant="bordered">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                  <List className="w-4 h-4 text-accent" />
                  Field-Level Metrics: {singleResult.supplier}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {singleResult.metrics.map(m => (
                  <div key={m.field} className="bg-muted/50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">{m.field}</span>
                      <span className={cn(
                        'text-xs font-bold',
                        m.accuracy >= 80 ? 'text-success' :
                        m.accuracy >= 50 ? 'text-warning' : 'text-destructive'
                      )}>{m.accuracy}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          m.accuracy >= 80 ? 'bg-success-light' :
                          m.accuracy >= 50 ? 'bg-amber-500' : 'bg-destructive'
                        )}
                        style={{ width: `${m.accuracy}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{m.extractedCount}/{m.expectedCount} items</p>
                  </div>
                ))}
              </div>

              {/* Item Details */}
              {singleResult.itemDetails.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-foreground/80 mb-2">Extracted Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Medicine</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Batch</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">Conf</th>
                          <th className="text-center px-3 py-2 text-muted-foreground font-medium">Usable</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Match</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {singleResult.itemDetails.map((item, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-3 py-2 font-medium text-foreground/80">{item.medicineName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{item.batchNumber}</td>
                            <td className={cn(
                              'px-3 py-2 text-right font-medium',
                              item.confidence >= 80 ? 'text-success' :
                              item.confidence >= 50 ? 'text-warning' : 'text-destructive'
                            )}>{item.confidence}%</td>
                            <td className="px-3 py-2 text-center">
                              {item.isUsable ? (
                                <CheckCircle className="w-3.5 h-3.5 text-success mx-auto" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-red-400 mx-auto" />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Badge size="sm" variant="outline" className="text-[10px]">
                                {item.matchType || 'unknown'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {singleResult.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-medium text-amber-700 mb-1">Warnings</p>
                  {singleResult.warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-warning">{w}</p>
                  ))}
                </div>
              )}

              {singleResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-medium text-red-700 mb-1">Errors</p>
                  {singleResult.errors.map((e, i) => (
                    <p key={i} className="text-[10px] text-destructive">{e}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!testResults && !singleResult && !testRunning && (
          <Card variant="bordered">
            <CardContent className="p-12 text-center">
              <FlaskConical className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm font-medium">Pipeline Test Suite</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Run 3 sample invoices through the full 13-stage pipeline to measure accuracy
              </p>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground/60">
                <span>ABC Pharma (Standard)</span>
                <span>XYZ Labs (Compact)</span>
                <span>MediCorp (Extended)</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )}

    {/* ════════════════════════════════════════════════════════════ */}
    {/* SHARED REPORT DIALOG */}
    {/* ════════════════════════════════════════════════════════════ */}
    <Dialog open={!!reportDialog} onOpenChange={o => { if (!o) setReportDialog(null); }}>
      {reportDialog && (
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              {reportDialog.title}
            </DialogTitle>
          </DialogHeader>
          <pre className="bg-muted/50 border border-border rounded-2xl p-6 text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed text-[11px]">
            {reportDialog.report}
          </pre>
          <DialogFooter>
            <Button onClick={() => setReportDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  </div>);
}