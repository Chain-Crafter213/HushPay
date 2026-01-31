import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/ui/Toaster'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'))
const AppLayout = lazy(() => import('./pages/AppLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NewInvoicePage = lazy(() => import('./pages/NewInvoicePage'))
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'))
const PaymentPage = lazy(() => import('./pages/PaymentPage'))
const ReceiptPage = lazy(() => import('./pages/ReceiptPage'))
const MerchantSettingsPage = lazy(() => import('./pages/MerchantSettingsPage'))
const DisputesPage = lazy(() => import('./pages/DisputesPage'))
const MilestonesPage = lazy(() => import('./pages/MilestonesPage'))

function App() {
  return (
    <>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pay/:id" element={<PaymentPage />} />
          <Route path="/receipt/:id" element={<ReceiptPage />} />
          
          {/* Protected app routes */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="new" element={<NewInvoicePage />} />
            <Route path="invoice/:id" element={<InvoiceDetailPage />} />
            <Route path="disputes" element={<DisputesPage />} />
            <Route path="milestones" element={<MilestonesPage />} />
            <Route path="settings" element={<MerchantSettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </>
  )
}

export default App
