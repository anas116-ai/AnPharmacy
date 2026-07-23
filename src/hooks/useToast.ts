import { useToastContext } from '../components/ui/toast';
import type { ToastType } from '../components/ui/toast';

export function useToast() {
  const { addToast } = useToastContext();

  return {
    success: (title: string, description?: string) => addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) => addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) => addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) => addToast({ type: 'info', title, description }),
  };
}
