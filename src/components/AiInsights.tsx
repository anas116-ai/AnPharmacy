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
  const getIconColor = (type: string) => { switch (type) { case 'alert': return 'text-red-600 bg-red-100'; case 'warning': return 'text-amber-600 bg-amber-100'; case 'info': return 'text-blue-600 bg-blue-100'; default: return 'text-emerald-600 bg-emerald-100'; } };

  // ── Tab Navigation ────────────────────────────────────────────
  const tabs = [
    { id: 'insights' as const, label: 'Insights', icon: Lightbulb },
    { id: 'pipeline-test' as const, label: 'Pipeline Test', icon: FlaskConical },
  ];

  return (<div className="space-y-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">AI Insights</h2>
          <p className="text-xs text-gray-500">AI-powered business intelligence &amp; pipeline testing</p>
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
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
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
            <Bot className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium">No insights available</p>
            <p className="text-gray-400 text-xs mt-1">Add more inventory data to generate insights</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {insights.map(insight => {
              const Icon = getIcon(insight.insight_type);
              return (
                <Card key={insight.id} variant="bordered" className="hover:shadow-medium transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getIconColor(insight.insight_type))}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm">{insight.title}</h3>
                          <span className="text-xs text-gray-400">{(insight.confidence_score * 100).toFixed(0)}% confidence</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-teal-600 font-medium">{insight.recommended_action}</span>
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
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-4 text-white shadow-soft">
              <CheckCircle className="w-5 h-5 opacity-80 mb-2" />
              <p className="text-2xl font-bold">{testResults.summary.passed}/{testResults.summary.totalInvoices}</p>
              <p className="text-[11px] opacity-80">Tests Passed</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-soft">
              <BarChart3 className="w-5 h-5 opacity-80 mb-2" />
              <p className="text-2xl font-bold">{testResults.summary.averageConfidence}%</p>
              <p className="text-[11px] opacity-80">Avg Confidence</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-soft">
              <Shield className="w-5 h-5 opacity-80 mb-2" />
              <p className="text-2xl font-bold">{testResults.summary.averageItemAccuracy}%</p>
              <p className="text-[11px] opacity-80">Avg Accuracy</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-soft">
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
                  'cursor-pointer transition-all hover:shadow-medium',
                  isActive && 'ring-2 ring-teal-500',
                  result?.success === false && 'border-red-200'
                )}
                onClick={() => !testRunning && handleRunSingleTest(sample)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        result?.success ? 'bg-emerald-100' : result ? 'bg-red-100' : 'bg-gray-100'
                      )}>
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : result?.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : result ? (
                          <X className="w-4 h-4 text-red-500" />
                        ) : (
                          <Play className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{sample.supplier}</p>
                        <p className="text-[10px] text-gray-400">{sample.id}</p>
                      </div>
                    </div>
                    <Badge size="sm" variant="outline" className="text-[10px]">
                      {sample.expected.itemCount} items
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{sample.description}</p>
                  
                  {result && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Items: {result.itemCount}/{result.expectedItemCount}</span>
                        <span className="text-gray-500">{(result.processingTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Confidence:</span>
                        <span className={cn(
                          'font-medium',
                          result.overallConfidence >= 80 ? 'text-emerald-600' :
                          result.overallConfidence >= 50 ? 'text-amber-600' : 'text-red-600'
                        )}>{result.overallConfidence}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {result.metrics.slice(0, 4).map(m => (
                          <span key={m.field} className={cn(
                            'px-1.5 py-0.5 rounded',
                            m.accuracy >= 80 ? 'bg-emerald-50 text-emerald-700' :
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
            <p className="text-xs text-gray-400 flex items-center gap-1">
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
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Invoice</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Items</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Confidence</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Accuracy</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Time</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Stages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {testResults.invoices.map(invoice => (
                      <tr key={invoice.invoiceId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{invoice.supplier}</span>
                            <span className="text-gray-400">({invoice.invoiceId})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {invoice.success ? (
                            <Badge size="sm" className="bg-emerald-100 text-emerald-700">PASS</Badge>
                          ) : (
                            <Badge size="sm" className="bg-red-100 text-red-700">FAIL</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {invoice.itemCount}/{invoice.expectedItemCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            'font-medium',
                            invoice.overallConfidence >= 80 ? 'text-emerald-600' :
                            invoice.overallConfidence >= 50 ? 'text-amber-600' : 'text-red-600'
                          )}>{invoice.overallConfidence}%</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            'font-medium',
                            invoice.itemAccuracy >= 80 ? 'text-emerald-600' :
                            invoice.itemAccuracy >= 50 ? 'text-amber-600' : 'text-red-600'
                          )}>{invoice.itemAccuracy}%</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
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
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <List className="w-4 h-4 text-teal-600" />
                  Field-Level Metrics: {singleResult.supplier}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {singleResult.metrics.map(m => (
                  <div key={m.field} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{m.field}</span>
                      <span className={cn(
                        'text-xs font-bold',
                        m.accuracy >= 80 ? 'text-emerald-600' :
                        m.accuracy >= 50 ? 'text-amber-600' : 'text-red-600'
                      )}>{m.accuracy}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          m.accuracy >= 80 ? 'bg-emerald-500' :
                          m.accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${m.accuracy}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{m.extractedCount}/{m.expectedCount} items</p>
                  </div>
                ))}
              </div>

              {/* Item Details */}
              {singleResult.itemDetails.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Extracted Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Medicine</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Batch</th>
                          <th className="text-right px-3 py-2 text-gray-500 font-medium">Conf</th>
                          <th className="text-center px-3 py-2 text-gray-500 font-medium">Usable</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Match</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {singleResult.itemDetails.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 font-medium text-gray-700">{item.medicineName}</td>
                            <td className="px-3 py-2 text-gray-500">{item.batchNumber}</td>
                            <td className={cn(
                              'px-3 py-2 text-right font-medium',
                              item.confidence >= 80 ? 'text-emerald-600' :
                              item.confidence >= 50 ? 'text-amber-600' : 'text-red-600'
                            )}>{item.confidence}%</td>
                            <td className="px-3 py-2 text-center">
                              {item.isUsable ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
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
                    <p key={i} className="text-[10px] text-amber-600">⚠ {w}</p>
                  ))}
                </div>
              )}

              {singleResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-medium text-red-700 mb-1">Errors</p>
                  {singleResult.errors.map((e, i) => (
                    <p key={i} className="text-[10px] text-red-600">✗ {e}</p>
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
              <FlaskConical className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-medium">Pipeline Test Suite</p>
              <p className="text-gray-400 text-xs mt-1">
                Run 3 sample invoices through the full 13-stage pipeline to measure accuracy
              </p>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
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
              <FileText className="w-5 h-5 text-teal-600" />
              {reportDialog.title}
            </DialogTitle>
          </DialogHeader>
          <pre className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed text-[11px]">
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