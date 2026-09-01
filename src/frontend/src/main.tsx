import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Phase 7 Sprint 2: Error Tracking & Observability
import { initializeErrorTracking, setupGlobalErrorHandler } from './services/errorTracking'
import { ErrorBoundary } from './components/ErrorBoundary'

// Initialize Sentry error tracking
const isDev = import.meta.env.DEV
initializeErrorTracking(isDev)
setupGlobalErrorHandler()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
