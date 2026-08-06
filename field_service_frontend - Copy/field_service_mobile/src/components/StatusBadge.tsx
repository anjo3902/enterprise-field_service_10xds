import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const colorMap: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#b45309' }, // amber
  pending_review: { bg: '#fef3c7', text: '#b45309' },
  pending_human_review: { bg: '#fef3c7', text: '#b45309' },
  review_required: { bg: '#fef3c7', text: '#b45309' },
  approved: { bg: '#dcfce7', text: '#15803d' }, // green
  approved_by_admin: { bg: '#dcfce7', text: '#15803d' },
  auto_approved: { bg: '#dcfce7', text: '#15803d' },
  rejected: { bg: '#fee2e2', text: '#b91c1c' }, // red
  rejected_by_admin: { bg: '#fee2e2', text: '#b91c1c' },
  normal: { bg: '#f1f5f9', text: '#334155' }, // slate
  assigned: { bg: '#ffedd5', text: '#c2410c' }, // orange
  in_progress: { bg: '#dbeafe', text: '#1d4ed8' }, // blue
  completed: { bg: '#dcfce7', text: '#15803d' }, // green
  cancelled: { bg: '#f3f4f6', text: '#374151' }, // gray
  low: { bg: '#f3f4f6', text: '#374151' },
  medium: { bg: '#fef3c7', text: '#b45309' },
  high: { bg: '#ffedd5', text: '#c2410c' },
  critical: { bg: '#fee2e2', text: '#b91c1c' },
};

export default function StatusBadge({ value }: { value: string }) {
  const normalized = String(value || 'pending').toLowerCase();
  const theme = colorMap[normalized] || colorMap['low'];
  const label = normalized.replace(/_/g, ' ');

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
