/* ────────────────────────────────────────────────────────────
 * ReportWorkflowScreen
 *
 * React Native conversion of Technician Final Report Workflow
 * from frontend_react/src/pages/technician/TechnicianDashboard.jsx
 *
 * Matches form fields, AI improve text, photo upload,
 * materials array, and read-only view state.
 * ──────────────────────────────────────────────────────────── */

import { colors } from '../../theme/colors';
import { Sparkles } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { technicianApi, TechJob } from '../../api/technician';
import { useNotification } from '../../providers/NotificationProvider';
import Card from '../../components/Card';
import type { TechnicianJobsStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<TechnicianJobsStackParamList, 'ReportWorkflow'>;

export default function ReportWorkflowScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const notification = useNotification();

  // ── State ─────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<TechJob | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);

  const [formData, setFormData] = useState({
    issue_observed: '',
    root_cause: '',
    work_done: '',
    parts_used: '',
    time_taken: '',
    customer_comments: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [materials, setMaterials] = useState([{ name: '', quantity: '' }]);

  const [beforePhoto, setBeforePhoto] = useState<any>(null);
  const [afterPhoto, setAfterPhoto] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [improvingField, setImprovingField] = useState<string | null>(null);

  // ── Fetch Initial State ────────────────────────────────────
  useEffect(() => {
    fetchJobAndReport();
  }, [jobId]);

  const fetchJobAndReport = async () => {
    setLoading(true);
    try {
      const fetchedJob = await technicianApi.getJobById(jobId);
      setJob(fetchedJob);

      if (fetchedJob.report_submitted) {
        setIsSubmitted(true);
        const reportResponse = await technicianApi.getReport(jobId);
        setSubmittedReport(reportResponse?.report_data || reportResponse?.report || null);
      }
    } catch (err: any) {
      notification.error({
        message: err?.response?.data?.detail || 'Failed to load report data.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Form Handlers ──────────────────────────────────────────
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateMaterial = (index: number, field: 'name' | 'quantity', value: string) => {
    setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
    if (errors.materials_used) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.materials_used;
        return next;
      });
    }
  };

  const addMaterialRow = () => setMaterials((prev) => [...prev, { name: '', quantity: '' }]);
  const removeMaterialRow = (index: number) => {
    setMaterials((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ name: '', quantity: '' }];
    });
  };

  // ── Image Handlers ─────────────────────────────────────────
  const pickImage = async (kind: 'before' | 'after') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notification.warning({ message: 'Permission to access camera roll is required!' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `${kind}_photo.jpg`,
      };
      if (kind === 'before') setBeforePhoto(file);
      else setAfterPhoto(file);
    }
  };

  // ── AI Improve Text ────────────────────────────────────────
  const handleImproveText = async (fieldName: keyof typeof formData) => {
    const textToImprove = formData[fieldName].trim();
    if (!textToImprove) {
      notification.warning({ message: 'Please write text before requesting AI assistance.' });
      return;
    }
    if (textToImprove.length < 10) {
      notification.warning({ message: 'Please provide more detail (min 10 characters).' });
      return;
    }

    setImprovingField(fieldName);
    try {
      const result = await technicianApi.improveReportText(textToImprove);
      if (result.improved_text) {
        updateField(fieldName, result.improved_text);
        notification.success({ message: 'Text improved successfully' });
      }
    } catch (err: any) {
      notification.error({ message: err?.response?.data?.detail || 'Unable to improve text' });
    } finally {
      setImprovingField(null);
    }
  };

  // ── Submit Logic ───────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (formData.issue_observed.trim().length < 10) errs.issue_observed = 'Min 10 characters required';
    if (formData.work_done.trim().length < 10) errs.work_done = 'Min 10 characters required';
    
    const minutes = Number(formData.time_taken);
    if (!formData.time_taken || !Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
      errs.time_taken = 'Valid time between 1 and 600 minutes required';
    }

    const invalidMaterial = materials.some(m => {
      const hasName = Boolean(m.name.trim());
      const hasQty = Boolean(m.quantity.trim());
      if (hasName !== hasQty) return true;
      if (hasQty) {
        const qty = Number(m.quantity);
        if (!Number.isFinite(qty) || qty <= 0) return true;
      }
      return false;
    });

    if (invalidMaterial) errs.materials_used = 'Each material requires both name and positive quantity';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const uploadPhoto = async (file: any, kind: string) => {
    if (!file) return '';
    const body = new FormData();
    body.append('job_id', String(jobId));
    body.append('photo_kind', kind);
    body.append('image', file as any);
    const res = await technicianApi.uploadReportPhoto(body);
    return res.url;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const beforeUrl = await uploadPhoto(beforePhoto, 'before');
      const afterUrl = await uploadPhoto(afterPhoto, 'after');

      const validMaterials = materials.filter(m => m.name.trim());
      const partsUsedString = validMaterials.map(m => `${m.name} (x${m.quantity})`).join(', ') || formData.parts_used;

      const payload = {
        job_id: jobId,
        issue_observed: formData.issue_observed.trim(),
        root_cause: formData.root_cause.trim(),
        work_done: formData.work_done.trim(),
        parts_used: partsUsedString,
        materials_used: validMaterials.map(m => ({ name: m.name, quantity: Number(m.quantity) })),
        time_taken: Math.round(Number(formData.time_taken)),
        customer_comments: formData.customer_comments.trim(),
        notes: formData.notes.trim(),
        before_photo_url: beforeUrl,
        after_photo_url: afterUrl,
        review_notes: 'MOBILE_REPORT',
      };

      await technicianApi.submitReport(payload);
      notification.success({ message: 'Report submitted successfully' });
      
      // Update local state to submitted view
      setIsSubmitted(true);
      const reportResponse = await technicianApi.getReport(jobId);
      setSubmittedReport(reportResponse?.report_data || reportResponse?.report || payload);
      
    } catch (err: any) {
      notification.error({ message: err?.response?.data?.detail || 'Failed to submit report' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Views ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading report details...</Text>
      </View>
    );
  }

  if (isSubmitted) {
    return (
      <ScrollView style={styles.container}>
        <Card title="Completed Service Report" subtitle={`Job #${jobId}`}>
          <View style={styles.grid}>
            <View style={styles.col}>
              <Text style={styles.label}>Issue Observed</Text>
              <Text style={styles.value}>{submittedReport?.issue_observed || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Work Done</Text>
              <Text style={styles.value}>{submittedReport?.work_done || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Root Cause</Text>
              <Text style={styles.value}>{submittedReport?.root_cause || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Time Taken (minutes)</Text>
              <Text style={styles.value}>{submittedReport?.time_taken || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Parts Used</Text>
              <Text style={styles.value}>{submittedReport?.parts_used || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Customer Comments</Text>
              <Text style={styles.value}>{submittedReport?.customer_comments || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.value}>{submittedReport?.notes || '-'}</Text>
            </View>
            
            {(submittedReport?.before_photo_url || submittedReport?.after_photo_url) && (
              <View style={styles.photoGrid}>
                {submittedReport?.before_photo_url && (
                  <View style={styles.photoBox}>
                    <Text style={styles.label}>Before Photo</Text>
                    <Image source={{ uri: submittedReport.before_photo_url }} style={styles.photoImage} />
                  </View>
                )}
                {submittedReport?.after_photo_url && (
                  <View style={styles.photoBox}>
                    <Text style={styles.label}>After Photo</Text>
                    <Image source={{ uri: submittedReport.after_photo_url }} style={styles.photoImage} />
                  </View>
                )}
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        <Card title="Submit Final Report" subtitle={`Job #${jobId}`}>
          
          <FieldWithImprove
            label="Issue Observed"
            value={formData.issue_observed}
            onChangeText={(v) => updateField('issue_observed', v)}
            error={errors.issue_observed}
            improving={improvingField === 'issue_observed'}
            onImprove={() => handleImproveText('issue_observed')}
            required
          />

          <FieldWithImprove
            label="Root Cause"
            value={formData.root_cause}
            onChangeText={(v) => updateField('root_cause', v)}
            error={errors.root_cause}
            improving={improvingField === 'root_cause'}
            onImprove={() => handleImproveText('root_cause')}
          />

          <FieldWithImprove
            label="Work Done"
            value={formData.work_done}
            onChangeText={(v) => updateField('work_done', v)}
            error={errors.work_done}
            improving={improvingField === 'work_done'}
            onImprove={() => handleImproveText('work_done')}
            required
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Time Taken (minutes) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.time_taken && styles.inputError]}
                keyboardType="numeric"
                value={formData.time_taken}
                onChangeText={(v) => updateField('time_taken', v)}
              />
              {errors.time_taken ? <Text style={styles.errorText}>{errors.time_taken}</Text> : null}
            </View>
          </View>

          <View style={styles.materialsSection}>
            <Text style={styles.label}>Materials Used</Text>
            {materials.map((m, idx) => (
              <View key={idx} style={styles.materialRow}>
                <TextInput
                  style={[styles.input, { flex: 2, marginRight: 8 }]}
                  placeholder="Material name"
                  placeholderTextColor={colors.textSecondary}
                  value={m.name}
                  onChangeText={(v) => updateMaterial(idx, 'name', v)}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Qty"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={m.quantity}
                  onChangeText={(v) => updateMaterial(idx, 'quantity', v)}
                />
                <TouchableOpacity onPress={() => removeMaterialRow(idx)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {errors.materials_used ? <Text style={styles.errorText}>{errors.materials_used}</Text> : null}
            <TouchableOpacity onPress={addMaterialRow} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add Material</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.photoSection}>
            <View style={styles.photoPickerCol}>
              <Text style={styles.label}>Before Photo</Text>
              {beforePhoto ? (
                <View>
                  <Image source={{ uri: beforePhoto.uri }} style={styles.photoPreview} />
                  <TouchableOpacity onPress={() => setBeforePhoto(null)}>
                    <Text style={styles.linkText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('before')}>
                  <Text style={styles.photoBtnText}>Choose Image</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.photoPickerCol}>
              <Text style={styles.label}>After Photo</Text>
              {afterPhoto ? (
                <View>
                  <Image source={{ uri: afterPhoto.uri }} style={styles.photoPreview} />
                  <TouchableOpacity onPress={() => setAfterPhoto(null)}>
                    <Text style={styles.linkText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('after')}>
                  <Text style={styles.photoBtnText}>Choose Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FieldWithImprove
            label="Customer Comments"
            value={formData.customer_comments}
            onChangeText={(v) => updateField('customer_comments', v)}
            error={errors.customer_comments}
            improving={improvingField === 'customer_comments'}
            onImprove={() => handleImproveText('customer_comments')}
          />

          <FieldWithImprove
            label="Additional Notes"
            value={formData.notes}
            onChangeText={(v) => updateField('notes', v)}
            error={errors.notes}
            improving={improvingField === 'notes'}
            onImprove={() => handleImproveText('notes')}
          />

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Final Report</Text>
            )}
          </TouchableOpacity>

        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Subcomponents ────────────────────────────────────────────

function FieldWithImprove({
  label, value, onChangeText, error, improving, onImprove, required = false
}: {
  label: string; value: string; onChangeText: (v: string) => void; 
  error?: string; improving: boolean; onImprove: () => void; required?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity onPress={onImprove} disabled={improving}>
          <Text style={[styles.aiBtnText, improving && { opacity: 0.5 }]}>
            {improving ? 'Improving...' : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Sparkles size={14} color="#8b5cf6" /><Text style={styles.aiBtnText}>AI Improve</Text></View>}
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, styles.textarea, error && styles.inputError]}
        multiline
        numberOfLines={3}
        value={value}
        onChangeText={onChangeText}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  grid: {
    gap: 16,
  },
  col: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  required: {
    color: colors.danger,
  },
  aiBtnText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 15,
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  materialsSection: {
    marginBottom: 16,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeBtn: {
    padding: 8,
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addBtnText: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  photoSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  photoPickerCol: {
    flex: 1,
  },
  photoBtn: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoBtnText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 4,
  },
  linkText: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.success,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoBox: {
    flex: 1,
  },
  photoImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    resizeMode: 'cover',
    marginTop: 4,
  },
});
