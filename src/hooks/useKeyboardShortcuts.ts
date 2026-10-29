import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: KeyboardShortcut[];
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Intercept browser Ctrl+N / Cmd+N immediately to prevent Chrome from opening a new window
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        event.stopPropagation();
      }

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable ||
                           target.closest('[role="textbox"]') ||
                           target.closest('.cm-content'); // CodeMirror editor

      const matchingShortcut = shortcuts.find(shortcut => {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
        const altMatch = !!shortcut.altKey === event.altKey;
        
        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        // Standard text editing shortcuts inside inputs that must be preserved
        const isTextEditing = isInputField && (event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'a', 'z', 'y'].includes(event.key.toLowerCase());
        
        // Function keys, Escape, and enterprise navigation shortcuts (Ctrl+N, Ctrl+S, Ctrl+I, Ctrl+R, Ctrl+M, Ctrl+B, etc.)
        const allowInInput = !isTextEditing;
        
        if (!isInputField || allowInInput) {
          event.preventDefault();
          event.stopPropagation();
          matchingShortcut.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [shortcuts, enabled]);
};

export const useGlobalShortcuts = (onNavigate: (index: number) => void) => {
  const shortcuts: KeyboardShortcut[] = [
    // Enterprise Core Navigation (High-speed single-hand Ctrl keys)
    { key: 'd', ctrlKey: true, action: () => onNavigate(0), description: 'Go to Dashboard', category: 'Navigation' },
    { key: 'n', ctrlKey: true, action: () => onNavigate(4), description: 'New Sale / Billing POS', category: 'Navigation' },
    { key: 's', ctrlKey: true, action: () => onNavigate(4), description: 'New Sale / Billing POS', category: 'Navigation' },
    { key: 'i', ctrlKey: true, action: () => onNavigate(6), description: 'Scan Invoice (OCR)', category: 'Navigation' },
    { key: 'r', ctrlKey: true, action: () => onNavigate(5), description: 'Reports & Analytics', category: 'Navigation' },
    { key: 'm', ctrlKey: true, action: () => onNavigate(27), description: 'Import Data (Excel/CSV/PDF)', category: 'Navigation' },
    { key: 'b', ctrlKey: true, action: () => onNavigate(8), description: 'Backup & Restore', category: 'Navigation' },
    { key: 'p', ctrlKey: true, action: () => onNavigate(3), description: 'Purchases', category: 'Navigation' },
    { key: 'k', ctrlKey: true, action: () => onNavigate(1), description: 'Stock Inventory', category: 'Navigation' },
    { key: 'u', ctrlKey: true, action: () => onNavigate(7), description: 'User Management', category: 'Navigation' },
    { key: ',', ctrlKey: true, action: () => onNavigate(9), description: 'Open Settings', category: 'Navigation' },
    // Actions
    {
      key: 'Escape',
      action: () => {
        const modals = document.querySelectorAll('[role="dialog"]');
        if (modals.length > 0) {
          const lastModal = modals[modals.length - 1];
          const closeButton = lastModal.querySelector('[aria-label*="close"], [aria-label*="Close"], button[aria-label="Close"]') as HTMLElement;
          closeButton?.click();
        }
      },
      description: 'Close Modal/Dialog',
      category: 'Actions'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => {
        const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
        if (searchInputs.length > 0) {
          (searchInputs[0] as HTMLElement).focus();
        }
      },
      description: 'Focus Search',
      category: 'Actions'
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return { shortcuts };
};

export const useTableNavigation = (rowCount: number, onNavigate: (index: number) => void) => {
  useEffect(() => {
    if (rowCount === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable;

      if (isInputField) return;

      const currentIndex = parseInt(target.getAttribute('data-row-index') || '0', 10);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < rowCount - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'Home':
          if (event.ctrlKey) {
            event.preventDefault();
            onNavigate(0);
          }
          break;
        case 'End':
          if (event.ctrlKey) {
            event.preventDefault();
            onNavigate(rowCount - 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rowCount, onNavigate]);
};