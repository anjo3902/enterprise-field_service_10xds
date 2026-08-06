import { LogOut, Menu, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import AppMark from '../icons/AppMark'
import { useAuth } from '../hooks/useAuth'

export default function Navbar({ title, links = [] }) {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  return (
    <header className='bg-card border-b border-gray-200 sticky top-0 z-40'>
      <div className='container mx-auto px-4 md:px-6 py-3'>
        <div className='flex items-center justify-between gap-3'>
          <AppMark className='w-8 h-8' />
          <div className='min-w-0'>
            <p className='text-xs text-secondary uppercase tracking-wide truncate'>Field Service Platform</p>
            <h1 className='text-primary font-semibold truncate'>{title}</h1>
          </div>

          <nav className='hidden md:flex items-center gap-1 lg:gap-2 flex-1 justify-center min-w-0'>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={Boolean(link.end)}
                className={({ isActive }) =>
                  [
                    'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-primary hover:bg-gray-100 border border-transparent'
                  ].join(' ')
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className='flex items-center gap-2 sm:gap-3'>
            <div className='text-right hidden sm:block'>
              <p className='text-sm font-medium text-primary'>{user?.name || 'User'}</p>
              <p className='text-xs text-secondary capitalize'>{user?.role || '-'}</p>
            </div>
            <button
              type='button'
              onClick={logout}
              className='px-3 py-2 border border-gray-300 rounded-lg text-sm text-primary hover:bg-gray-50 flex items-center gap-2'
            >
              <LogOut className='w-4 h-4' />
              <span className='hidden sm:inline'>Logout</span>
            </button>
            <button
              type='button'
              className='md:hidden px-2.5 py-2 border border-gray-300 rounded-lg text-primary hover:bg-gray-50'
              onClick={() => setMobileOpen((v) => !v)}
              aria-label='Toggle navigation menu'
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className='w-4 h-4' /> : <Menu className='w-4 h-4' />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <nav className='md:hidden mt-3 border border-gray-200 rounded-lg bg-white p-2 space-y-1'>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={Boolean(link.end)}
                onClick={closeMobile}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-white' : 'text-primary hover:bg-gray-100',
                  ].join(' ')
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  )
}
