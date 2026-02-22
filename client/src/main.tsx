import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './app/providers/AuthProvider'
import { QueryClientProvider } from './app/providers/QueryClientProvider'
import { ToastProvider } from './components/ui/Toast'
import { resetStorage } from './lib/storage'
import './styles/globals.css'

// Expose resetStorage globally for easy data refresh
(window as any).resetStorage = resetStorage;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
