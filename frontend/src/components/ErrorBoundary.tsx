import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // In production, you would send this to an error tracking service like Sentry
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary-container glass" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 2rem',
          margin: '2rem auto',
          maxWidth: '500px',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '50%',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}>
            <AlertTriangle size={48} style={{ color: 'var(--score-bad)' }} />
          </div>
          
          <h2 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Something went wrong
          </h2>
          
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: '1.5rem',
            lineHeight: 1.5,
          }}>
            We encountered an unexpected error while rendering this page.
            You can try refreshing the page or resetting the component.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              width: '100%',
              marginBottom: '1.5rem',
              textAlign: 'left',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <summary style={{ 
                cursor: 'pointer', 
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}>
                Error details (development only)
              </summary>
              <pre style={{
                fontSize: '0.75rem',
                color: 'var(--score-bad)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={this.handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'background 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            
            <button
              onClick={this.handleReload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--card-border)';
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
