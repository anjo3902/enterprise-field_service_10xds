import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const ALERT_META = {
  success: {
    icon: CheckCircle2,
    wrapperClass: 'inline-alert-success',
    iconClass: 'text-green-700',
    role: 'status',
    live: 'polite',
  },
  error: {
    icon: AlertCircle,
    wrapperClass: 'inline-alert-error',
    iconClass: 'text-red-700',
    role: 'alert',
    live: 'assertive',
  },
  warning: {
    icon: AlertTriangle,
    wrapperClass: 'inline-alert-warning',
    iconClass: 'text-amber-700',
    role: 'alert',
    live: 'assertive',
  },
  info: {
    icon: Info,
    wrapperClass: 'inline-alert-info',
    iconClass: 'text-blue-700',
    role: 'status',
    live: 'polite',
  },
}

export default function InlineAlert({
  type = 'info',
  title = '',
  message,
  onClose,
  className = '',
}) {
  const meta = ALERT_META[type] || ALERT_META.info
  const Icon = meta.icon

  return (
    <div
      className={`inline-alert ${meta.wrapperClass} ${className}`.trim()}
      role={meta.role}
      aria-live={meta.live}
      data-testid='notification-inline'
      data-notification-type={type}
    >
      <div className='inline-alert-content'>
        <Icon className={`h-4 w-4 shrink-0 ${meta.iconClass}`} aria-hidden='true' />
        <div className='min-w-0'>
          {title ? <p className='inline-alert-title'>{title}</p> : null}
          <p className='inline-alert-message'>{message}</p>
        </div>
      </div>
      {typeof onClose === 'function' ? (
        <button
          type='button'
          className='inline-alert-close-btn'
          onClick={onClose}
          aria-label='Dismiss alert'
        >
          <X className='h-4 w-4' aria-hidden='true' />
        </button>
      ) : null}
    </div>
  )
}
