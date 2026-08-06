const colorMap = {
  pending: 'badge-medium',
  pending_review: 'badge-medium',
  pending_human_review: 'badge-medium',
  review_required: 'badge-medium',
  approved: 'bg-green-100 text-green-700',
  approved_by_admin: 'bg-green-100 text-green-700',
  auto_approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  rejected_by_admin: 'bg-red-100 text-red-700',
  normal: 'bg-slate-100 text-slate-700',
  assigned: 'badge-high',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'badge-low',
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  critical: 'badge-critical',
}

export default function StatusBadge({ value }) {
  const normalized = String(value || 'pending').toLowerCase()
  const cls = colorMap[normalized] || 'badge-low'
  const label = normalized.replaceAll('_', ' ')
  return <span className={`badge ${cls}`} role='status' aria-label={`Status: ${label}`}>{label}</span>
}
