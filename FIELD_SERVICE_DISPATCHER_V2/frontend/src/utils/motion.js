export const MOTION_EASE_STANDARD = [0.22, 1, 0.36, 1]

export const MOTION_DURATION = {
  micro: 0.16,
  page: 0.22,
  modal: 0.24,
  reduced: 0.01,
}

export function buildMotionTransition(prefersReducedMotion, duration = MOTION_DURATION.page) {
  if (prefersReducedMotion) {
    return { duration: MOTION_DURATION.reduced }
  }
  return { duration, ease: MOTION_EASE_STANDARD }
}

export function getPageVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
    }
  }

  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
  }
}

export function getModalOverlayVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
    }
  }

  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  }
}

export function getModalPanelVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 1, y: 0, scale: 1 },
    }
  }

  return {
    initial: { opacity: 0, y: 14, scale: 0.995 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.995 },
  }
}
