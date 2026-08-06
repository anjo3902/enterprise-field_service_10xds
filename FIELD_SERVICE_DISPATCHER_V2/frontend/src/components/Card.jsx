import { memo } from 'react'

function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || subtitle || actions) && (
        <header className='mb-4 flex items-start justify-between gap-3'>
          <div>
            {title ? <h3 className='text-lg font-semibold text-primary'>{title}</h3> : null}
            {subtitle ? <p className='text-sm text-secondary mt-1'>{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export default memo(Card)
