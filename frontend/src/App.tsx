import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { PageLoader } from './components/ui/LoadingSpinner'
import Layout from './components/layout/Layout'

// Lazy load pages for code splitting
const LoginPage      = lazy(() => import('./pages/auth/LoginPage'))
const SignupPage     = lazy(() => import('./pages/auth/SignupPage'))
const DashboardPage  = lazy(() => import('./pages/dashboard/DashboardPage'))
const FoodScanner    = lazy(() => import('./pages/scanner/FoodScannerPage'))
const MenuScanner    = lazy(() => import('./pages/scanner/MenuScannerPage'))
const ProfilePage    = lazy(() => import('./pages/profile/ProfilePage'))
const AnalyticsPage  = lazy(() => import('./pages/analytics/AnalyticsPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <GuestRoute><LoginPage /></GuestRoute>
          } />
          <Route path="/signup" element={
            <GuestRoute><SignupPage /></GuestRoute>
          } />

          {/* Protected routes inside Layout */}
          <Route path="/" element={
            <ProtectedRoute><Layout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />} />
            <Route path="scan/food"  element={<FoodScanner />} />
            <Route path="scan/menu"  element={<MenuScanner />} />
            <Route path="profile"    element={<ProfilePage />} />
            <Route path="analytics"  element={<AnalyticsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
