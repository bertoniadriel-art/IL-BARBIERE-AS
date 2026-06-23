'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Future: send to Sentry/Supabase logging
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='flex flex-col items-center justify-center min-h-[200px] p-6 glass-card border-red-500/30 rounded-2xl'>
          <AlertTriangle className='w-10 h-10 text-red-400 mb-4' />
          <h3 className='text-lg font-bold text-white mb-2'>Algo salió mal</h3>
          <p className='text-sm text-white/50 text-center mb-4 max-w-md'>
            {this.state.error?.message || 'Error inesperado en la aplicación'}
          </p>
          <button
            type='button'
            onClick={this.handleRetry}
            className='flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors'
          >
            <RefreshCw className='w-4 h-4' />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
