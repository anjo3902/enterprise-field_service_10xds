import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, ClipboardList, Home, Route as RouteIcon, ShieldCheck, UserCircle2, Wrench } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuth } from './hooks/useAuth'
import AppLayout from './layouts/AppLayout'
import { MOTION_DURATION, buildMotionTransition, getPageVariants } from './utils/motion'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import Dashboard from './pages/Dashboard'
import { validateEnv } from './config/validateEnv'
import { PopupProvider } from './components/ui/PopupProvider'

// Heavy pages are lazy-loaded so the initial JS bundle is smaller
// and users only download what they actually navigate to.
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminActivityPage  = lazy(() => import('./pages/admin/AdminActivityPage'))
const CustomerDashboard  = lazy(() => import('./pages/customer/CustomerDashboard'))
const TechnicianDashboard      = lazy(() => import('./pages/technician/TechnicianDashboard'))
const TechnicianProfilePage    = lazy(() => import('./pages/technician/TechnicianProfilePage'))
const MobileGPSPage            = lazy(() => import('./pages/mobile/MobileGPSPage'))

// Minimal inline fallback – no extra component needed
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#6b7280', fontSize: '14px' }}>
    Loading…
  </div>
)

function RootRedirect() {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  if (role === 'admin') {
    return <Navigate to='/admin' replace />
  }

  if (role === 'technician') {
    return <Navigate to='/technician' replace />
  }

  return <Navigate to='/customer' replace />
}

function CustomerLayout() {
  const links = [
    { to: '/customer', label: 'Dashboard', icon: <Home className='w-4 h-4' /> },
    { to: '/customer/new-request', label: 'New Request', icon: <ClipboardList className='w-4 h-4' /> },
  ]

  return <AppLayout title='Customer Workspace' links={links} />
}

function TechnicianLayout() {
  const links = [
    { to: '/technician', label: 'Assigned Jobs', icon: <Wrench className='w-4 h-4' />, end: true },
    { to: '/technician/route', label: 'Route Plan', icon: <RouteIcon className='w-4 h-4' /> },
    { to: '/technician/profile', label: 'Profile Details', icon: <UserCircle2 className='w-4 h-4' /> },
  ]

  return <AppLayout title='Technician Workspace' links={links} />
}

function AdminLayout() {
  const links = [
    { to: '/admin', label: 'Operations', icon: <ShieldCheck className='w-4 h-4' />, end: true },
    { to: '/admin/activity', label: 'Activity', icon: <Activity className='w-4 h-4' /> },
  ]

  return <AppLayout title='Admin Control Center' links={links} />
}

function PublicLayout() {
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const pageVariants = getPageVariants(prefersReducedMotion)
  const pageTransition = buildMotionTransition(prefersReducedMotion, MOTION_DURATION.page)

  return (
    <AnimatePresence mode='wait' initial={false}>
      <motion.div
        key={location.pathname}
        initial='initial'
        animate='animate'
        exit='exit'
        variants={pageVariants}
        transition={pageTransition}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

function App() {
  useEffect(() => {
    console.log('ENV KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
    validateEnv()
  }, [])

  return (
    <PopupProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path='/' element={<RootRedirect />} />

          <Route path='/mobile-gps' element={<MobileGPSPage />} />

          <Route element={<PublicLayout />}>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/signup' element={<SignupPage />} />
          </Route>

          <Route
            path='/customer'
            element={
              <ProtectedRoute role='customer'>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ErrorBoundary><CustomerDashboard /></ErrorBoundary>} />
          </Route>

          <Route
            path='/customer/new-request'
            element={
              <ProtectedRoute role='customer'>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard embedded />} />
          </Route>

          <Route
            path='/technician'
            element={
              <ProtectedRoute role='technician'>
                <TechnicianLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ErrorBoundary><TechnicianDashboard /></ErrorBoundary>} />
            <Route path='jobs/:jobId' element={<ErrorBoundary><TechnicianDashboard /></ErrorBoundary>} />
            <Route path='route' element={<ErrorBoundary><TechnicianDashboard routeOnly /></ErrorBoundary>} />
            <Route path='profile' element={<ErrorBoundary><TechnicianProfilePage /></ErrorBoundary>} />
          </Route>

          <Route
            path='/admin'
            element={
              <ProtectedRoute role='admin'>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
            <Route path='activity' element={<ErrorBoundary><AdminActivityPage /></ErrorBoundary>} />
          </Route>

          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </Suspense>
    </PopupProvider>
  )
}

export default App
