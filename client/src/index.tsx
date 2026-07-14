import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

// 简化的 ErrorRender 替代品（不依赖妙搭 SDK）
const ErrorRender: React.FC<{ error: Error; resetErrorBoundary?: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
    <h2 style={{ color: '#dc2626', marginBottom: 12 }}>胖大星出错了 😢</h2>
    <pre style={{ background: '#fef2f2', padding: 12, borderRadius: 8, overflow: 'auto' }}>
      {error?.message || '未知错误'}
    </pre>
    {resetErrorBoundary && (
      <button
        onClick={resetErrorBoundary}
        style={{
          marginTop: 12,
          padding: '8px 16px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        重试
      </button>
    )}
  </div>
);

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorRender
            error={error as Error}
            resetErrorBoundary={resetErrorBoundary}
          />
        )}
      >
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
      </ErrorBoundary>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
