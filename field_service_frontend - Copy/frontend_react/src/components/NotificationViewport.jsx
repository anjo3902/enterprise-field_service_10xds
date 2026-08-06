import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const TYPE_META = {
  success: {
    icon: CheckCircle2,
    cardClass: 'notification-card-success',
    iconClass: 'text-green-700',
    role: 'status',
    live: 'polite',
    label: 'Success notification',
  },
  error: {
    icon: AlertCircle,
    cardClass: 'notification-card-error',
    iconClass: 'text-red-700',
    role: 'alert',
    live: 'assertive',
    label: 'Error notification',
  },
  warning: {
    icon: AlertTriangle,
    cardClass: 'notification-card-warning',
    iconClass: 'text-amber-700',
    role: 'alert',
    live: 'assertive',
    label: 'Warning notification',
  },
  info: {
    icon: Info,
    cardClass: 'notification-card-info',
    iconClass: 'text-blue-700',
    role: 'status',
    live: 'polite',
    label: 'Information notification',
  },
}

function ToastItem({ item, onDismiss, onPause, onResume }) {
  const meta = TYPE_META[item.type] || TYPE_META.info
  const Icon = meta.icon
  const hasTitle = Boolean(item.title)

  return (
    <article
      className={`notification-card ${meta.cardClass}`}
      role={meta.role}
      aria-live={meta.live}
      aria-label={meta.label}
      tabIndex={0}
      data-testid='notification-toast'
      data-notification-type={item.type}
      onMouseEnter={() => onPause(item.id)}
      onMouseLeave={() => onResume(item.id)}
      onFocus={() => onPause(item.id)}
      onBlur={() => onResume(item.id)}
    >
      <div className='notification-content'>
        <Icon className={`h-5 w-5 shrink-0 ${meta.iconClass}`} aria-hidden='true' />
        <div className='min-w-0'>
          {hasTitle ? <p className='notification-title'>{item.title}</p> : null}
          <p className='notification-message'>{item.message}</p>
        </div>
      </div>

      <button
        type='button'
        className='notification-close-btn'
        onClick={() => onDismiss(item.id)}
        aria-label='Dismiss notification'
      >
        <X className='h-4 w-4' aria-hidden='true' />
      </button>
    </article>
  )
}

export default function NotificationViewport({ notifications, onDismiss, onPause, onResume }) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return null
  }

  return (
    <section className='notification-region' data-testid='notification-region' aria-label='Notifications'>
      {notifications.map((item) => (
        <ToastItem
          key={item.id}
          item={item}
          onDismiss={onDismiss}
          onPause={onPause}
          onResume={onResume}
        />
      ))}
    </section>
  )
}
