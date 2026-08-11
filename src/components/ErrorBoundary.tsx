import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to audit trail if available
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Could send to backend for logging
    window.electronAPI?.logError({
      message: error.message,
      stack: error.stack || undefined,
      componentStack: errorInfo.componentStack || undefined,
    }).catch(() => {
      // Ignore logging errors
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-md w-full bg-background dark:bg-muted/40 rounded-2xl border border-border dark:border-border shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-destructive dark:text-destructive/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-2">
          Something went wrong
        </h2>

        <p className="text-muted-foreground dark:text-muted-foreground/40 mb-4 text-sm">
          We're sorry, but something unexpected happened. The error has been logged.
        </p>

        <details className="text-left mb-6">
          <summary className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/60 cursor-pointer hover:text-foreground/80 dark:hover:text-muted-foreground/30 transition-colors">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-muted/50 dark:bg-muted/60/50 rounded-xl border border-border dark:border-border">
            <p className="text-xs font-mono text-destructive dark:text-destructive/80 break-all">
              {error.message}
            </p>
            {error.stack && (
              <pre className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-2 whitespace-pre-wrap break-all font-mono">
                {error.stack}
              </pre>
            )}
          </div>
        </details>

        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-medium hover:from-teal-700 hover:to-teal-600 transition-all duration-200 shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-teal-500/30 hover:scale-105 active:scale-95"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-muted dark:bg-muted/60 text-foreground/80 dark:text-muted-foreground/70 rounded-xl font-medium hover:bg-muted dark:hover:bg-muted transition-all duration-200"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;