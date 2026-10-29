import { Fragment } from 'react';
import { Keyboard, X } from 'lucide-react';
import { KeyboardShortcut, ShortcutCategory } from '../hooks/useKeyboardShortcuts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export default function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce<Record<string, KeyboardShortcut[]>>((acc, shortcut) => {
    const category = shortcut.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {});

  const getShortcutDisplay = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    
    // Format the key
    let key = shortcut.key;
    if (key === 'Escape') key = 'Esc';
    else if (key.length === 1) key = key.toUpperCase();
    
    parts.push(key);
    
    return parts.join(' + ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border dark:border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-[#123F3D] to-[#14292E] rounded-xl flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-white" />
              </div>
              Keyboard Shortcuts
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted dark:hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground dark:text-muted-foreground/60" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mt-2">
            Boost your productivity with these keyboard shortcuts
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground/60 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 dark:bg-muted/40/50 hover:bg-muted dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-sm text-foreground/80 dark:text-muted-foreground/40">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {getShortcutDisplay(shortcut).split(' + ').map((key, keyIndex) => (
                        <Fragment key={keyIndex}>
                          {keyIndex > 0 && <span className="text-muted-foreground/60 dark:text-muted-foreground text-xs">+</span>}
                          <kbd className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-mono font-medium text-foreground/80 dark:text-muted-foreground/40 bg-background dark:bg-muted/60 border border-border dark:border-border rounded-lg shadow-sm min-w-[2rem]">
                            {key}
                          </kbd>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border dark:border-border bg-muted/50 dark:bg-muted/40/50">
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 text-center">
            Press <kbd className="inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-medium text-foreground/80 dark:text-muted-foreground/40 bg-background dark:bg-muted/60 border border-border dark:border-border rounded-lg shadow-sm">Esc</kbd> to close this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}