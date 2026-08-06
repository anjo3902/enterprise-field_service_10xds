/* ────────────────────────────────────────────────────────────
 * SignupScreen
 *
 * Replaces: frontend_react/src/pages/auth/SignupPage.jsx
 *
 * Behaviour preserved from web:
 *   - Fields: name, email, phone, password, role, technician_code
 *   - Default role: 'customer'
 *   - Conditionally shows technician_code when role === 'technician'
 *   - Inline field validation on every change
 *   - On success: toast + navigate to Login (does NOT auto-login)
 *   - Error extraction: detail | error | message
 * ──────────────────────────────────────────────────────────── */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Zap } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/useAuth';
import { useNotification } from '../../providers/NotificationProvider';
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  sanitizeText,
} from '../../utils/validation';
import type { AuthStackParamList } from '../../types/navigation';
import type { UserRole } from '../../types/api';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Customer', value: 'customer' },
  { label: 'Technician', value: 'technician' },
];

export default function SignupScreen({ navigation }: Props) {
  const { signup } = useAuth();
  const notification = useNotification();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [technicianCode, setTechnicianCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Inline field errors ───────────────────────────────────

  const fieldErrors = useMemo(
    () => ({
      name: name ? validateName(name) : '',
      email: email ? validateEmail(email) : '',
      phone: phone ? validatePhone(phone) : '',
      password: password ? validatePassword(password) : '',
    }),
    [name, email, phone, password],
  );

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const isFormEmpty = !name || !email || !phone || !password;

  // ── Submit ────────────────────────────────────────────────

  const handleSignup = async () => {
    // Full validation pass.
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    const passErr = validatePassword(password);

    if (nameErr || emailErr || phoneErr || passErr) {
      setError(nameErr || emailErr || phoneErr || passErr);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signup({
        name: sanitizeText(name),
        email: sanitizeText(email),
        phone: sanitizeText(phone),
        password,
        role,
        technician_code: role === 'technician' ? sanitizeText(technicianCode) : undefined,
      });

      notification.success({
        title: 'Account created',
        message: 'Please sign in with your new account.',
        dedupeKey: 'signup-success',
      });

      navigation.navigate('Login');
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        'Registration failed. Please try again.';
      setError(msg);
      notification.error({
        message: msg,
        dedupeKey: 'signup-error',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ marginBottom: 8 }}><Zap size={48} color={colors.primary.DEFAULT} /></View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Field Service platform</Text>
        </View>

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!loading}
          />
          {fieldErrors.name ? (
            <Text style={styles.fieldError}>{fieldErrors.name}</Text>
          ) : null}

          {/* Email */}
          <Text style={[styles.label, styles.mt]}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
          />
          {fieldErrors.email ? (
            <Text style={styles.fieldError}>{fieldErrors.email}</Text>
          ) : null}

          {/* Phone */}
          <Text style={[styles.label, styles.mt]}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!loading}
          />
          {fieldErrors.phone ? (
            <Text style={styles.fieldError}>{fieldErrors.phone}</Text>
          ) : null}

          {/* Password */}
          <Text style={[styles.label, styles.mt]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {fieldErrors.password ? (
            <Text style={styles.fieldError}>{fieldErrors.password}</Text>
          ) : null}

          {/* Role picker */}
          <Text style={[styles.label, styles.mt]}>Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.roleChip,
                  role === r.value && styles.roleChipActive,
                ]}
                onPress={() => setRole(r.value)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    role === r.value && styles.roleChipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Technician code (conditional) */}
          {role === 'technician' ? (
            <>
              <Text style={[styles.label, styles.mt]}>Technician Code</Text>
              <TextInput
                style={styles.input}
                placeholder="TCH-XXXX"
                placeholderTextColor={colors.textSecondary}
                value={technicianCode}
                onChangeText={setTechnicianCode}
                autoCapitalize="characters"
                editable={!loading}
              />
            </>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.btn,
              (loading || hasFieldErrors || isFormEmpty) && styles.btnDisabled,
            ]}
            onPress={handleSignup}
            disabled={loading || hasFieldErrors || isFormEmpty}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brand: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mt: {
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  fieldError: {
    color: '#fca5a5',
    fontSize: 12,
    marginTop: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    marginLeft: 8,
    padding: 8,
  },
  eyeText: {
    fontSize: 18,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  roleChipActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  roleChipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#a5b4fc',
  },
  btn: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  link: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: '600',
  },
});
