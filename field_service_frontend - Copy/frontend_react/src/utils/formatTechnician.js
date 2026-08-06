/**
 * Shared display utilities for technician fields.
 * Eliminates 5x duplication across dashboards and modals.
 */

/**
 * Format technician name + ID for display in tables and detail views.
 * @param {{ assigned_technician_name?: string, assigned_technician?: string|number }} row
 * @param {{ showPhone?: boolean }} options
 */
export function formatTechnicianName(row, { showPhone = false } = {}) {
  const name = row.assigned_technician_name
  const id = row.assigned_technician
  const phone = showPhone && row.assigned_technician_phone_number
    ? ` | ${row.assigned_technician_phone_number}`
    : ''

  if (name && id) return `${name} (ID: ${id})${phone}`
  if (name) return `${name}${phone}`
  if (id) return `Tech #${id}${phone}`
  return '-'
}

/**
 * Format technician source (zone + coordinates) for display.
 * @param {{ assigned_technician_zone?: string, assigned_technician_latitude?: number, assigned_technician_longitude?: number }} row
 * @param {{ precision?: number }} options
 */
export function formatTechnicianSource(row, { precision = 4 } = {}) {
  const zone = row.assigned_technician_zone || '-'
  const lat = row.assigned_technician_latitude
  const lon = row.assigned_technician_longitude
  const hasCoords =
    lat != null && lat !== '' &&
    lon != null && lon !== '' &&
    Number(lat) !== 0 && Number(lon) !== 0

  if (hasCoords) {
    return `${zone} (${Number(lat).toFixed(precision)}, ${Number(lon).toFixed(precision)})`
  }
  return zone
}
