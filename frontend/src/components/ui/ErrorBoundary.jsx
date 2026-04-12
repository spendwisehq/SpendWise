import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="ui-error-boundary">
          <div className="ui-error-boundary__icon" aria-hidden="true">
            <AlertTriangle size={40} />
          </div>
          <h2 className="ui-error-boundary__title">Something went wrong</h2>
          <p className="ui-error-boundary__message">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="ui-error-boundary__actions">
            <button
              className="ui-error-boundary__btn"
              onClick={this.handleReset}
            >
              <RefreshCw size={15} />
              Try Again
            </button>
            <button
              className="ui-error-boundary__btn ui-error-boundary__btn--ghost"
              onClick={() => window.location.reload()}
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
