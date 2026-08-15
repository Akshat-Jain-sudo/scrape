import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Production-Safe React Error Boundary
 * Prevents child component crashes from unmounting the entire application.
 * Displays a clean cyberpunk-styled fallback UI with reload and recovery options.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Symbiote ErrorBoundary] Caught render error:', error, errorInfo);
    } else {
      console.error('[Symbiote ErrorBoundary] Component rendering failed:', error?.message || 'Unknown error');
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="error-boundary-fallback glass-card"
          style={{
            margin: '2rem auto',
            maxWidth: '600px',
            padding: '2.5rem',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(17, 24, 39, 0.95))',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            color: 'var(--text-primary)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            <AlertTriangle size={32} color="#ef4444" />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Something went wrong in this module
          </h2>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: '1.6' }}>
            A temporary component error occurred while rendering. Your account session and saved data are completely safe.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
            >
              <RefreshCw size={15} /> Try Again
            </button>
            <button 
              className="btn btn-secondary"
              onClick={this.handleReload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
            >
              <Home size={15} /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
