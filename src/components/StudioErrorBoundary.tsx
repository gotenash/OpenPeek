import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class StudioErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("StudioErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '380px',
          padding: '30px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(239, 68, 68, 0.2)',
          color: '#f8fafc',
          textAlign: 'center',
          margin: '20px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
            {this.props.fallbackTitle || "Une anomalie est survenue dans le Studio de Montage"}
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '560px', marginBottom: '16px', lineHeight: 1.5 }}>
            Une erreur d'affichage a été interceptée afin d'éviter la fermeture ou l'écran vide de l'application.
          </p>
          <div style={{
            width: '100%',
            maxWidth: '620px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#fca5a5',
            maxHeight: '140px',
            overflowY: 'auto',
            marginBottom: '20px',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          <button
            onClick={this.handleReset}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            🔄 Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
