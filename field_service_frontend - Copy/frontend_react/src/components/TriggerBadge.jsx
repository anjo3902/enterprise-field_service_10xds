import { memo, useState } from 'react'
import { AlertCircle, HelpCircle, ImageOff, Info, ShieldAlert, TrendingUp } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

export const TRIGGER_META = {
  LOW_CONFIDENCE: {
    label: 'Low Confidence Classification',
    short: 'Low Confidence',
    description:
      'The AI classification confidence is below the 50% threshold. A human should verify the fault type and severity before dispatch.',
    Icon: HelpCircle,
    cls: { box: 'bg-amber-50 border-amber-300', text: 'text-amber-700', dim: 'text-amber-600/50', divider: 'border-amber-300' },
  },
  INVALID_IMAGE: {
    label: 'Invalid Maintenance Image',
    short: 'Invalid Image',
    description:
      'The submitted image was not recognised as a valid facility maintenance issue. The request cannot be auto-approved until a valid image or a manual override is provided.',
    Icon: ImageOff,
    cls: { box: 'bg-violet-50 border-violet-300', text: 'text-violet-700', dim: 'text-violet-600/50', divider: 'border-violet-300' },
  },
  UNLISTED_FAULT: {
    label: 'Unlisted Fault – Low Confidence',
    short: 'Unlisted Fault',
    description:
      'The fault type does not appear in the predefined taxonomy and the AI confidence is low. Admin should confirm the correct fault category before dispatch.',
    Icon: AlertCircle,
    cls: { box: 'bg-sky-50 border-sky-300', text: 'text-sky-700', dim: 'text-sky-600/50', divider: 'border-sky-300' },
  },
  CRITICAL_REQUIRES_VERIFICATION: {
    label: 'Critical Severity Review',
    short: 'Critical Review',
    description:
      'Critical-severity faults require human authorisation before a technician is dispatched, to prevent incorrect or unsafe assignment.',
    Icon: ShieldAlert,
    cls: { box: 'bg-red-50 border-red-300', text: 'text-red-600', dim: 'text-red-500/50', divider: 'border-red-300' },
  },
  SAFETY_ESCALATION: {
    label: 'Safety Escalation',
    short: 'Safety Risk',
    description:
      'Safety-critical keywords detected (e.g. hospital, school, flooding, sparks). Elevated risk — requires immediate human attention before dispatch.',
    Icon: TrendingUp,
    cls: { box: 'bg-orange-50 border-orange-300', text: 'text-orange-700', dim: 'text-orange-600/50', divider: 'border-orange-300' },
  },
}

export const TRIGGER_ALIAS = {
  LOW_CONFIDENCE_CLASSIFICATION: 'LOW_CONFIDENCE',
  INVALID_MAINTENANCE_IMAGE: 'INVALID_IMAGE',
  UNLISTED_FAULT_LOW_CONFIDENCE: 'UNLISTED_FAULT',
  CRITICAL_SEVERITY_REVIEW: 'CRITICAL_REQUIRES_VERIFICATION',
  SEVERITY_POLICY_REVIEW: 'CRITICAL_REQUIRES_VERIFICATION',
}

export const canonicalKey = (trigger) => {
  const raw = typeof trigger === 'string' ? trigger : trigger?.type || ''
  return TRIGGER_ALIAS[raw] ?? raw
}

export const isPendingHitl = (t) =>
  Boolean(t.requires_human_review) ||
  String(t.status || '').toLowerCase() === 'pending_review'

/** Deduplicate an array of triggers by canonical key, keeping only known ones. */
export const deduplicateTriggers = (triggers) => {
  if (!Array.isArray(triggers) || triggers.length === 0) return []
  const seen = new Set()
  return triggers.filter((t) => {
    const k = canonicalKey(t)
    if (!TRIGGER_META[k] || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ─── Components ───────────────────────────────────────────────────────────────

function TriggerBadge({ trigger, expanded, onToggle, showReason }) {
  const key = canonicalKey(trigger)
  const meta = TRIGGER_META[key]
  if (!meta) return null

  const reason = typeof trigger === 'object' ? trigger?.reason : null
  const { label, description, Icon, cls } = meta

  return (
    <div className={`rounded-lg border overflow-hidden text-[0.8rem] ${cls.box}`}>
      <button
        type='button'
        title={description}
        onClick={onToggle}
        className='flex items-center gap-1.5 w-full bg-transparent border-none px-2.5 py-[7px] cursor-pointer text-left min-w-0'
      >
        <Icon className={`w-[13px] h-[13px] shrink-0 ${cls.text}`} />
        <span className={`font-bold flex-1 truncate text-[0.78rem] ${cls.text}`}>{label}</span>
        <Info className={`w-3 h-3 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''} ${cls.dim}`} />
      </button>

      {expanded && (
        <div className={`px-2.5 pb-2.5 border-t ${cls.divider}`}>
          <p className={`text-[0.75rem] mt-2 leading-relaxed ${cls.text}`}>{description}</p>
          {showReason && reason && reason !== description && (
            <p className={`text-[0.72rem] mt-1.5 opacity-85 italic ${cls.text}`}>AI note: {reason}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function TriggerBadgeStateful({ trigger, compact }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TriggerBadge
      trigger={trigger}
      expanded={expanded}
      onToggle={() => setExpanded((p) => !p)}
      showReason={compact !== true}
    />
  )
}

/** Renders a column of deduplicated trigger badges. */
export function TriggerBadgeList({ triggers, compact }) {
  const unique = deduplicateTriggers(triggers)
  if (unique.length === 0) return <span className='text-gray-400'>—</span>
  return (
    <div className='flex flex-col gap-1 min-w-0'>
      {unique.map((tr, idx) => (
        <TriggerBadgeStateful key={idx} trigger={tr} compact={compact} />
      ))}
    </div>
  )
}

export default memo(TriggerBadge)
