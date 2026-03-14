import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './app/providers/AuthProvider'
import { QueryClientProvider } from './app/providers/QueryClientProvider'
import { ToastProvider } from './components/ui/Toast'
import { setupSentry } from './lib/monitoring/sentry'
import * as Sentry from '@sentry/react'
import './styles/globals.css'

setupSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="p-8 text-sm text-slate-600">Something went wrong. Please refresh.</div>}>
      <QueryClientProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
