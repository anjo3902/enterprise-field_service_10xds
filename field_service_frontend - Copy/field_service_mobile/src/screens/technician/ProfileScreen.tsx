/* ────────────────────────────────────────────────────────────
 * ProfileScreen
 *
 * React Native conversion of:
 *   frontend_react/src/pages/technician/TechnicianProfilePage.jsx
 *
 * Layout mirrors the web exactly:
 *
 *  CARD — Technician Profile Details
 *    ├─ Section: Profile         (read-only InfoGrid)
 *    ├─ Section: Work Status     (read-only InfoGrid)
 *    ├─ Section: Skills & Certifications  (editable — chip multi-select)
 *    │     Skills | Certified Skills | Certifications
 *    └─ Section: Work Schedule   (editable — time inputs + day chips)
 *          Shift Start | Shift End | Working Days
 *
 * Edit workflow (matches web exactly):
 *   View mode  →  "Edit" button  →  editing mode
 *   Editing    →  chip toggles / text entry
 *   Editing    →  "Save" (validates + PUT) or "Cancel" (reverts draft)
 *
 * Reuses:
 *   • technicianApi.getProfile / updateSkills / updateSchedule
 *   • useNotification
 * ──────────────────────────────────────────────────────────── */

import { User, Briefcase, Shield, Calendar, Clock, Edit2, X, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { TechnicianTabParamList } from '../../types/navigation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Card from '../../components/Card';
import {
  technicianApi,
  TechnicianProfile,
  UpdateSkillsPayload,
  UpdateSchedulePayload,
} from '../../api/technician';
import { useNotification } from '../../providers/NotificationProvider';

// ─── Constants — mirrors the web exactly ──────────────────────

const DEFAULT_WORKING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
];

const COMMON_CERTIFICATION_OPTIONS = [
  'Electrical Safety Compliance',
  'Advanced Plumbing Systems',
  'HVAC Systems Service',
  'Fire Protection Maintenance',
  'Building Mechanical Systems',
  'Emergency Response Protocol',
  'Preventive Maintenance Planning',
];

// ─── Pure helpers — mirrors web toArray / fmtBool ─────────────

function toArray(value: unknown): string[] {
  if (Array.isArray(value))
    return (value as unknown[]).map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed))
          return parsed.map((v) => String(v).trim()).filter(Boolean);
      } catch {
        // fall through to comma-split
      }
    }
    return text.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function fmtBool(v: unknown): string {
  return v ? 'Yes' : 'No';
}

const SHIFT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// ─── InfoGrid — mirrors web InfoGrid component ─────────────────

function InfoGrid({ items }: { items: Array<{ label: string; value?: string | null }> }) {
  return (
    <View style={styles.infoGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.infoCell}>
          <Text style={styles.infoCellLabel}>{item.label}</Text>
          <Text style={styles.infoCellValue}>{item.value || '-'}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── MultiSelectChips — mirrors web MultiSelectChips ──────────

function MultiSelectChips({
  label,
  values,
  options,
  onToggle,
  disabled = false,
  error = '',
}: {
  label: string;
  values: string[];
  options: string[];
  onToggle: (item: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.chipSection}>
      <Text style={styles.chipSectionLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                selected ? styles.chipSelected : styles.chipUnselected,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => onToggle(option)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selected ? styles.chipTextSelected : styles.chipTextUnselected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ─── SectionHeader — mirrors web SectionHeader component ──────

function SectionHeader({
  icon,
  title,
  subtitle,
  editable = false,
  editing = false,
  saving = false,
  onEdit,
  onCancel,
  onSave,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  editable?: boolean;
  editing?: boolean;
  saving?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={{ marginRight: 12 }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
          <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
        </View>
      </View>

      {editable ? (
        <View style={styles.sectionHeaderActions}>
          {!editing ? (
            <TouchableOpacity style={[styles.btnEdit, { flexDirection: 'row', gap: 6 }]} onPress={onEdit}>
              <Edit2 size={14} color={colors.primary.DEFAULT} />
              <Text style={styles.btnEditText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.btnCancel, saving && styles.btnDisabled, { flexDirection: 'row', gap: 6 }]}
                disabled={saving}
                onPress={onCancel}
              >
                <X size={14} color={colors.secondary.DEFAULT} />
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSave, saving && styles.btnDisabled, { flexDirection: 'row', gap: 6 }]}
                disabled={saving}
                onPress={onSave}
              >
                {!saving && <CheckCircle2 size={14} color={colors.card} />}
                <Text style={styles.btnSaveText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────

interface SkillsDraft {
  skills: string[];
  certified_skills: string[];
  certifications: string[];
}

interface ScheduleDraft {
  shift_start: string;
  shift_end: string;
  working_days: string[];
}

export default function ProfileScreen() {
  const notification = useNotification();

  // ── Data state ─────────────────────────────────────────────
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ── Edit state — Skills ────────────────────────────────────
  const [editingSkills, setEditingSkills] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillsError, setSkillsError] = useState('');
  const [skillsDraft, setSkillsDraft] = useState<SkillsDraft>({
    skills: [],
    certified_skills: [],
    certifications: [],
  });

  // ── Edit state — Schedule ──────────────────────────────────
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    shift_start: '',
    shift_end: '',
    working_days: [],
  });

  // ── Derived options — mirror web useMemo allSkillOptions ──

  const allSkillOptions = useMemo(() => {
    const merged = [
      ...COMMON_SKILL_OPTIONS,
      ...toArray(profile?.skills),
      ...toArray(profile?.certified_skills),
    ];
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
  }, [profile]);

  const allCertificationOptions = useMemo(() => {
    const merged = [
      ...COMMON_CERTIFICATION_OPTIONS,
      ...toArray(profile?.certifications),
    ];
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
  }, [profile]);

  // ── Hydrate drafts — mirror web hydrateDrafts ─────────────

  const hydrateDrafts = useCallback((p: TechnicianProfile) => {
    setSkillsDraft({
      skills: toArray(p.skills),
      certified_skills: toArray(p.certified_skills),
      certifications: toArray(p.certifications),
    });
    setScheduleDraft({
      shift_start: p.shift_start || '',
      shift_end: p.shift_end || '',
      working_days: toArray(p.working_days),
    });
  }, []);

  // ── Load profile ───────────────────────────────────────────

  const loadProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await technicianApi.getProfile();
      setProfile(data);
      hydrateDrafts(data);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || 'Failed to load technician profile';
      setError(detail);
      notification.error({
        title: 'Profile Load Failed',
        message: detail,
        dedupeKey: `tech-profile:load-failed:${detail}`,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hydrateDrafts, notification]);

  useEffect(() => {
    loadProfile();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile(true);
  }, [loadProfile]);

  // ── Skills: toggle draft ───────────────────────────────────

  const toggleDraftItem = useCallback(
    (key: keyof SkillsDraft, item: string) => {
      setSkillsError('');
      setSkillsDraft((prev) => {
        const exists = prev[key].includes(item);
        return {
          ...prev,
          [key]: exists
            ? prev[key].filter((v) => v !== item)
            : [...prev[key], item],
        };
      });
    },
    [],
  );

  // ── Schedule: toggle working day ───────────────────────────

  const toggleWorkingDay = useCallback((day: string) => {
    setScheduleError('');
    setScheduleDraft((prev) => {
      const exists = prev.working_days.includes(day);
      return {
        ...prev,
        working_days: exists
          ? prev.working_days.filter((v) => v !== day)
          : [...prev.working_days, day],
      };
    });
  }, []);

  // ── Save skills — mirrors web handleSaveSkills ─────────────

  const handleSaveSkills = useCallback(async () => {
    if (!skillsDraft.skills.length || !skillsDraft.certified_skills.length) {
      setSkillsError(
        'At least one skill and one certified skill are required.',
      );
      return;
    }

    setSavingSkills(true);
    setSkillsError('');
    try {
      const updated = await technicianApi.updateSkills({
        skills: skillsDraft.skills,
        certified_skills: skillsDraft.certified_skills,
        certifications: skillsDraft.certifications,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              skills: toArray(updated.skills),
              certified_skills: toArray(updated.certified_skills),
              certifications: toArray(updated.certifications),
            }
          : prev,
      );
      setEditingSkills(false);
      notification.success({
        title: 'Skills Updated',
        message:
          updated.message || 'Skills and certifications updated successfully.',
        dedupeKey: 'tech-profile:skills-updated',
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        'Failed to save skills and certifications.';
      setSkillsError(detail);
      notification.error({
        title: 'Skills Update Failed',
        message: detail,
        dedupeKey: `tech-profile:skills-update-failed`,
      });
    } finally {
      setSavingSkills(false);
    }
  }, [skillsDraft, notification]);

  // ── Save schedule — mirrors web handleSaveSchedule ─────────

  const handleSaveSchedule = useCallback(async () => {
    if (
      !SHIFT_REGEX.test(scheduleDraft.shift_start) ||
      !SHIFT_REGEX.test(scheduleDraft.shift_end)
    ) {
      setScheduleError('Shift times must be in HH:MM format.');
      return;
    }
    if (scheduleDraft.shift_start >= scheduleDraft.shift_end) {
      setScheduleError('Shift end must be later than shift start.');
      return;
    }
    if (!scheduleDraft.working_days.length) {
      setScheduleError('Select at least one working day.');
      return;
    }

    setSavingSchedule(true);
    setScheduleError('');
    try {
      const updated = await technicianApi.updateSchedule({
        shift_start: scheduleDraft.shift_start,
        shift_end: scheduleDraft.shift_end,
        working_days: scheduleDraft.working_days,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              shift_start: updated.shift_start,
              shift_end: updated.shift_end,
              working_days: toArray(updated.working_days),
            }
          : prev,
      );
      setEditingSchedule(false);
      notification.success({
        title: 'Schedule Updated',
        message: updated.message || 'Work schedule updated successfully.',
        dedupeKey: 'tech-profile:schedule-updated',
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || 'Failed to save work schedule.';
      setScheduleError(detail);
      notification.error({
        title: 'Schedule Update Failed',
        message: detail,
        dedupeKey: `tech-profile:schedule-update-failed`,
      });
    } finally {
      setSavingSchedule(false);
    }
  }, [scheduleDraft, notification]);

  // ── Cancel handlers — mirror web cancelSkillsEdit / cancelScheduleEdit

  const cancelSkillsEdit = useCallback(() => {
    setEditingSkills(false);
    setSkillsError('');
    setSkillsDraft({
      skills: toArray(profile?.skills),
      certified_skills: toArray(profile?.certified_skills),
      certifications: toArray(profile?.certifications),
    });
  }, [profile]);

  const cancelScheduleEdit = useCallback(() => {
    setEditingSchedule(false);
    setScheduleError('');
    setScheduleDraft({
      shift_start: profile?.shift_start || '',
      shift_end: profile?.shift_end || '',
      working_days: toArray(profile?.working_days),
    });
  }, [profile]);

  // ── Profile info items — mirror web profileItems ───────────

  const profileItems = useMemo(
    () => [
      { label: 'Name', value: profile?.technician_name },
      { label: 'Technician Code', value: profile?.technician_code },
      { label: 'Phone Number', value: profile?.phone_number },
      { label: 'Primary Domain', value: profile?.primary_domain },
      { label: 'Experience Level', value: profile?.experience_level },
      { label: 'Location Zone', value: profile?.location_zone },
      {
        label: 'Critical Fault Eligible',
        value: fmtBool(profile?.critical_fault_eligible),
      },
      {
        label: 'Coordinates',
        value:
          profile?.latitude != null && profile?.longitude != null
            ? `${Number(profile.latitude).toFixed(6)}, ${Number(
                profile.longitude,
              ).toFixed(6)}`
            : '-',
      },
    ],
    [profile],
  );

  const workStatusItems = useMemo(
    () => [
      { label: 'Availability Status', value: profile?.availability_state },
      {
        label: 'Current Jobs',
        value:
          profile?.current_jobs != null ? String(profile.current_jobs) : '-',
      },
      {
        label: 'Max Jobs Per Day',
        value:
          profile?.max_jobs_per_day != null
            ? String(profile.max_jobs_per_day)
            : '-',
      },
    ],
    [profile],
  );

  // ─── Render ───────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        <Card
          title="Technician Profile Details"
          subtitle="Dedicated profile management workspace"
        >
          <Text style={styles.contextNote}>
            Profile data is separated from assigned jobs for a cleaner workflow.
          </Text>

          {/* Loading */}
          {loading ? (
            <View style={styles.centeredLoader}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
              <Text style={styles.loaderLabel}>Loading profile</Text>
              <Text style={styles.loaderDetail}>
                Fetching technician profile, skills, certifications, and schedule.
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Empty state */}
          {!loading && !error && !profile ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>
                No technician profile data is available yet.
              </Text>
            </View>
          ) : null}

          {/* ── Sections ───────────────────────────────────── */}
          {!loading && !error && profile ? (
            <View style={styles.sectionsContainer}>

              {/* ── Section 1: Profile (read-only) ─────────── */}
              <View style={styles.section}>
                <SectionHeader
                  icon={<User size={20} color={colors.primary.DEFAULT} />}
                  title="Profile"
                  subtitle="Read-only identity and field assignment details"
                />
                <InfoGrid items={profileItems} />
              </View>

              {/* ── Section 2: Work Status (read-only) ────── */}
              <View style={styles.section}>
                <SectionHeader
                  icon={<Briefcase size={20} color={colors.primary.DEFAULT} />}
                  title="Work Status"
                  subtitle="Read-only live operational status from dispatch system"
                />
                <InfoGrid items={workStatusItems} />
              </View>

              {/* ── Section 3: Skills & Certifications ──────── */}
              <View style={styles.section}>
                <SectionHeader
                  icon={<Shield size={20} color={colors.primary.DEFAULT} />}
                  title="Skills & Certifications"
                  subtitle="Editable competency profile used for dispatch eligibility"
                  editable
                  editing={editingSkills}
                  saving={savingSkills}
                  onEdit={() => {
                    setEditingSkills(true);
                    setSkillsError('');
                  }}
                  onCancel={cancelSkillsEdit}
                  onSave={handleSaveSkills}
                />

                {!editingSkills ? (
                  /* View mode */
                  <InfoGrid
                    items={[
                      {
                        label: 'Skills',
                        value:
                          toArray(profile.skills).join(', ') || '-',
                      },
                      {
                        label: 'Certified Skills',
                        value:
                          toArray(profile.certified_skills).join(', ') || '-',
                      },
                      {
                        label: 'Certifications',
                        value:
                          toArray(profile.certifications).join(', ') || '-',
                      },
                    ]}
                  />
                ) : (
                  /* Edit mode */
                  <View style={styles.editContainer}>
                    <MultiSelectChips
                      label="Skills"
                      values={skillsDraft.skills}
                      options={allSkillOptions}
                      onToggle={(item) => toggleDraftItem('skills', item)}
                      disabled={savingSkills}
                    />
                    <MultiSelectChips
                      label="Certified Skills"
                      values={skillsDraft.certified_skills}
                      options={allSkillOptions}
                      onToggle={(item) =>
                        toggleDraftItem('certified_skills', item)
                      }
                      disabled={savingSkills}
                    />
                    <MultiSelectChips
                      label="Certifications"
                      values={skillsDraft.certifications}
                      options={allCertificationOptions}
                      onToggle={(item) =>
                        toggleDraftItem('certifications', item)
                      }
                      disabled={savingSkills}
                      error={skillsError}
                    />
                  </View>
                )}
              </View>

              {/* ── Section 4: Work Schedule ─────────────────── */}
              <View style={styles.section}>
                <SectionHeader
                  icon={<Calendar size={20} color={colors.primary.DEFAULT} />}
                  title="Work Schedule"
                  subtitle="Editable shift and working-day allocation"
                  editable
                  editing={editingSchedule}
                  saving={savingSchedule}
                  onEdit={() => {
                    setEditingSchedule(true);
                    setScheduleError('');
                  }}
                  onCancel={cancelScheduleEdit}
                  onSave={handleSaveSchedule}
                />

                {!editingSchedule ? (
                  /* View mode */
                  <InfoGrid
                    items={[
                      {
                        label: 'Shift Start',
                        value: profile.shift_start || '-',
                      },
                      {
                        label: 'Shift End',
                        value: profile.shift_end || '-',
                      },
                      {
                        label: 'Working Days',
                        value:
                          toArray(profile.working_days).join(', ') || '-',
                      },
                    ]}
                  />
                ) : (
                  /* Edit mode */
                  <View style={styles.editContainer}>
                    {/* Shift Start */}
                    <View style={styles.timeRow}>
                      <View style={styles.timeField}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Clock size={12} color={colors.secondary.DEFAULT} />
                          <Text style={[styles.timeFieldLabel, { marginBottom: 0, marginLeft: 4 }]}>
                            Shift Start
                          </Text>
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            savingSchedule && styles.inputDisabled,
                          ]}
                          value={scheduleDraft.shift_start}
                          onChangeText={(t) =>
                            setScheduleDraft((prev) => ({
                              ...prev,
                              shift_start: t,
                            }))
                          }
                          placeholder="HH:MM"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          editable={!savingSchedule}
                        />
                      </View>

                      {/* Shift End */}
                      <View style={styles.timeField}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Clock size={12} color={colors.secondary.DEFAULT} />
                          <Text style={[styles.timeFieldLabel, { marginBottom: 0, marginLeft: 4 }]}>
                            Shift End
                          </Text>
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            savingSchedule && styles.inputDisabled,
                          ]}
                          value={scheduleDraft.shift_end}
                          onChangeText={(t) =>
                            setScheduleDraft((prev) => ({
                              ...prev,
                              shift_end: t,
                            }))
                          }
                          placeholder="HH:MM"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          editable={!savingSchedule}
                        />
                      </View>
                    </View>

                    {/* Working Days */}
                    <View style={styles.chipSection}>
                      <Text style={styles.chipSectionLabel}>
                        Working Days
                      </Text>
                      <View style={styles.chipRow}>
                        {DEFAULT_WORKING_DAYS.map((day) => {
                          const selected =
                            scheduleDraft.working_days.includes(day);
                          return (
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.chip,
                                selected
                                  ? styles.chipSelected
                                  : styles.chipUnselected,
                                savingSchedule && styles.chipDisabled,
                              ]}
                              onPress={() => toggleWorkingDay(day)}
                              disabled={savingSchedule}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  selected
                                    ? styles.chipTextSelected
                                    : styles.chipTextUnselected,
                                ]}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {scheduleError ? (
                      <Text style={styles.errorText}>{scheduleError}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 48 },

  contextNote: { fontSize: 11, color: colors.secondary.DEFAULT, marginBottom: 14 },

  // Loading
  centeredLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loaderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  loaderDetail: {
    fontSize: 12,
    color: colors.secondary.DEFAULT,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Error / empty
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  emptyBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyBoxText: { fontSize: 13, color: colors.secondary.DEFAULT },

  // Sections container
  sectionsContainer: { gap: 12 },

  // Individual section — mirrors web rounded-xl border bg-white p-4
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },

  // SectionHeader
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  sectionHeaderIcon: { fontSize: 18, marginTop: 2 },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  sectionHeaderSubtitle: {
    fontSize: 11,
    color: colors.secondary.DEFAULT,
    marginTop: 2,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexShrink: 0,
  },

  // Buttons
  btnEdit: {
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  btnEditText: { fontSize: 12, fontWeight: '600', color: colors.card },
  btnCancel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  btnCancelText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  btnSave: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  btnSaveText: { fontSize: 12, fontWeight: '600', color: colors.card },
  btnDisabled: { opacity: 0.5 },

  // InfoGrid — mirrors web grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoCell: {
    width: '47%',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  infoCellLabel: {
    fontSize: 10,
    color: colors.secondary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoCellValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary.DEFAULT,
    lineHeight: 18,
  },

  // Edit container
  editContainer: { gap: 16 },

  // MultiSelectChips
  chipSection: { gap: 8 },
  chipSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  chipUnselected: {
    backgroundColor: colors.card,
    borderColor: '#d1d5db',
  },
  chipDisabled: { opacity: 0.6 },
  chipText: { fontSize: 12, fontWeight: '500' },
  chipTextSelected: { color: colors.card },
  chipTextUnselected: { color: colors.primary.DEFAULT },

  // Time fields
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1, gap: 6 },
  timeFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    fontSize: 14,
    color: colors.primary.DEFAULT,
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.7,
  },
});
