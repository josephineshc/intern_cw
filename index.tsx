/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error logger to display errors on the DOM if the app crashes before mounting
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 30px; color: #f87171; background-color: #0f172a; min-height: 100vh; font-family: monospace; border: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #ef4444;">🚨 Global Script Error</h1>
        <p style="color: #f1f5f9; font-size: 16px; margin-bottom: 8px;"><strong>Message:</strong> ${event.message}</p>
        <p style="color: #94a3b8; font-size: 14px;"><strong>Source:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
        <pre style="background-color: #020617; padding: 20px; border-radius: 12px; overflow: auto; color: #cbd5e1; border: 1px solid #334155; margin-top: 16px; font-size: 13px; line-height: 1.6;">${event.error?.stack || 'No stack trace available'}</pre>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 30px; color: #f87171; background-color: #0f172a; min-height: 100vh; font-family: monospace; border: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #ef4444;">🚨 Unhandled Promise Rejection</h1>
        <p style="color: #f1f5f9; font-size: 16px; margin-bottom: 8px;"><strong>Reason:</strong> ${event.reason?.toString() || 'Unknown Promise Rejection'}</p>
        <pre style="background-color: #020617; padding: 20px; border-radius: 12px; overflow: auto; color: #cbd5e1; border: 1px solid #334155; margin-top: 16px; font-size: 13px; line-height: 1.6;">${event.reason?.stack || 'No stack trace available'}</pre>
      </div>
    `;
  }
});

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', color: '#f87171', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'monospace', border: '1px solid #1e293b' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#ef4444' }}>🚨 React Component Crash</h1>
          <p style={{ color: '#f1f5f9', fontSize: '16px', marginBottom: '8px' }}><strong>Message:</strong> {this.state.error?.toString()}</p>
          <pre style={{ backgroundColor: '#020617', padding: '20px', borderRadius: '12px', overflow: 'auto', color: '#cbd5e1', border: '1px solid #334155', marginTop: '16px', fontSize: '13px', lineHeight: '1.6' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);