/* ────────────────────────────────────────────────────────────
 * PrevisitBriefingScreen
 *
 * React Native conversion of the previsit briefing workflow
 * in frontend_react/src/pages/technician/TechnicianDashboard.jsx
 *
 * Mirrors exactly:
 *   • handlePrevisitReport()      — L1377–1568  (fetch + retry + fallback)
 *   • parseSections()             — L1572–1626  (raw AI text → sections[])
 *   • formatContent()             — L79–90      (numbered list → bullets)
 *   • PREVISIT_PROGRESS_MESSAGES  — L43–47      (rotating status labels)
 *   • PREVISIT_COOLDOWN_MS        — L42         (2 s debounce)
 *   • PREVISIT_TIMEOUT_MS         — L41         (18 s per attempt)
 *   • maxAttempts = 2             — L1435       (retry once on failure)
 *   • Modal render                — L2144–2234  (sections + copy button)
 *
 * Entry point:
 *   TechnicianJobsStack → PrevisitBriefing screen
 *   Receives { jobId: number } from navigation params.
 *
 * Navigation on exit:
 *   goBack() — returns to JobListScreen.
 *
 * Reuses:
 *   • technicianApi.generatePrevisitReport (api/technician.ts)
 *   • useNotification (providers/NotificationProvider)
 * ──────────────────────────────────────────────────────────── */

import { colors } from '../../theme/colors';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Clipboard,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { technicianApi } from '../../api/technician';
import { useNotification } from '../../providers/NotificationProvider';
import { ClipboardList, Share as ShareIcon } from 'lucide-react-native';
import type { TechnicianJobsStackParamList } from '../../types/navigation';

// ─── Constants — mirrors web exactly ────────────────────────

/** POST /reports/previsit per-attempt timeout in ms (web: PREVISIT_TIMEOUT_MS) */
const PREVISIT_TIMEOUT_MS = 18_000;

/** Max retry attempts (web: maxAttempts = 2) */
const MAX_ATTEMPTS = 2;

/** Delay between retries in ms (web: delay(1000)) */
const RETRY_DELAY_MS = 1_000;

/** Minimum ms between successive generate taps (web: PREVISIT_COOLDOWN_MS) */
const PREVISIT_COOLDOWN_MS = 2_000;

/**
 * Rotating status messages shown during generation.
 * web: PREVISIT_PROGRESS_MESSAGES = ['Analyzing issue...', 'Identifying tools...', 'Preparing steps...']
 * Interval: 2500 ms (web: window.setInterval(..., 2500))
 */
const PREVISIT_PROGRESS_MESSAGES = [
  'Analyzing issue...',
  'Identifying tools...',
  'Preparing steps...',
];
const PROGRESS_INTERVAL_MS = 2_500;

// ─── Types ──────────────────────────────────────────────────

type Props = NativeStackScreenProps<TechnicianJobsStackParamList, 'PrevisitBriefing'>;

/** One parsed section from the raw AI response text. */
interface BriefingSection {
  title: string;
  items: BriefingItem[];
}

/** One line item within a section. */
interface BriefingItem {
  type: 'bullet' | 'step' | 'para';
  text: string;
}

// ─── Pure helpers — mirrors web ──────────────────────────────

/**
 * formatContent — mirrors web L79–90.
 * Converts "1. foo" → "• foo" for numbered list lines.
 */
function formatContent(text: string): string {
  if (!text) return '';
  return String(text)
    .split('\n')
    .map((line) =>
      line.trim().match(/^\d+\.\s/)
        ? `• ${line.replace(/^\d+\.\s/, '')}`
        : line,
    )
    .join('\n');
}

/**
 * parseSections — mirrors web L1572–1626.
 * Splits raw AI output into titled sections each containing typed items.
 */
function parseSections(text: string): BriefingSection[] {
  if (!text) return [];
  const lines = String(text).split(/\r?\n/);
  const sections: BriefingSection[] = [];
  let current: BriefingSection = { title: 'Summary', items: [] };

  const startNew = (title: string) => {
    if (current && (current.items.length > 0 || current.title)) {
      sections.push(current);
    }
    current = { title: title || 'Details', items: [] };
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      // preserve paragraph break (mirrors web logic)
      if (
        current &&
        current.items.length > 0 &&
        current.items[current.items.length - 1].type === 'para'
      ) {
        current.items.push({ type: 'para', text: '' });
      }
      continue;
    }

    // SECTION headers — mirrors web sectionMatch regex
    const sectionMatch =
      line.match(
        /^(?:SECTION\s*\d+[:\-]?|[A-Z][A-Z0-9\s\-\/&]{2,}|[A-Za-z][A-Za-z0-9\s\-\/&]{2,})[:\-]?\s*$/,
      ) || line.match(/^\d+[.)]\s*[A-Za-z][A-Za-z0-9\s\-\/&]{2,}$/);
    if (sectionMatch) {
      const title = line.replace(/[:\-]$/, '').replace(/^\d+[.)]\s*/, '');
      startNew(title);
      continue;
    }

    // Bullet lines (- foo  *foo  • foo)
    if (/^[-*•]\s+/.test(line)) {
      const text = line.replace(/^[-*•]\s+/, '');
      current.items.push({ type: 'bullet', text });
      continue;
    }

    // Numbered steps (1. foo  1) foo)
    if (/^\d+[).]\s+/.test(line)) {
      const text = line.replace(/^\d+[).]\s+/, '');
      current.items.push({ type: 'step', text });
      continue;
    }

    // Plain paragraph — merge with previous para if possible
    const last = current.items[current.items.length - 1];
    if (last && last.type === 'para') {
      last.text = `${last.text} ${line}`.trim();
    } else {
      current.items.push({ type: 'para', text: line });
    }
  }

  if (current) sections.push(current);
  return sections;
}

// ─── Screen ─────────────────────────────────────────────────

export default function PrevisitBriefingScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const notification = useNotification();

  // ── State — mirrors web state variables ────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [actionError, setActionError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // ── Refs — mirrors web refs ────────────────────────────────
  const lastClickRef = useRef(0);
  const lastSuccessRef = useRef<{ reportText: string; fileName: string } | null>(null);

  // ── Progress message rotation — mirrors web useEffect on isGenerating ──

  useEffect(() => {
    if (!isGenerating) {
      setStatusMessage('');
      return;
    }
    let index = 0;
    setStatusMessage(PREVISIT_PROGRESS_MESSAGES[index]);
    const intervalId = setInterval(() => {
      index = (index + 1) % PREVISIT_PROGRESS_MESSAGES.length;
      setStatusMessage(PREVISIT_PROGRESS_MESSAGES[index]);
    }, PROGRESS_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isGenerating]);

  // ── Generate briefing — mirrors web handlePrevisitReport ───

  const handleGenerate = useCallback(async () => {
    // Cooldown guard (web: PREVISIT_COOLDOWN_MS)
    const now = Date.now();
    if (now - lastClickRef.current < PREVISIT_COOLDOWN_MS) return;
    lastClickRef.current = now;

    // Already generating guard
    if (isGenerating) return;

    setBriefingText(null);
    setFileName('');
    setActionError('');
    setIsGenerating(true);

    // 5-second warning timer (web: warningTimerRef setTimeout 5000)
    const warningTimer = setTimeout(() => {
      notification.warning({
        title: 'Still Processing',
        message: 'AI is taking longer than expected...',
        dedupeKey: `previsit:slow-warning:${jobId}`,
      });
    }, 5_000);

    // Fetch with retry — mirrors web fetchPrevisit inner loop
    const fetchWithRetry = async (): Promise<{ reportText: string; fileName: string }> => {
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          // Per-attempt AbortController + PREVISIT_TIMEOUT_MS
          const controller = new AbortController();
          const timeoutHandle = setTimeout(
            () => controller.abort(),
            PREVISIT_TIMEOUT_MS,
          );

          try {
            // Mirror web: POST /reports/previsit  { job_id: jobId }
            const result = await technicianApi.generatePrevisitReport(jobId, controller.signal);
            return {
              reportText: result.report_text || '',
              fileName: result.file_name || `previsit_job_${jobId}.txt`,
            };
          } finally {
            clearTimeout(timeoutHandle);
          }
        } catch (err) {
          lastError = err;
          if (attempt < MAX_ATTEMPTS) {
            // Retry delay (web: await delay(1000))
            await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      throw lastError ?? new Error('Unable to generate report');
    };

    try {
      const result = await fetchWithRetry();

      // Cache last success (web: lastPrevisitSuccessRef.current.set)
      lastSuccessRef.current = result;

      setBriefingText(result.reportText);
      setFileName(result.fileName);
    } catch (err: any) {
      // Try cached result first (web: L1527–1539)
      const cached = lastSuccessRef.current;
      if (cached?.reportText) {
        setBriefingText(cached.reportText);
        setFileName(cached.fileName);
        notification.warning({
          title: 'Showing last saved briefing',
          message:
            'Unable to refresh AI plan right now. Showing the most recent successful result.',
          dedupeKey: `previsit:showing-cached:${jobId}`,
        });
        return;
      }

      // Fallback (web: L1541–1556)
      const fallbackText = [
        'SECTION 1: SUMMARY',
        'Unable to generate AI plan. Please proceed manually.',
        'SECTION 2: SUGGESTION',
        '- Check device, tools, and safety before visit.',
      ].join('\n');

      setBriefingText(fallbackText);
      setFileName(`previsit_job_${jobId}.txt`);
      notification.warning({
        title: 'Fallback guidance shown',
        message:
          'Unable to generate AI plan. A manual fallback plan is shown instead.',
        dedupeKey: `previsit:fallback:${jobId}`,
      });
    } finally {
      clearTimeout(warningTimer);
      setIsGenerating(false);
    }
  }, [isGenerating, jobId, notification]);

  // Auto-generate on mount — triggers once when screen loads
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Copy to clipboard — mirrors web navigator.clipboard.writeText ──

  const handleCopy = useCallback(() => {
    if (!briefingText) return;
    try {
      Clipboard.setString(briefingText);
      notification.success({
        title: 'Copied',
        message: 'Preparation text copied to clipboard.',
        dedupeKey: 'previsit:copied',
      });
    } catch {
      notification.error({
        title: 'Copy Failed',
        message: 'Unable to copy to clipboard.',
        dedupeKey: 'previsit:copy-failed',
      });
    }
  }, [briefingText, notification]);

  // ── Share — mobile native share (replaces web downloadReport anchor) ──

  const handleShare = useCallback(async () => {
    if (!briefingText) return;
    try {
      await Share.share({
        title: fileName || `previsit_job_${jobId}.txt`,
        message: briefingText,
      });
    } catch {
      notification.error({
        title: 'Share Failed',
        message: 'Unable to share briefing.',
        dedupeKey: 'previsit:share-failed',
      });
    }
  }, [briefingText, fileName, jobId, notification]);

  // ── Parsed sections ────────────────────────────────────────

  const sections = briefingText ? parseSections(briefingText) : [];

  // ─── Render ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Title block (mirrors web Modal title="Prepare Visit (AI)") ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>Prepare Visit (AI)</Text>
          <Text style={styles.screenSubtitle}>
            AI-generated preparation guide · Job #{jobId}
          </Text>
        </View>

        {/* ── Loading state — mirrors web L2152–2161 ─────────── */}
        {!briefingText && !actionError ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.loadingLabel}>
              {statusMessage || 'Preparing guidance...'}
            </Text>
            <Text style={styles.loadingDetail}>
              Calling AI endpoint — this may take up to 18 seconds.
            </Text>
          </View>
        ) : null}

        {/* ── Error state — mirrors web L2163–2167 ───────────── */}
        {actionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {/* ── Sections — mirrors web L2169–2207 ─────────────── */}
        {sections.length > 0 ? (
          <View style={styles.sectionsContainer}>
            {sections.map((sec, idx) => (
              <View key={idx} style={styles.sectionCard}>
                {/* Section title — mirrors web h4 text-sm font-semibold */}
                <Text style={styles.sectionTitle}>
                  {sec.title || `Section ${idx + 1}`}
                </Text>

                <View style={styles.sectionBody}>
                  {sec.items.map((item, iidx) => {
                    const formattedText = formatContent(item.text);

                    if (item.type === 'bullet' || item.type === 'step') {
                      // mirrors web <ul><li> for both bullet and step
                      return (
                        <View key={iidx} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{formattedText}</Text>
                        </View>
                      );
                    }

                    // para — mirrors web <p className='whitespace-pre-line'>
                    if (!item.text) {
                      return <View key={iidx} style={styles.paraSpacer} />;
                    }
                    return (
                      <Text key={iidx} style={styles.paraText}>
                        {formattedText}
                      </Text>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Action row — mirrors web L2209–2232 ───────────── */}
        {/*   Copy to Clipboard | Retry | Close                  */}
        <View style={styles.actionRow}>
          {/* Copy — mirrors web clipboard button (disabled when no data) */}
          <TouchableOpacity
            style={[styles.btnSecondary, !briefingText && styles.btnDisabled, { flexDirection: 'row', gap: 6 }]}
            onPress={handleCopy}
            disabled={!briefingText}
            accessibilityLabel="Copy to Clipboard"
            accessibilityRole="button"
          >
            <ClipboardList color={colors.primary.DEFAULT} size={14} />
            <Text style={styles.btnSecondaryText}>Copy</Text>
          </TouchableOpacity>

          {/* Share — mobile equivalent of web's downloadReport */}
          <TouchableOpacity
            style={[styles.btnSecondary, !briefingText && styles.btnDisabled, { flexDirection: 'row', gap: 6 }]}
            onPress={handleShare}
            disabled={!briefingText}
            accessibilityLabel="Share briefing"
            accessibilityRole="button"
          >
            <ShareIcon color={colors.primary.DEFAULT} size={14} />
            <Text style={styles.btnSecondaryText}>Share</Text>
          </TouchableOpacity>

          {/* Retry — regenerate (mirrors web "Generate Briefing" button) */}
          <TouchableOpacity
            style={[styles.btnRetry, isGenerating && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
            accessibilityLabel="Regenerate briefing"
            accessibilityRole="button"
          >
            <Text style={styles.btnRetryText}>
              {isGenerating ? 'Generating...' : '↻ Retry'}
            </Text>
          </TouchableOpacity>

          {/* Close — mirrors web "Close" primary button */}
          <TouchableOpacity
            style={styles.btnClose}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.btnCloseText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────
// Token mapping against web Navbar + Modal + job-card classes.

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },

  // ── Title block ────────────────────────────────────────────
  // web: Modal title="Prepare Visit (AI)"  description="AI-generated preparation guide"
  titleBlock: {
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // ── Loading ────────────────────────────────────────────────
  // web: <LoadingState />  + <p>{previsitStatusMessage}</p>
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  loadingDetail: {
    fontSize: 12,
    color: colors.secondary.DEFAULT,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // ── Error ──────────────────────────────────────────────────
  // web: rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800
  errorBox: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#991b1b',
  },

  // ── Sections container ─────────────────────────────────────
  // web: <div className='space-y-3'>
  sectionsContainer: {
    gap: 12,
  },

  // ── Section card ───────────────────────────────────────────
  // web: rounded-lg border border-gray-100 p-4 bg-white shadow-sm
  sectionCard: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  // web: h4 text-sm font-semibold text-gray-900
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.dark,
    marginBottom: 10,
  },
  // web: mt-2 space-y-2 text-sm leading-relaxed text-gray-700
  sectionBody: {
    gap: 6,
  },

  // ── Bullet / step item ─────────────────────────────────────
  // web: <ul className='list-disc pl-5'><li>
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    fontSize: 13,
    color: colors.primary.DEFAULT,
    lineHeight: 20,
    width: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },

  // ── Paragraph ─────────────────────────────────────────────
  // web: <p className='whitespace-pre-line leading-6'>
  paraText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  paraSpacer: {
    height: 6,
  },

  // ── Action row ─────────────────────────────────────────────
  // web: flex justify-end gap-2
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // web: action-btn  (Copy to Clipboard, disabled when !previsitData)
  btnSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  btnSecondaryText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  // Retry button
  btnRetry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: '#eef2ff',
  },
  btnRetryText: {
    fontSize: 13,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },

  // web: action-btn action-btn-primary  (Close)
  btnClose: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  btnCloseText: {
    fontSize: 13,
    color: colors.card,
    fontWeight: '600',
  },

  // Disabled state for all buttons
  btnDisabled: {
    opacity: 0.4,
  },
});
