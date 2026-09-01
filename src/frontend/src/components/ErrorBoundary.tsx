/**
 * Error Boundary Component (Phase 7 Sprint 2)
 *
 * React error boundary that catches errors in child components
 * and logs them to Sentry with full context.
 */

import React, { ReactNode, ReactElement } from 'react';
import { captureException, getLastEventId } from '../services/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    const eventId = captureException(error, {
      componentStack: errorInfo.componentStack,
      type: 'error_boundary',
    });

    this.setState({ errorId: eventId });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={styles.container}>
            <div style={styles.content}>
              <h2 style={styles.heading}>Oops! Something went wrong</h2>
              <p style={styles.message}>
                We're sorry for the inconvenience. An error has been reported and we're working to fix it.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details style={styles.details}>
                  <summary style={styles.summary}>Error details (development only)</summary>
                  <pre style={styles.errorText}>
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              {this.state.errorId && (
                <p style={styles.errorId}>
                  Error ID: <code>{this.state.errorId}</code>
                </p>
              )}

              <div style={styles.actions}>
                <button
                  onClick={() => window.location.href = '/'}
                  style={styles.button}
                >
                  Go to Home
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{ ...styles.button, ...styles.secondaryButton }}
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '20px',
  } as React.CSSProperties,

  content: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    maxWidth: '500px',
    textAlign: 'center' as const,
  },

  heading: {
    color: '#ef4444',
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '16px',
  } as React.CSSProperties,

  message: {
    color: '#6b7280',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '24px',
  } as React.CSSProperties,

  details: {
    textAlign: 'left' as const,
    marginBottom: '24px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  } as React.CSSProperties,

  summary: {
    cursor: 'pointer',
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: '8px',
  } as React.CSSProperties,

  errorText: {
    fontSize: '12px',
    overflow: 'auto',
    backgroundColor: '#1f2937',
    color: '#10b981',
    padding: '12px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  } as React.CSSProperties,

  errorId: {
    backgroundColor: '#fef3c7',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '24px',
    color: '#92400e',
    fontSize: '14px',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  } as React.CSSProperties,

  button: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  secondaryButton: {
    backgroundColor: '#6b7280',
  } as React.CSSProperties,
};

/**
 * Hook version of ErrorBoundary for functional components
 * Use this for more granular error handling
 */
export function useErrorHandler(onError?: (error: Error) => void) {
  return (error: Error) => {
    captureException(error);
    if (onError) {
      onError(error);
    }
    throw error;
  };
}

/**
 * Wrap an async function to catch and log errors
 */
export function withErrorBoundary<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error as Error, {
        functionName: fn.name,
        args: String(args),
      });
      throw error;
    }
  };
}

export default ErrorBoundary;
