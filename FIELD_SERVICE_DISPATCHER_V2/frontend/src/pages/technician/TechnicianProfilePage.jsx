import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Clock3,
  Pencil,
  Save,
  ShieldCheck,
  UserCircle2,
  X,
} from 'lucide-react'
import LoadingState from '../../components/LoadingState'

import Card from '../../components/Card'
import { technicianApi } from '../../services/api'
import useNotification from '../../hooks/useNotification'

const DEFAULT_WORKING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COMMON_SKILL_OPTIONS = [
  'pipe_leakage',
  'burst_pipe',
  'toilet_overflow',
  'drain_blockage',
  'exposed_wiring',
  'electrical_spark',
  'power_outage',
  'circuit_breaker_trip',
  'fire_alarm_fault',
  'smoke_detector_fault',
  'sprinkler_leak',
  'ac_not_working',
  'ac_not_cooling',
  'hvac_control_panel_error',
  'elevator_stuck',
  'door_not_closing',
  'wall_crack',
]
const COMMON_CERTIFICATION_OPTIONS = [
  'Electrical Safety Compliance',
  'Advanced Plumbing Systems',
  'HVAC Systems Service',
  'Fire Protection Maintenance',
  'Building Mechanical Systems',
  'Emergency Response Protocol',
  'Preventive Maintenance Planning',
]

const toArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
      } catch {
        // Fall back to comma-separated parsing
      }
    }
    return text.split(',').map((v) => v.trim()).filter(Boolean)
  }
  return []
}

const fmtBool = (value) => (value ? 'Yes' : 'No')

function InfoGrid({ items }) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
      {items.map((item) => (
        <div key={item.label} className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
          <p className='text-xs text-secondary'>{item.label}</p>
          <p className='text-sm font-medium text-primary mt-1 break-words'>{item.value || '-'}</p>
        </div>
      ))}
    </div>
  )
}

function MultiSelectChips({ label, values, options, onToggle, disabled = false, error = '' }) {
  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium text-primary'>{label}</p>
      <div className='flex flex-wrap gap-2'>
        {options.map((option) => {
          const selected = values.includes(option)
          return (
            <button
              key={option}
              type='button'
              onClick={() => onToggle(option)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                selected
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-gray-300 hover:border-primary/60'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {option}
            </button>
          )
        })}
      </div>
      {error ? <p className='text-xs text-danger'>{error}</p> : null}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, editable, editing, onEdit, onCancel, onSave, saving }) {
  return (
    <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4'>
      <div className='flex items-start gap-2'>
        <Icon className='w-5 h-5 text-primary mt-0.5' />
        <div>
          <h3 className='text-base font-semibold text-primary'>{title}</h3>
          <p className='text-xs text-secondary'>{subtitle}</p>
        </div>
      </div>

      {editable ? (
        <div className='flex items-center gap-2'>
          {!editing ? (
            <button type='button' className='btn-primary !py-2 !px-3 text-xs inline-flex items-center gap-1.5' onClick={onEdit}>
              <Pencil className='w-3.5 h-3.5' />
              Edit
            </button>
          ) : (
            <>
              <button
                type='button'
                className='px-3 py-2 rounded-md border border-gray-300 text-primary text-xs inline-flex items-center gap-1.5 hover:bg-gray-50'
                onClick={onCancel}
                disabled={saving}
              >
                <X className='w-3.5 h-3.5' />
                Cancel
              </button>
              <button
                type='button'
                className='btn-primary !py-2 !px-3 text-xs inline-flex items-center gap-1.5'
                onClick={onSave}
                disabled={saving}
              >
                <Save className='w-3.5 h-3.5' />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function TechnicianProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const notification = useNotification()

  const [editingSkills, setEditingSkills] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [savingSkills, setSavingSkills] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [skillsError, setSkillsError] = useState('')
  const [scheduleError, setScheduleError] = useState('')
  const [skillsDraft, setSkillsDraft] = useState({ skills: [], certified_skills: [], certifications: [] })
  const [scheduleDraft, setScheduleDraft] = useState({ shift_start: '', shift_end: '', working_days: [] })

  const hydrateDrafts = (nextProfile) => {
    setSkillsDraft({
      skills: toArray(nextProfile?.skills),
      certified_skills: toArray(nextProfile?.certified_skills),
      certifications: toArray(nextProfile?.certifications),
    })
    setScheduleDraft({
      shift_start: nextProfile?.shift_start || '',
      shift_end: nextProfile?.shift_end || '',
      working_days: toArray(nextProfile?.working_days),
    })
  }

  const loadProfile = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await technicianApi.getProfile()
      setProfile(data)
      hydrateDrafts(data)
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to load technician profile'
      setError(detail)
      notification.error({
        title: 'Profile Load Failed',
        message: detail,
        dedupeKey: `technician-profile:load-failed:${detail}`,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const profileItems = [
    { label: 'Name', value: profile?.technician_name },
    { label: 'Technician Code', value: profile?.technician_code },
    { label: 'Phone Number', value: profile?.phone_number },
    { label: 'Primary Domain', value: profile?.primary_domain },
    { label: 'Experience Level', value: profile?.experience_level },
    { label: 'Location Zone', value: profile?.location_zone },
    { label: 'Critical Fault Eligible', value: fmtBool(profile?.critical_fault_eligible) },
    {
      label: 'Coordinates',
      value:
        profile?.latitude !== null && profile?.latitude !== undefined && profile?.longitude !== null && profile?.longitude !== undefined
          ? `${Number(profile.latitude).toFixed(6)}, ${Number(profile.longitude).toFixed(6)}`
          : '-',
    },
  ]

  const workStatusItems = [
    { label: 'Availability Status', value: profile?.availability_state },
    { label: 'Current Jobs', value: profile?.current_jobs ?? '-' },
    { label: 'Max Jobs Per Day', value: profile?.max_jobs_per_day ?? '-' },
  ]

  const allSkillOptions = useMemo(() => {
    const merged = [...COMMON_SKILL_OPTIONS, ...toArray(profile?.skills), ...toArray(profile?.certified_skills)]
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b))
  }, [profile])

  const allCertificationOptions = useMemo(() => {
    const merged = [...COMMON_CERTIFICATION_OPTIONS, ...toArray(profile?.certifications)]
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b))
  }, [profile])

  const toggleDraftItem = (key, item) => {
    setSkillsError('')
    setSkillsDraft((prev) => {
      const exists = prev[key].includes(item)
      return {
        ...prev,
        [key]: exists ? prev[key].filter((v) => v !== item) : [...prev[key], item],
      }
    })
  }

  const toggleWorkingDay = (day) => {
    setScheduleError('')
    setScheduleDraft((prev) => {
      const exists = prev.working_days.includes(day)
      return {
        ...prev,
        working_days: exists ? prev.working_days.filter((v) => v !== day) : [...prev.working_days, day],
      }
    })
  }

  const handleSaveSkills = async () => {
    if (!skillsDraft.skills.length || !skillsDraft.certified_skills.length) {
      setSkillsError('At least one skill and one certified skill are required.')
      return
    }

    setSavingSkills(true)
    setSkillsError('')
    try {
      const updated = await technicianApi.updateSkills({
        skills: skillsDraft.skills,
        certified_skills: skillsDraft.certified_skills,
        certifications: skillsDraft.certifications,
      })
      setProfile((prev) => ({
        ...prev,
        skills: toArray(updated.skills),
        certified_skills: toArray(updated.certified_skills),
        certifications: toArray(updated.certifications),
      }))
      setEditingSkills(false)
      notification.success({
        title: 'Skills Updated',
        message: updated.message || 'Skills and certifications updated successfully.',
        dedupeKey: 'technician-profile:skills-updated',
      })
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to save skills and certifications.'
      setSkillsError(detail)
      notification.error({
        title: 'Skills Update Failed',
        message: detail,
        dedupeKey: `technician-profile:skills-update-failed:${detail}`,
      })
    } finally {
      setSavingSkills(false)
    }
  }

  const handleSaveSchedule = async () => {
    const shiftRegex = /^([01]\d|2[0-3]):[0-5]\d$/
    if (!shiftRegex.test(scheduleDraft.shift_start) || !shiftRegex.test(scheduleDraft.shift_end)) {
      setScheduleError('Shift times must be in HH:MM format.')
      return
    }
    if (scheduleDraft.shift_start >= scheduleDraft.shift_end) {
      setScheduleError('Shift end must be later than shift start.')
      return
    }
    if (!scheduleDraft.working_days.length) {
      setScheduleError('Select at least one working day.')
      return
    }

    setSavingSchedule(true)
    setScheduleError('')
    try {
      const updated = await technicianApi.updateSchedule({
        shift_start: scheduleDraft.shift_start,
        shift_end: scheduleDraft.shift_end,
        working_days: scheduleDraft.working_days,
      })
      setProfile((prev) => ({
        ...prev,
        shift_start: updated.shift_start,
        shift_end: updated.shift_end,
        working_days: toArray(updated.working_days),
      }))
      setEditingSchedule(false)
      notification.success({
        title: 'Schedule Updated',
        message: updated.message || 'Work schedule updated successfully.',
        dedupeKey: 'technician-profile:schedule-updated',
      })
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to save work schedule.'
      setScheduleError(detail)
      notification.error({
        title: 'Schedule Update Failed',
        message: detail,
        dedupeKey: `technician-profile:schedule-update-failed:${detail}`,
      })
    } finally {
      setSavingSchedule(false)
    }
  }

  const cancelSkillsEdit = () => {
    setEditingSkills(false)
    setSkillsError('')
    setSkillsDraft({
      skills: toArray(profile?.skills),
      certified_skills: toArray(profile?.certified_skills),
      certifications: toArray(profile?.certifications),
    })
  }

  const cancelScheduleEdit = () => {
    setEditingSchedule(false)
    setScheduleError('')
    setScheduleDraft({
      shift_start: profile?.shift_start || '',
      shift_end: profile?.shift_end || '',
      working_days: toArray(profile?.working_days),
    })
  }

  return (
    <div className='space-y-6'>
      <Card title='Technician Profile Details' subtitle='Dedicated profile management workspace'>
        <div className='mb-4 flex items-center justify-between gap-2'>
          <p className='text-xs text-secondary'>Profile data is separated from assigned jobs for a cleaner workflow.</p>
          <Link to='/technician' className='px-3 py-2 rounded-md border border-gray-300 text-primary text-xs inline-flex items-center gap-1.5 hover:bg-gray-50'>
            <ArrowLeft className='w-3.5 h-3.5' />
            Back to Assigned Jobs
          </Link>
        </div>

        {loading ? (
          <LoadingState
            label='Loading profile'
            detail='Fetching technician profile, skills, certifications, and schedule.'
          />
        ) : null}
        {error ? <p className='text-red-600 text-sm'>{error}</p> : null}

        {!loading && !error && !profile ? (
          <div className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-secondary'>
            No technician profile data is available yet.
          </div>
        ) : null}

        {!loading && !error && profile ? (
          <div className='space-y-4'>
            <div className='rounded-xl border border-gray-200 bg-white p-4'>
              <SectionHeader icon={UserCircle2} title='Profile' subtitle='Read-only identity and field assignment details' />
              <InfoGrid items={profileItems} />
            </div>

            <div className='rounded-xl border border-gray-200 bg-white p-4'>
              <SectionHeader icon={Briefcase} title='Work Status' subtitle='Read-only live operational status from dispatch system' />
              <InfoGrid items={workStatusItems} />
            </div>

            <div className='rounded-xl border border-gray-200 bg-white p-4'>
              <SectionHeader
                icon={ShieldCheck}
                title='Skills & Certifications'
                subtitle='Editable competency profile used for dispatch eligibility'
                editable
                editing={editingSkills}
                onEdit={() => {
                  setEditingSkills(true)
                  setSkillsError('')
                }}
                onCancel={cancelSkillsEdit}
                onSave={handleSaveSkills}
                saving={savingSkills}
              />

              {!editingSkills ? (
                <InfoGrid
                  items={[
                    { label: 'Skills', value: toArray(profile.skills).join(', ') || '-' },
                    { label: 'Certified Skills', value: toArray(profile.certified_skills).join(', ') || '-' },
                    { label: 'Certifications', value: toArray(profile.certifications).join(', ') || '-' },
                  ]}
                />
              ) : (
                <div className='space-y-4'>
                  <MultiSelectChips
                    label='Skills'
                    values={skillsDraft.skills}
                    options={allSkillOptions}
                    onToggle={(item) => toggleDraftItem('skills', item)}
                    disabled={savingSkills}
                  />
                  <MultiSelectChips
                    label='Certified Skills'
                    values={skillsDraft.certified_skills}
                    options={allSkillOptions}
                    onToggle={(item) => toggleDraftItem('certified_skills', item)}
                    disabled={savingSkills}
                  />
                  <MultiSelectChips
                    label='Certifications'
                    values={skillsDraft.certifications}
                    options={allCertificationOptions}
                    onToggle={(item) => toggleDraftItem('certifications', item)}
                    disabled={savingSkills}
                    error={skillsError}
                  />
                </div>
              )}
            </div>

            <div className='rounded-xl border border-gray-200 bg-white p-4'>
              <SectionHeader
                icon={CalendarClock}
                title='Work Schedule'
                subtitle='Editable shift and working-day allocation'
                editable
                editing={editingSchedule}
                onEdit={() => {
                  setEditingSchedule(true)
                  setScheduleError('')
                }}
                onCancel={cancelScheduleEdit}
                onSave={handleSaveSchedule}
                saving={savingSchedule}
              />

              {!editingSchedule ? (
                <InfoGrid
                  items={[
                    { label: 'Shift Start', value: profile.shift_start || '-' },
                    { label: 'Shift End', value: profile.shift_end || '-' },
                    { label: 'Working Days', value: toArray(profile.working_days).join(', ') || '-' },
                  ]}
                />
              ) : (
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-primary inline-flex items-center gap-1.5'>
                        <Clock3 className='w-4 h-4' />
                        Shift Start
                      </label>
                      <input
                        type='time'
                        value={scheduleDraft.shift_start}
                        onChange={(e) => setScheduleDraft((prev) => ({ ...prev, shift_start: e.target.value }))}
                        className='input-field'
                        disabled={savingSchedule}
                      />
                    </div>

                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-primary inline-flex items-center gap-1.5'>
                        <Clock3 className='w-4 h-4' />
                        Shift End
                      </label>
                      <input
                        type='time'
                        value={scheduleDraft.shift_end}
                        onChange={(e) => setScheduleDraft((prev) => ({ ...prev, shift_end: e.target.value }))}
                        className='input-field'
                        disabled={savingSchedule}
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-primary'>Working Days</p>
                    <div className='flex flex-wrap gap-2'>
                      {DEFAULT_WORKING_DAYS.map((day) => {
                        const selected = scheduleDraft.working_days.includes(day)
                        return (
                          <button
                            type='button'
                            key={day}
                            onClick={() => toggleWorkingDay(day)}
                            disabled={savingSchedule}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                              selected
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-primary border-gray-300 hover:border-primary/60'
                            } ${savingSchedule ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {scheduleError ? <p className='text-xs text-danger'>{scheduleError}</p> : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Card>

    </div>
  )
}
