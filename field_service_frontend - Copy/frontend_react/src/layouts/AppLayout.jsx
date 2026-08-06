import Navbar from '../components/Navbar'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MOTION_DURATION, buildMotionTransition, getPageVariants } from '../utils/motion'

export default function AppLayout({ title, links }) {
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const pageVariants = getPageVariants(prefersReducedMotion)
  const pageTransition = buildMotionTransition(prefersReducedMotion, MOTION_DURATION.page)

  return (
    <div className='min-h-screen bg-background'>
      <Navbar title={title} links={links} />
      <div className='container mx-auto px-4 md:px-6 py-6'>
        <AnimatePresence mode='wait' initial={false}>
          <motion.main
            key={location.pathname}
            className='min-w-0 w-full max-w-full'
            initial='initial'
            animate='animate'
            exit='exit'
            variants={pageVariants}
            transition={pageTransition}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
