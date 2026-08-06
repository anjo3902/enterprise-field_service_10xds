import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  MOTION_DURATION,
  buildMotionTransition,
  getModalOverlayVariants,
  getModalPanelVariants,
} from '../utils/motion'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false
    if (el.getAttribute('aria-hidden') === 'true') return false
    return el.offsetParent !== null || el === document.activeElement
  })
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-3xl',
  closeLabel = 'Close',
  initialFocusRef,
  closeOnOverlayClick = true,
  showCloseButton = true,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const returnFocusRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  const overlayVariants = getModalOverlayVariants(prefersReducedMotion)
  const panelVariants = getModalPanelVariants(prefersReducedMotion)
  const overlayTransition = buildMotionTransition(prefersReducedMotion, MOTION_DURATION.modal)
  const panelTransition = buildMotionTransition(prefersReducedMotion, MOTION_DURATION.modal)

  useEffect(() => {
    if (!isOpen) return undefined

    const activeEl = document.activeElement
    returnFocusRef.current = activeEl instanceof HTMLElement ? activeEl : null

    const body = document.body
    const scrollY = window.scrollY
    const prevBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    const target =
      initialFocusRef?.current
      || closeButtonRef.current
      || getFocusableElements(panelRef.current)[0]
      || panelRef.current

    requestAnimationFrame(() => {
      if (target instanceof HTMLElement) {
        target.focus()
      }
    })

    return () => {
      body.style.overflow = prevBodyStyles.overflow
      body.style.position = prevBodyStyles.position
      body.style.top = prevBodyStyles.top
      body.style.left = prevBodyStyles.left
      body.style.right = prevBodyStyles.right
      body.style.width = prevBodyStyles.width
      window.scrollTo({ top: scrollY, behavior: 'auto' })
      if (returnFocusRef.current instanceof HTMLElement) {
        returnFocusRef.current.focus()
      }
    }
  }, [initialFocusRef, isOpen])

  const onPanelKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose?.()
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const focusable = getFocusableElements(panelRef.current)
    if (focusable.length === 0) {
      event.preventDefault()
      panelRef.current?.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const current = document.activeElement

    if (event.shiftKey && current === first) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleOverlayClick = (event) => {
    if (!closeOnOverlayClick) return
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  return createPortal(
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          className='fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-6 sm:py-10'
          onClick={handleOverlayClick}
          initial='initial'
          animate='animate'
          exit='exit'
          variants={overlayVariants}
          transition={overlayTransition}
        >
          <motion.div
            ref={panelRef}
            role='dialog'
            aria-modal='true'
            aria-label={title || description || 'Dialog'}
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            className={`relative mx-auto w-full ${maxWidth} rounded-lg border border-gray-200 bg-white p-5 shadow-xl max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain`}
            tabIndex={-1}
            onKeyDown={onPanelKeyDown}
            initial='initial'
            animate='animate'
            exit='exit'
            variants={panelVariants}
            transition={panelTransition}
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                {title ? (
                  <h3 id={titleId} className='text-lg font-semibold text-primary'>
                    {title}
                  </h3>
                ) : null}
                {description ? (
                  <p id={descriptionId} className='text-xs text-secondary mt-1'>
                    {description}
                  </p>
                ) : null}
              </div>
              {showCloseButton ? (
                <button
                  ref={closeButtonRef}
                  type='button'
                  className='action-btn action-btn-view'
                  onClick={onClose}
                  aria-label={closeLabel}
                >
                  <X className='w-4 h-4' />
                  {closeLabel}
                </button>
              ) : null}
            </div>

            <div className='mt-4'>{children}</div>

            {footer ? <div className='mt-4'>{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}