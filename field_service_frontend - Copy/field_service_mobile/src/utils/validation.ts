/* ────────────────────────────────────────────────────────────
 * Form validation utilities.
 *
 * Direct port from frontend_react/src/utils/validation.js
 * with TypeScript types added. Identical regex patterns and
 * error messages so behaviour is 1:1 with the web app.
 * ──────────────────────────────────────────────────────────── */

const NAME_REGEX = /^[A-Za-z ]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+91[-\s]?)?[6-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

const trimValue = (value: unknown): string => String(value ?? '').trim();

export const validateName = (value: unknown): string => {
  const v = trimValue(value);
  if (!v) return 'Name is required';
  if (v.length < 3) return 'Name must be at least 3 characters';
  if (!NAME_REGEX.test(v)) return 'Name must contain only alphabets and spaces';
  return '';
};

export const validateEmail = (value: unknown): string => {
  const v = trimValue(value);
  if (!v) return 'Email is required';
  if (!EMAIL_REGEX.test(v)) return 'Please enter a valid email address';
  return '';
};

export const validatePhone = (value: unknown): string => {
  const v = trimValue(value);
  if (!v) return 'Phone number is required';
  if (!PHONE_REGEX.test(v)) return 'Phone must be +91XXXXXXXXXX or 10-digit Indian mobile';
  return '';
};

export const validatePassword = (value: unknown): string => {
  const v = trimValue(value);
  if (!v) return 'Password is required';
  if (!PASSWORD_REGEX.test(v)) {
    return 'Password must have at least 6 chars, 1 uppercase, 1 lowercase, and 1 number';
  }
  return '';
};

export const validateLocation = (value: unknown): string => {
  const v = trimValue(value);
  if (!v) return 'Location is required';
  if (v.length < 3) return 'Location must be at least 3 characters';
  return '';
};

export const sanitizeText = (value: unknown): string => trimValue(value);
