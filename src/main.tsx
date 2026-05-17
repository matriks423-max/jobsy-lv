import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { LocaleProvider } from "@/lib/locale-context"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <LocaleProvider>
          <App />
        </LocaleProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
