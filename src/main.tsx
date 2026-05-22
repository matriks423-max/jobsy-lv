import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { LocaleProvider } from "@/lib/locale-context"
import ErrorBoundary from "@/components/ErrorBoundary"
import { initSentry } from "@/lib/sentry"
import App from './App.tsx'

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <TRPCProvider>
          <LocaleProvider>
            <App />
          </LocaleProvider>
        </TRPCProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
