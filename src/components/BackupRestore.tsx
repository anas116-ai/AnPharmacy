import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Download, Upload, Database, HardDrive, Clock, FileText, RefreshCw, CheckCircle, AlertTriangle, Trash2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { formatDate, cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface BackupRecord {
  name: string;
  path: string;
  size: number;
  created: string;
}

export default function BackupRestore() {
  const { t } = useTranslation();
  const toast = useToast();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState<BackupRecord | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listBackups();
        if (result.success) {
          setBackups(result.backups || []);
        }
      }
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.createBackup();
        if (result.success) {
          toast.success('Backup created successfully!');
          loadBackups();
        } else {
          toast.error(result.error || 'Backup failed');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Backup failed');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (backup: BackupRecord) => {
    setIsRestoring(true);
    setShowRestoreDialog(null);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.restoreBackup({ filePath: backup.path });
        if (result.success) {
          toast.success('Restore completed! A safety backup was created. Please restart the application.', 'Backup restored successfully');
        } else {
          toast.error(result.error || 'Restore failed');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
          <HardDrive className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground dark:text-foreground">Backup &amp; Restore</h2>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">AES-256 encrypted data backup</p>
        </div>
      </div>

      {/* Create Backup */}
      <Card variant="premium">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-14 h-14 bg-accent/10 dark:bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-7 h-7 text-accent dark:text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Create Backup</h3>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mt-1 leading-relaxed">
                  Create an AES-256 encrypted backup of all your data. Backups include medicines, sales, users, and audit logs with HMAC integrity verification.
                </p>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-accent dark:text-accent bg-accent/10 dark:bg-accent/10 px-2.5 py-1 rounded-lg">
                    <Shield className="w-3 h-3" /> AES-256
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-accent dark:text-accent bg-accent/10 dark:bg-accent/10 px-2.5 py-1 rounded-lg">
                    <Lock className="w-3 h-3" /> Encrypted
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-accent dark:text-accent bg-accent/10 dark:bg-accent/10 px-2.5 py-1 rounded-lg">
                    <FileText className="w-3 h-3" /> .anpbackup
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating}
              size="lg"
              className="flex-shrink-0 gap-2"
            >
              {isCreating ? (
                <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg> Creating...</>
              ) : (
                <><Download className="w-5 h-5" /> Create Backup Now</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card variant="bordered">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-accent" />
              Available Backups
              <Badge variant="outline-teal" size="sm">{backups.length}</Badge>
            </span>
            <Button variant="ghost" size="icon-sm" onClick={loadBackups} disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2].map(i => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-10">
              <Database className="w-16 h-16 text-muted-foreground/30 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-muted-foreground dark:text-muted-foreground/60 text-sm font-medium">No backups found</p>
              <p className="text-muted-foreground/60 dark:text-muted-foreground text-xs mt-1">Create your first backup above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/50/80 dark:bg-muted/60/50 rounded-2xl hover:bg-background dark:hover:bg-slate-700 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-sm transition-all duration-200 border border-transparent group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 bg-accent/10 dark:bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-accent dark:text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground dark:text-foreground truncate">{backup.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(backup.created)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {formatSize(backup.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <Button
                      variant="outline-teal"
                      size="sm"
                      onClick={() => setShowRestoreDialog(backup)}
                      className="gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!showRestoreDialog} onOpenChange={(o) => !o && setShowRestoreDialog(null)}>
        {showRestoreDialog && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                Restore Backup
              </DialogTitle>
              <DialogClose onClick={() => setShowRestoreDialog(null)} />
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-warning-light dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold mb-1">Backup Details</p>
                <p className="text-xs text-warning dark:text-amber-400">File: {showRestoreDialog.name}</p>
                <p className="text-xs text-warning dark:text-amber-400">Created: {formatDate(showRestoreDialog.created)}</p>
                <p className="text-xs text-warning dark:text-amber-400">Size: {formatSize(showRestoreDialog.size)}</p>
              </div>
              <div className="bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-red-800 rounded-2xl p-4">
                <p className="text-sm text-destructive dark:text-red-300 font-semibold mb-1">Warning</p>
                <p className="text-xs text-destructive dark:text-destructive">
                  This will replace ALL current data with the backup data. A safety backup of your current data will be created automatically before restoring.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRestoreDialog(null)}>Cancel</Button>
              <Button
                variant="warning"
                onClick={() => handleRestore(showRestoreDialog)}
                disabled={isRestoring}
                className="gap-1.5"
              >
                {isRestoring ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg> Restoring...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Restore Now</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
